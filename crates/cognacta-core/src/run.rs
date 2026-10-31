use std::{collections::HashMap, sync::Arc};

use crate::{Input, NodeId, NodeKey, RunError, SharedValue, State};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NodeStatus {
    Pending,
    Running,
    Completed,
    Skipped,
    Failed,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RunStatus {
    Running,
    Suspended,
    Completed,
    Failed,
}

#[derive(Debug)]
pub struct NodeRun {
    pub(crate) input: Option<Arc<Input>>,
    pub(crate) output: Option<SharedValue>,
    pub(crate) status: NodeStatus,
    pub(crate) attempts: u32,
}

impl NodeRun {
    pub(crate) fn pending() -> Self {
        Self {
            input: None,
            output: None,
            status: NodeStatus::Pending,
            attempts: 0,
        }
    }

    pub fn input(&self) -> Option<&Input> {
        self.input.as_deref()
    }

    pub fn status(&self) -> NodeStatus {
        self.status
    }

    pub fn output(&self) -> Option<&SharedValue> {
        self.output.as_ref()
    }

    pub fn attempts(&self) -> u32 {
        self.attempts
    }
}

#[derive(Debug)]
pub struct RunOutput {
    pub values: HashMap<NodeId, SharedValue>,
}

#[derive(Debug)]
pub struct Run<S: State> {
    pub(crate) state: Arc<S>,
    pub(crate) status: RunStatus,
    pub(crate) nodes: HashMap<NodeKey, NodeRun>,
    pub(crate) instances: HashMap<NodeId, Vec<NodeKey>>,
    pub(crate) errors: Vec<RunError>,
    pub(crate) final_output: Option<RunOutput>,
    pub(crate) waves: usize,
}

impl<S: State> Run<S> {
    pub fn state(&self) -> &S {
        &self.state
    }

    pub fn status(&self) -> RunStatus {
        self.status
    }

    pub fn node(&self, key: &NodeKey) -> Option<&NodeRun> {
        self.nodes.get(key)
    }

    pub fn instances(&self, template: &NodeId) -> &[NodeKey] {
        self.instances.get(template).map_or(&[], Vec::as_slice)
    }

    pub fn errors(&self) -> &[RunError] {
        &self.errors
    }

    pub fn final_output(&self) -> Option<&RunOutput> {
        self.final_output.as_ref()
    }

    pub fn waves(&self) -> usize {
        self.waves
    }
}
