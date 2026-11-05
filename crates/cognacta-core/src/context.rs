use bon::bon;
use std::{fmt, sync::Arc};

use crate::history::session::{CallHost, Gate};
use crate::{CallSite, ChildCall, EventLog, History, InMemoryEventLog, NodeKey};

/// Invocation identity and explicit resources, independent of graph State.
pub struct RunContext<R = ()> {
    pub(crate) run_id: String,
    pub(crate) parent_run_id: Option<String>,
    pub(crate) caller: Option<CallSite>,
    pub(crate) call_key: Option<String>,
    pub(crate) depth: usize,
    pub(crate) max_depth: usize,
    pub(crate) max_waves: Option<usize>,
    resources: Arc<R>,
    pub(crate) history: History,
    pub(crate) gate: Arc<Gate>,
    pub(crate) node_calls: Option<Arc<dyn CallHost>>,
}

impl<R> fmt::Debug for RunContext<R> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("RunContext")
            .field("depth", &self.depth)
            .finish_non_exhaustive()
    }
}

impl<R> Clone for RunContext<R> {
    fn clone(&self) -> Self {
        Self {
            run_id: self.run_id.clone(),
            parent_run_id: self.parent_run_id.clone(),
            caller: self.caller.clone(),
            call_key: self.call_key.clone(),
            depth: self.depth,
            max_depth: self.max_depth,
            max_waves: self.max_waves,
            resources: self.resources.clone(),
            history: self.history.clone(),
            gate: self.gate.clone(),
            node_calls: self.node_calls.clone(),
        }
    }
}

#[bon]
impl<R: Send + Sync + 'static> RunContext<R> {
    /// Creates a root with in-memory history. Zero depth permits only this root.
    #[builder(start_fn = root_builder, finish_fn = build,
        builder_type = RunContextRootBuilder, state_mod(vis = "pub"))]
    pub fn root(run_id: String, max_depth: usize, resources: Arc<R>) -> Self {
        Self {
            run_id,
            parent_run_id: None,
            caller: None,
            call_key: None,
            depth: 0,
            max_depth,
            max_waves: None,
            resources,
            history: History::new(Arc::new(InMemoryEventLog::new())),
            gate: Arc::new(Gate::default()),
            node_calls: None,
        }
    }

    /// Selects storage before execution. All descendants inherit this history.
    pub fn with_event_log<L: EventLog + 'static>(mut self, log: Arc<L>) -> Self {
        self.history = History::new(log);
        self
    }

    /// Keep this handle before moving the context into an execution future.
    pub fn history(&self) -> History {
        self.history.clone()
    }

    pub fn with_resources<T: Send + Sync + 'static>(&self, resources: Arc<T>) -> RunContext<T> {
        RunContext {
            run_id: self.run_id.clone(),
            parent_run_id: self.parent_run_id.clone(),
            caller: self.caller.clone(),
            call_key: self.call_key.clone(),
            depth: self.depth,
            max_depth: self.max_depth,
            max_waves: self.max_waves,
            resources,
            history: self.history.clone(),
            gate: self.gate.clone(),
            node_calls: self.node_calls.clone(),
        }
    }

    pub(crate) fn for_child(&self, call: &ChildCall) -> Self {
        Self {
            run_id: call.child_run_id.clone(),
            parent_run_id: Some(self.run_id.clone()),
            caller: Some(call.caller.clone()),
            call_key: None,
            depth: self.depth + 1,
            max_depth: self.max_depth,
            max_waves: self.max_waves,
            resources: self.resources.clone(),
            history: self.history.clone(),
            gate: self.gate.clone(),
            node_calls: None,
        }
    }

    pub fn run_id(&self) -> &str {
        &self.run_id
    }
    pub fn parent_run_id(&self) -> Option<&str> {
        self.parent_run_id.as_deref()
    }
    pub fn parent_node(&self) -> Option<&NodeKey> {
        self.caller.as_ref().map(|caller| &caller.node.key)
    }
    pub fn depth(&self) -> usize {
        self.depth
    }
    pub fn max_depth(&self) -> usize {
        self.max_depth
    }
    pub fn resources(&self) -> &Arc<R> {
        &self.resources
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn resources_preserve_identity_and_default_history_is_available_before_execution() {
        let root = RunContext::root("root".into(), 3, Arc::new(()));
        let changed = root.with_resources(Arc::new(7));
        assert_eq!(changed.run_id(), "root");
        assert_eq!((changed.depth(), changed.max_depth()), (0, 3));
        assert_eq!(**changed.resources(), 7);
        assert!(root.history().all_events().await.unwrap().is_empty());
    }
}
