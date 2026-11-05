mod execution;
mod local;
pub(crate) mod observation;

use crate::{
    CallError, ChildCall, Error, EventData, Failure, FailureCause, Graph, GraphInput, History,
    HistoryError, HistoryViolation, InputError, NodeKey, Run, RunContext, RunStatus, State,
    TerminalFailure,
    history::{
        projection::{Fact, Projection},
        session::Session,
    },
};
use bon::bon;
use execution::RunExecution;
pub use local::{
    LocalScheduler, SchedulerConfig, SchedulerConfigBuilder, scheduler_config_builder,
};
use observation::Observation;
use std::{future::Future, pin::Pin, sync::Arc, time::SystemTime};
use tracing::Instrument;
type ExecutionFuture<'a, T> = Pin<Box<dyn Future<Output = Result<T, Error>> + Send + 'a>>;

/// Drives task admission and completion for any graph, including nested graph instances.
pub trait Scheduler: Send + Sync + 'static {
    fn config(&self) -> SchedulerConfig;
    /// Drive until `advance` returns `None`, with a separate concurrency pool for each Run.
    /// Before returning, reap every submitted task and register its result, including when
    /// the driver fails. Task panics are reported as `NodeError::Task`; driver failures use
    /// `Error::scheduling`. Dropping this future must cancel its outstanding tasks.
    fn drive<'a>(
        self: Arc<Self>,
        execution: &'a mut (dyn Execution + 'a),
    ) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'a>>;
}

/// Restricted runtime operations. Typed state and outcomes remain owned by the runtime.
pub trait Execution: Send {
    /// Settle the previous wave and return the next fixed ready set, or the end of work.
    /// Call initially, then only after reporting every member of the previous ready set.
    /// Settlement follows ready order, independently of admission and completion order.
    fn advance(&mut self) -> ExecutionFuture<'_, Option<Vec<NodeKey>>>;
    /// Submit a member only after admitting it to this Run's concurrency pool.
    /// Each key must belong to the current ready set and may be dispatched only once.
    /// The owned future executes the node; it does not merge State or apply routing.
    /// It carries the current tracing span and subscriber across executor threads.
    fn dispatch(&mut self, key: &NodeKey) -> Result<ExecutionFuture<'static, ()>, Error>;
    /// Report each dispatched task exactly once, after reaping it and releasing its context.
    /// Pass the task result unchanged. A node failure is a normal report and returns `Ok`;
    /// invalid operation ordering returns `Error::Scheduling` from these three methods.
    /// Recording failures return `Error::EventLog` and stop further admission.
    fn complete(&mut self, key: NodeKey, result: Result<(), Error>) -> ExecutionFuture<'_, ()>;
}

#[bon]
impl dyn Scheduler {
    /// Executes a new root through the same event projection used by replay and resume.
    #[builder(start_fn = run_builder, finish_fn = call, builder_type = SchedulerRunBuilder, state_mod(vis = "pub"))]
    pub fn run<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        input: impl Into<Arc<GraphInput>> + Send + 'a,
        mut context: RunContext<R>,
    ) -> ExecutionFuture<'a, Run<S, O>>
    where
        S: State,
        O: serde::de::DeserializeOwned + Send + Sync + 'static,
        R: Send + Sync + 'static,
    {
        Box::pin(async move {
            context.gate.check()?;
            if !context
                .history
                .events(context.run_id(), 0)
                .await?
                .is_empty()
            {
                return Err(HistoryError::Invalid {
                    seq: 1,
                    reason: HistoryViolation::Identity,
                }
                .into());
            }
            context.max_waves = Some(self.config().max_waves());
            let projection = Projection::new(
                graph,
                context.run_id().into(),
                context.parent_run_id().map(str::to_owned),
            );
            self.execute(graph, input.into(), context, projection).await
        })
    }

    /// Continues a nonterminal root, retaining its recorded identity, inputs and budgets.
    #[builder(start_fn = resume_builder, finish_fn = call, builder_type = SchedulerResumeBuilder, state_mod(vis = "pub"))]
    pub fn resume<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        run_id: &'a str,
        history: History,
        resources: Arc<R>,
    ) -> ExecutionFuture<'a, Run<S, O>>
    where
        S: State,
        O: serde::de::DeserializeOwned + Send + Sync + 'static,
        R: Send + Sync + 'static,
    {
        Box::pin(async move {
            let events = history.events(run_id, 0).await?;
            let projection = crate::replay(graph, &events)?.projection;
            if projection.run_id != run_id {
                return Err(HistoryError::Invalid {
                    seq: 1,
                    reason: HistoryViolation::Identity,
                }
                .into());
            }
            if projection.parent_run_id.is_some() {
                return Err(HistoryError::NotRoot {
                    run_id: run_id.into(),
                }
                .into());
            }
            if projection.terminal() {
                return Err(HistoryError::TerminalRun {
                    run_id: run_id.into(),
                }
                .into());
            }
            let mut context = RunContext::root(run_id.into(), projection.max_depth, resources);
            context.max_waves = Some(projection.max_waves);
            context.history = history;
            let input = projection.input.as_ref().expect("started").clone();
            self.execute(graph, input, context, projection).await
        })
    }

    pub(crate) fn child<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        input: Arc<GraphInput>,
        context: RunContext<R>,
        call: ChildCall,
    ) -> ExecutionFuture<'a, Run<S, O>>
    where
        S: State,
        O: serde::de::DeserializeOwned + Send + Sync + 'static,
        R: Send + Sync + 'static,
    {
        Box::pin(async move {
            context.gate.check()?;
            let events = context
                .history
                .events(context.run_id(), 0)
                .await
                .map_err(|error| context.gate.fail(error))?;
            let projection = if events.is_empty() {
                Projection::new(
                    graph,
                    context.run_id().into(),
                    context.parent_run_id().map(str::to_owned),
                )
            } else {
                let projection = crate::replay(graph, &events)
                    .map_err(|error| context.gate.fail(error))?
                    .projection;
                let input_matches = matches!(events[0].data(), EventData::RunStarted { input, .. } if input == &call.input);
                if projection.run_id != call.child_run_id
                    || projection.parent_run_id.as_deref() != context.parent_run_id()
                    || projection.caller.as_ref() != Some(&call.caller)
                    || projection.depth != context.depth()
                    || projection.max_depth != context.max_depth()
                    || Some(projection.max_waves) != context.max_waves
                    || !input_matches
                {
                    return Err(context.gate.fail(
                        HistoryError::CallLinkMismatch {
                            child_run_id: call.child_run_id,
                        }
                        .into(),
                    ));
                }
                projection
            };
            if projection.terminal() {
                return match projection.run {
                    Some(run) => Ok(run),
                    None => Err(startup_error(projection.failures())),
                };
            }
            self.execute(graph, input, context, projection).await
        })
    }

    fn execute<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        input: Arc<GraphInput>,
        context: RunContext<R>,
        projection: Projection<S, O>,
    ) -> ExecutionFuture<'a, Run<S, O>>
    where
        S: State,
        O: serde::de::DeserializeOwned + Send + Sync + 'static,
        R: Send + Sync + 'static,
    {
        Box::pin(async move {
            let mut observation = Observation::new(&context);
            let span = observation.span.clone();
            let session = Session::new(projection, context.history.clone(), context.gate.clone());
            let result = async {
                if session.projection.lock().await.last_seq == 0 {
                    let ts = SystemTime::now();
                    session
                        .commit(
                            Fact::Started {
                                format: 2,
                                input: input.clone(),
                                caller: context.caller.clone(),
                                depth: context.depth(),
                                max_depth: context.max_depth(),
                                max_waves: context.max_waves.expect("run budget"),
                            },
                            None,
                            ts,
                        )
                        .await?;
                }
                if session.projection.lock().await.run.is_none() {
                    let mut missing = graph
                        .entries
                        .iter()
                        .filter(|id| !input.entries.contains_key(*id))
                        .cloned()
                        .collect::<Vec<_>>();
                    let mut unexpected = input
                        .entries
                        .keys()
                        .filter(|id| !graph.entries.contains(*id))
                        .cloned()
                        .collect::<Vec<_>>();
                    if !missing.is_empty() || !unexpected.is_empty() {
                        missing.sort();
                        unexpected.sort();
                        session
                            .commit(
                                Fact::Failed(Some(TerminalFailure::Input {
                                    missing: missing.clone(),
                                    unexpected: unexpected.clone(),
                                })),
                                None,
                                SystemTime::now(),
                            )
                            .await?;
                        observation.finish("input", Some("input"));
                        return Err(CallError::Input {
                            source: Box::new(InputError::EntrySetMismatch {
                                missing,
                                unexpected,
                            }),
                        }
                        .into());
                    }
                    let state = match (graph.initializer)(input, context.clone()).await {
                        Ok(state) => state,
                        Err(error @ (Error::EventLog(_) | Error::History(_))) => {
                            return Err(context.gate.fail(error));
                        }
                        Err(source) => {
                            session
                                .commit(
                                    Fact::Failed(Some(TerminalFailure::Initialization)),
                                    None,
                                    SystemTime::now(),
                                )
                                .await?;
                            observation.finish("initialization", Some("initialization"));
                            return Err(CallError::Initialization {
                                source: Box::new(source),
                            }
                            .into());
                        }
                    };
                    session
                        .commit(Fact::Initialized(state), None, SystemTime::now())
                        .await?;
                }
                let mut execution = RunExecution::new(graph, context, self.clone(), session);
                let driven = self.drive(&mut execution).await;
                let run = execution.finish(driven).await?;
                let failure = (run.status() != RunStatus::Completed).then_some(
                    if matches!(
                        run.failures(),
                        [Failure {
                            cause: FailureCause::Terminal(TerminalFailure::MissingOutput { .. }),
                            ..
                        }]
                    ) {
                        "missing_output"
                    } else {
                        "execution"
                    },
                );
                observation.finish("execution", failure);
                Ok(run)
            }
            .instrument(span)
            .await;
            if matches!(&result, Err(Error::EventLog(_) | Error::History(_))) {
                observation.finish("recording", Some("event_log"));
            }
            result
        })
    }
}

#[derive(Debug, thiserror::Error)]
#[error("recorded initialization failure")]
struct InitializationFailure;

fn startup_error(failures: &[Failure]) -> Error {
    match failures.first().map(|failure| &failure.cause) {
        Some(FailureCause::Terminal(TerminalFailure::Input {
            missing,
            unexpected,
        })) => CallError::Input {
            source: Box::new(InputError::EntrySetMismatch {
                missing: missing.clone(),
                unexpected: unexpected.clone(),
            }),
        }
        .into(),
        _ => CallError::Initialization {
            source: Box::new(InitializationFailure),
        }
        .into(),
    }
}
#[cfg(test)]
#[path = "../contract_tests.rs"]
mod contract_tests;
#[cfg(test)]
#[path = "../kernel_tests.rs"]
mod kernel_tests;
#[cfg(test)]
mod recording_tests;
#[cfg(test)]
mod tests;
