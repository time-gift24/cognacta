//! In-memory graph execution with typed state updates and deterministic wave settlement.
//!
//! ```
//! use std::sync::Arc;
//! use cognacta_core::{
//!     Edge, Error, Graph, Input, Node, NodeContext, NodeId, NodeInstance, Outcome,
//!     RunStatus, Scheduler, SchedulerConfig, SharedValue, State,
//! };
//!
//! #[derive(State)]
//! struct LengthState {
//!     #[reducer(cognacta_core::Override)]
//!     length: u32,
//! }
//!
//! struct Count;
//! impl NodeInstance<LengthState> for Count {
//!     type Output = u32;
//!     async fn run(
//!         &self,
//!         input: &Input,
//!         _ctx: NodeContext<LengthState>,
//!     ) -> Result<Outcome<LengthState, u32>, Error> {
//!         let length = input.entry::<String>()?.len() as u32;
//!         Ok(Outcome {
//!             value: Some(length),
//!             state_delta: LengthStateDelta { length: Some(length) },
//!             directive: None,
//!         })
//!     }
//! }
//!
//! struct Render;
//! impl NodeInstance<LengthState> for Render {
//!     type Output = String;
//!     async fn run(
//!         &self,
//!         input: &Input,
//!         _ctx: NodeContext<LengthState>,
//!     ) -> Result<Outcome<LengthState, String>, Error> {
//!         let length = input.one::<u32>(&NodeId::new("count"))?;
//!         Ok(Outcome {
//!             value: Some(format!("len={length}")),
//!             state_delta: LengthStateDelta::default(),
//!             directive: None,
//!         })
//!     }
//! }
//!
//! # #[tokio::main(flavor = "current_thread")]
//! # async fn main() {
//! let count = NodeId::new("count");
//! let render = NodeId::new("render");
//! let graph = Graph::builder()
//!     .nodes(vec![
//!         Node::new(count.clone(), Count).writes(vec![LengthStateField::Length]),
//!         Node::new(render.clone(), Render).terminal(true),
//!     ])
//!     .edges(vec![Edge { source: count.clone(), target: render.clone(), when: None }])
//!     .entries(vec![count])
//!     .build()
//!     .unwrap();
//! let scheduler = Scheduler::new(SchedulerConfig::new(2, 2).unwrap());
//! let run = scheduler.run_builder()
//!     .graph(&graph)
//!     .run_id("length-doc".into())
//!     .initial_state(LengthState { length: 0 })
//!     .entry_values(vec![Arc::new(String::from("hello")) as SharedValue])
//!     .call()
//!     .await;
//! assert_eq!(run.status(), RunStatus::Completed);
//! assert_eq!(run.state().length, 5);
//! # }
//! ```

extern crate self as cognacta_core;

mod error;
mod graph;
mod input;
mod run;
mod scheduler;
mod state;

pub use cognacta_derive::State;
pub use error::{
    ConfigError, DirectiveError, Error, GraphError, InputError, MergeError, NodeError, RunError,
};
pub use graph::{
    DirectiveTarget, Edge, Graph, GraphBuilder, Join, Node, NodeContext, Outcome, graph_builder,
};
pub use input::{Input, Origin, SharedValue, SourceRef};
pub use run::{NodeRun, NodeStatus, Run, RunOutput, RunStatus};
pub use scheduler::{
    Scheduler, SchedulerConfig, SchedulerConfigBuilder, SchedulerRunBuilder,
    scheduler_config_builder, scheduler_run_builder,
};
pub use state::{Add, Append, Merge, Override, Reducer, Sort, State, StateField, WritePolicy};

use std::future::Future;

#[derive(Clone, Debug, Eq, Hash, PartialEq, Ord, PartialOrd)]
pub struct NodeId(String);

impl NodeId {
    pub fn new(value: impl Into<String>) -> Self {
        Self(value.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Clone, Debug, Eq, Hash, PartialEq, Ord, PartialOrd)]
pub enum NodeKey {
    Static(NodeId),
    Instance { template: NodeId, key: String },
}

#[derive(Clone, Debug)]
pub enum Directive {
    Transition {
        target: NodeId,
        payload: Option<SharedValue>,
        immediate: bool,
    },
    Deliver(Vec<DeliverTarget>),
}

#[derive(Clone, Debug)]
pub struct DeliverTarget {
    pub template: NodeId,
    pub payload: SharedValue,
    pub key: String,
}

pub trait NodeInstance<S: State>: Send + Sync + 'static {
    type Output: Send + Sync + 'static;

    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S>,
    ) -> impl Future<Output = Result<Outcome<S, Self::Output>, Error>> + Send + 'a;
}
