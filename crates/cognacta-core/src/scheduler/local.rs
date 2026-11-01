use super::{execution::Execution, observation::Observation};
use crate::{
    CallError, ConfigError, Error, Graph, GraphInput, InputError, Run, RunContext, RunStatus, State,
};
use bon::bon;
use std::{num::NonZeroUsize, sync::Arc};
use tracing::Instrument;
#[derive(Clone, Copy, Debug)]
pub struct SchedulerConfig {
    pub(super) max_concurrency: NonZeroUsize,
    pub(super) max_waves: usize,
}

#[bon]
impl SchedulerConfig {
    #[builder(
        start_fn = builder,
        finish_fn = build,
        builder_type = SchedulerConfigBuilder,
        state_mod(vis = "pub")
    )]
    pub fn new(max_concurrency: usize, max_waves: usize) -> Result<Self, Error> {
        let max_concurrency =
            NonZeroUsize::new(max_concurrency).ok_or(ConfigError::ZeroConcurrency)?;
        Ok(Self {
            max_concurrency,
            max_waves,
        })
    }

    pub fn max_concurrency(&self) -> NonZeroUsize {
        self.max_concurrency
    }

    pub fn max_waves(&self) -> usize {
        self.max_waves
    }
}

/// Local execution with independent concurrency slots for each invocation.
pub struct LocalScheduler {
    config: SchedulerConfig,
}

#[bon]
impl LocalScheduler {
    pub fn new(config: SchedulerConfig) -> Self {
        Self { config }
    }

    /// Executes validation, initialization and all waves before returning diagnostics.
    /// Startup errors return `Error::Call`; execution errors remain in the returned Run.
    /// Observations use the host subscriber and never include business data or error sources.
    #[builder(start_fn = run_builder, finish_fn = call, builder_type = SchedulerRunBuilder, state_mod(vis = "pub"))]
    pub async fn run<S, O, R>(
        &self,
        graph: &Graph<S, O, R>,
        input: GraphInput,
        context: RunContext<R>,
    ) -> Result<Run<S, O>, Error>
    where
        S: State,
        O: Send + Sync + 'static,
        R: Send + Sync + 'static,
    {
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
            let input = Arc::new(input);
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
            let run = Execution::new(graph, input, context, self.config, state)
                .execute()
                .await;
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
    }
}
