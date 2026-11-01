mod execution;
mod local;
mod observation;
use crate::{Error, Graph, GraphInput, NodeKey, RunContext, State};
pub use local::{
    LocalScheduler, SchedulerConfig, SchedulerConfigBuilder, SchedulerRunBuilder,
    scheduler_config_builder, scheduler_run_builder,
};
use std::{future::Future, sync::Arc};

/// Result-oriented invocation boundary, independent of local graph State or Run.
/// Implementations derive a child identity and preserve depth, sources and safe observations.
pub trait Scheduler<T: Sync, O: Send + Sync + 'static, R: Send + Sync + 'static = ()>:
    Send + Sync
{
    fn call<'a>(
        &'a self,
        target: &'a T,
        input: GraphInput,
        parent: &'a RunContext<R>,
        parent_node: &'a NodeKey,
    ) -> impl Future<Output = Result<Arc<O>, Error>> + Send + 'a;
}

impl<S: State, O: Send + Sync + 'static, R: Send + Sync + 'static> Scheduler<Graph<S, O, R>, O, R>
    for LocalScheduler
{
    async fn call(
        &self,
        target: &Graph<S, O, R>,
        input: GraphInput,
        parent: &RunContext<R>,
        parent_node: &NodeKey,
    ) -> Result<Arc<O>, Error> {
        let child = parent
            .child(parent_node)
            .inspect_err(|_| observation::depth_rejected(parent, parent_node))?;
        self.run(target, input, child).await?.into_result()
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
