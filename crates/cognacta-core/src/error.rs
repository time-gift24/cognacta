use std::{error::Error as StdError, fmt};

use crate::{EventLogError, HistoryError, NodeId, NodeKey};

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("call error: {0}")]
    Call(#[from] CallError),
    #[error("graph error: {0}")]
    Graph(#[from] GraphError),
    #[error("configuration error: {0}")]
    Config(#[from] ConfigError),
    #[error("input error: {0}")]
    Input(#[from] InputError),
    #[error("node error: {0}")]
    Node(#[from] NodeError),
    #[error("merge error: {0}")]
    Merge(#[from] MergeError),
    #[error("event log error: {0}")]
    EventLog(#[from] EventLogError),
    #[error("history error: {0}")]
    History(#[from] HistoryError),
    #[error("scheduler failed")]
    Scheduling {
        #[source]
        source: Box<dyn StdError + Send + Sync + 'static>,
    },
}

impl Error {
    pub fn execution<E>(source: E) -> Self
    where
        E: StdError + Send + Sync + 'static,
    {
        Self::Node(NodeError::Execution(Box::new(source)))
    }

    pub fn scheduling<E: StdError + Send + Sync + 'static>(source: E) -> Self {
        Self::Scheduling {
            source: Box::new(source),
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum GraphError {
    #[error("unknown return node {node}")]
    UnknownReturnNode { node: NodeId },
    #[error("invalid return node {node}")]
    InvalidReturnNode { node: NodeId },
    #[error("return type mismatch at {node}: expected {expected_type}, got {actual_type}")]
    ReturnTypeMismatch {
        node: NodeId,
        expected_type: &'static str,
        actual_type: &'static str,
    },
    #[error("duplicate node {node}")]
    DuplicateNode { node: NodeId },
    #[error("unknown edge endpoint {node}")]
    UnknownEdgeEndpoint { node: NodeId },
    #[error("unknown entry {node}")]
    UnknownEntry { node: NodeId },
    #[error("no legal entry")]
    NoEntry,
    #[error("invalid template role for {node}")]
    InvalidTemplateRole { node: NodeId },
    #[error("invalid declared target {target} for writer {writer}")]
    InvalidDeclaredTarget { writer: NodeId, target: NodeId },
    #[error("concurrent single-writer field {field}: {writers:?}")]
    ConcurrentSingleWriter {
        field: &'static str,
        writers: Vec<NodeId>,
    },
}

#[derive(Debug, thiserror::Error)]
pub enum ConfigError {
    #[error("max concurrency must be greater than zero")]
    ZeroConcurrency,
}

#[derive(Debug, thiserror::Error)]
pub enum InputError {
    #[error("graph entry set mismatch")]
    EntrySetMismatch {
        missing: Vec<NodeId>,
        unexpected: Vec<NodeId>,
    },
    #[error("missing entry {node}")]
    MissingEntry { node: NodeId },
    #[error("missing input source {source_node}")]
    MissingSource { source_node: NodeId },
    #[error("{operation} expected one value from {source_node:?}, got {actual}")]
    Cardinality {
        operation: &'static str,
        source_node: Option<NodeId>,
        actual: usize,
    },
    #[error("input value cannot be decoded")]
    Decode {
        #[source]
        source: serde_json::Error,
    },
}

#[derive(Debug, thiserror::Error)]
pub enum NodeError {
    #[error("node instance is not bound")]
    UnboundInstance,
    #[error("node instance is no longer available")]
    DroppedInstance,
    #[error("node execution failed")]
    Execution(#[source] Box<dyn StdError + Send + Sync + 'static>),
    #[error("node task failed")]
    Task(#[source] Box<dyn StdError + Send + Sync + 'static>),
}

#[derive(Debug, thiserror::Error)]
pub enum MergeError {
    #[error("single-writer conflicts: {fields:?}")]
    SingleWriterConflicts { fields: Vec<&'static str> },
    #[error("integer overflow in field {field:?}")]
    Overflow { field: Option<&'static str> },
    #[error("reducer failed in field {field:?}")]
    Reduce {
        field: Option<&'static str>,
        #[source]
        source: Box<dyn StdError + Send + Sync + 'static>,
    },
    #[error("reducer finish failed in field {field:?}")]
    Finish {
        field: Option<&'static str>,
        #[source]
        source: Box<dyn StdError + Send + Sync + 'static>,
    },
}

#[derive(Debug, thiserror::Error)]
pub enum DirectiveError {
    #[error("unknown directive target {target}")]
    UnknownTarget { target: NodeId },
    #[error("wrong directive target kind {target}")]
    WrongTargetKind { target: NodeId },
    #[error("duplicate instance key {key} for {template}")]
    DuplicateInstanceKey { template: NodeId, key: String },
}

#[derive(Debug, thiserror::Error)]
pub enum RunError {
    #[error("scheduler failed during execution")]
    Scheduling {
        #[source]
        source: Error,
    },
    #[error("graph return value missing at {node}")]
    MissingOutput { node: NodeId },
    #[error("node {key} failed")]
    Node {
        key: NodeKey,
        #[source]
        source: Error,
    },
    #[error("state merge failed")]
    Merge(#[source] Error),
    #[error("invalid directive from {writer}")]
    InvalidDirective {
        writer: NodeKey,
        #[source]
        source: DirectiveError,
    },
    #[error("run stalled")]
    Stalled,
    #[error("maximum waves exceeded")]
    MaxWaves,
    #[error("scheduler invariant violated: {0}")]
    Invariant(&'static str),
}

impl fmt::Display for NodeId {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(self.as_str())
    }
}

impl fmt::Display for NodeKey {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Static(node) => node.fmt(formatter),
            Self::Instance { template, key } => write!(formatter, "{template}[{key}]"),
        }
    }
}

/// Stable invocation failures; sources remain diagnostic, never automatic retry advice.
#[derive(Debug, thiserror::Error)]
pub enum CallError {
    #[error("invalid graph input")]
    Input {
        #[source]
        source: Box<dyn StdError + Send + Sync + 'static>,
    },
    #[error("maximum run depth exceeded")]
    DepthExceeded {
        parent_depth: usize,
        max_depth: usize,
    },
    #[error("state initialization failed")]
    Initialization {
        #[source]
        source: Box<dyn StdError + Send + Sync + 'static>,
    },
    #[error("execution failed")]
    Execution {
        #[source]
        source: Box<dyn StdError + Send + Sync + 'static>,
    },
    #[error("graph return value missing")]
    MissingOutput,
}
