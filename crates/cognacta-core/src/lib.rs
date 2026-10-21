//! Shared LLM boundaries and typed, Outcome-routed cluster execution.

pub fn version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
mod error;
mod generation;
mod model;
mod observation;
mod scheduler;
mod scheduler_observation;

#[cfg(test)]
mod scheduler_observation_tests;
#[cfg(test)]
mod scheduler_tests;

pub use error::{Error, ErrorKind, PartialGeneration, PartialPart};
pub use generation::{
    AssistantMessage, Finish, FinishReason, GenerationEvent, GenerationMetadata, GenerationOptions,
    GenerationRequest, GenerationResponse, InputPart, Message, OutputPart, PartDelta, PartId,
    PartKind, Usage,
};
pub use model::{EventStream, Model, Protocol, Provider};
pub use scheduler::{
    Cluster, ClusterStartBuilder, Control, Node, NodeBuilder, NodeContext, NodeId, NodeInstance,
    Outcome, Run, RunStatus, Scheduler, State, cluster_start_builder, node_builder,
};
