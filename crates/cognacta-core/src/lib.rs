//! Typed graph execution with independent per-run state, resources and depth budgets.
//!
//! A graph is a reusable definition. Each invocation validates explicit entries, initializes
//! independent State and returns a typed result only after every wave settles. Resources are
//! explicit Arc handles. A Graph implements NodeInstance and can be declared with Node::new.
//! Recursive definitions use ordinary Arc/Weak/OnceLock bindings, resolved only at execution.
//!
//! ```
//! use std::sync::Arc;
//! use cognacta_core::*;
//! #[derive(serde::Serialize, Default, State, serde::Deserialize)]
//! struct Data { #[reducer(Override)] count: usize }
//! struct Count;
//! impl NodeInstance<Data> for Count {
//!     type Output = usize;
//!     async fn run(&self, input: &Input, _: NodeContext<Data>, _scheduler: Arc<dyn Scheduler>) -> Result<Outcome<Data, usize>, Error> {
//!         let count = (serde_json::from_value::<String>(input.entry()?.clone()).map_err(|source| cognacta_core::InputError::Decode { source })?).len();
//!         Ok(Outcome { value: Some(Arc::new(count)), state_delta: DataDelta { count: Some(count) }, directive: None })
//!     }
//! }
//! # #[tokio::main(flavor = "current_thread")]
//! # async fn main() -> Result<(), Error> {
//! let graph = graph! {
//!     state: Data,
//!     output: usize,
//!     nodes { count: Count, }
//!     return count;
//! }?;
//! let input = graph_input! { count: JsonValue::String("hello".to_owned()), };
//! let log = Arc::new(InMemoryEventLog::new());
//! let context = RunContext::root("root".into(), 4, Arc::new(())).with_event_log(log.clone());
//! let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
//! let run = scheduler.run(&graph, input, context).await?;
//! assert_eq!(run.state().count, 5);
//! assert_eq!(*run.into_result()?, 5);
//! assert_eq!(log.events("root", 0).await?.last().unwrap().kind(), "run_completed");
//! # Ok(())
//! # }
//! ```

extern crate self as cognacta_core;

mod context;
mod error;
mod event_log;
mod graph;
mod history;
mod input;
mod run;
mod scheduler;
mod state;

pub use cognacta_derive::{State, graph, graph_input};
pub use context::{RunContext, RunContextRootBuilder, run_context_root_builder};
pub use error::{
    CallError, ConfigError, DirectiveError, Error, GraphError, InputError, MergeError, NodeError,
    RunError,
};
pub use event_log::{
    CallSite, ChildCall, ControlFailureKind, Event, EventBuilder, EventData, EventLog,
    EventLogError, Failure, FailureCause, FailureKind, FaultKind, HistoryError, HistoryViolation,
    InMemoryEventLog, MergeFailureKind, NodeAttempt, RecordedOutcome, TerminalFailure, WaveStage,
    event_builder, new_run_id,
};
pub use graph::{
    DirectiveTarget, Edge, Graph, GraphBuilder, GraphWithInitializerBuilder, Join, Node,
    NodeCallBuilder, NodeContext, Outcome, graph_builder, graph_with_initializer_builder,
    node_call_builder,
};
pub use history::{History, ReplayedRun, replay};
pub use input::{GraphInput, Input, InputEntry, Origin, SharedValue};
pub use run::{NodeRun, NodeStatus, Run, RunStatus};
pub use scheduler::{
    Execution, LocalScheduler, Scheduler, SchedulerConfig, SchedulerConfigBuilder,
    SchedulerResumeBuilder, SchedulerRunBuilder, scheduler_config_builder,
    scheduler_resume_builder, scheduler_run_builder,
};
pub use serde_json::Value as JsonValue;
pub use state::{Add, Append, Merge, Override, Reducer, Sort, State, StateField, WritePolicy};

use std::{
    future::Future,
    sync::{Arc, OnceLock, Weak},
};

#[derive(
    Clone, Debug, Eq, Hash, PartialEq, Ord, PartialOrd, serde::Serialize, serde::Deserialize,
)]
pub struct NodeId(String);

impl NodeId {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(
    Clone, Debug, Eq, Hash, PartialEq, Ord, PartialOrd, serde::Serialize, serde::Deserialize,
)]
pub enum NodeKey {
    Static(NodeId),
    Instance { template: NodeId, key: String },
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum Directive {
    Transition {
        target: NodeId,
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            deserialize_with = "crate::__private::deserialize_present"
        )]
        payload: Option<SharedValue>,
        immediate: bool,
    },
    Deliver(Vec<DeliverTarget>),
}

#[derive(Clone, Debug, Eq, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct DeliverTarget {
    pub template: NodeId,
    pub payload: SharedValue,
    pub key: String,
}

#[doc(hidden)]
pub mod __private {
    use serde::{Deserialize, Deserializer};

    pub fn deserialize_present<'de, D, T>(deserializer: D) -> Result<Option<T>, D::Error>
    where
        D: Deserializer<'de>,
        T: Deserialize<'de>,
    {
        T::deserialize(deserializer).map(Some)
    }
}

/// Reusable execution body of a Node. Graphs implement the same contract as leaf bodies.
/// The runtime supplies the selected scheduler for this invocation; leaf bodies can ignore it.
pub trait NodeInstance<S: State, R: Send + Sync + 'static = ()>: Send + Sync + 'static {
    type Output: serde::Serialize + Send + Sync + 'static;

    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> impl Future<Output = Result<Outcome<S, Self::Output>, Error>> + Send + 'a;
}

impl<S: State, R: Send + Sync + 'static, N: NodeInstance<S, R>> NodeInstance<S, R> for Arc<N> {
    type Output = N::Output;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<S, Self::Output>, Error> {
        self.as_ref().run(input, ctx, scheduler).await
    }
}

impl<S: State, R: Send + Sync + 'static, N: NodeInstance<S, R>> NodeInstance<S, R> for Weak<N> {
    type Output = N::Output;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<S, Self::Output>, Error> {
        self.upgrade()
            .ok_or(NodeError::DroppedInstance)?
            .run(input, ctx, scheduler)
            .await
    }
}

impl<S: State, R: Send + Sync + 'static, N: NodeInstance<S, R>> NodeInstance<S, R> for OnceLock<N> {
    type Output = N::Output;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<S, Self::Output>, Error> {
        self.get()
            .ok_or(NodeError::UnboundInstance)?
            .run(input, ctx, scheduler)
            .await
    }
}

#[cfg(test)]
mod subgraph_tests;

#[cfg(test)]
mod observation_tests;
