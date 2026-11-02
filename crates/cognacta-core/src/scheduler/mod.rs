mod execution;
mod local;
pub(crate) mod observation;

use crate::{
    CallError, Error, Graph, GraphInput, InputError, NodeKey, Run, RunContext, RunStatus, State,
};
use bon::bon;
use execution::RunExecution;
pub use local::{
    LocalScheduler, SchedulerConfig, SchedulerConfigBuilder, scheduler_config_builder,
};
use observation::Observation;
use std::{future::Future, pin::Pin, sync::Arc};
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
    fn advance(&mut self) -> Result<Option<Vec<NodeKey>>, Error>;
    /// Submit a member only after admitting it to this Run's concurrency pool.
    /// Each key must belong to the current ready set and may be dispatched only once.
    /// The owned future executes the node; it does not merge State or apply routing.
    /// It carries the current tracing span and subscriber across executor threads.
    fn dispatch(&mut self, key: &NodeKey) -> Result<ExecutionFuture<'static, ()>, Error>;
    /// Report each dispatched task exactly once, after reaping it and releasing its context.
    /// Pass the task result unchanged. A node failure is a normal report and returns `Ok`;
    /// invalid operation ordering returns `Error::Scheduling` from these three methods.
    fn complete(&mut self, key: NodeKey, result: Result<(), Error>) -> Result<(), Error>;
}

#[bon]
impl dyn Scheduler {
    /// Initialize a typed Run and delegate all task scheduling to this scheduler.
    /// Startup errors return `Error::Call`; execution failures remain in the returned Run.
    #[builder(start_fn = run_builder, finish_fn = call, builder_type = SchedulerRunBuilder, state_mod(vis = "pub"))]
    pub fn run<'a, S, O, R>(
        self: Arc<Self>,
        graph: &'a Graph<S, O, R>,
        input: impl Into<Arc<GraphInput>> + Send + 'a,
        context: RunContext<R>,
    ) -> ExecutionFuture<'a, Run<S, O>>
    where
        S: State,
        O: Send + Sync + 'static,
        R: Send + Sync + 'static,
    {
        Box::pin(async move {
            let input = input.into();
            let mut observation = Observation::new(&context);
            let span = observation.span.clone();
            async move {
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
                    observation.finish("input", Some("input"));
                    return Err(CallError::Input {
                        source: Box::new(InputError::EntrySetMismatch {
                            missing,
                            unexpected,
                        }),
                    }
                    .into());
                }
                let state = match (graph.initializer)(input.clone(), context.clone()).await {
                    Ok(state) => state,
                    Err(source) => {
                        observation.finish("initialization", Some("initialization"));
                        return Err(CallError::Initialization {
                            source: Box::new(source),
                        }
                        .into());
                    }
                };
                let mut execution = RunExecution::new(graph, input, context, self.clone(), state);
                let driven = self.drive(&mut execution).await;
                let run = execution.finish(driven);
                let failure = (run.status() != RunStatus::Completed).then_some(
                    if matches!(run.errors(), [crate::RunError::MissingOutput { .. }]) {
                        "missing_output"
                    } else {
                        "execution"
                    },
                );
                observation.finish("execution", failure);
                Ok(run)
            }
            .instrument(span)
            .await
        })
    }
}

#[cfg(test)]
#[path = "../contract_tests.rs"]
mod contract_tests;
#[cfg(test)]
#[path = "../kernel_tests.rs"]
mod kernel_tests;
#[cfg(test)]
mod tests;
