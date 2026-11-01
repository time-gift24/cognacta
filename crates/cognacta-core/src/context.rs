use std::sync::Arc;

use bon::bon;

use crate::{CallError, Error, NodeKey};

/// Invocation identity and explicit resources, independent of graph State.
#[derive(Debug)]
pub struct RunContext<R = ()> {
    run_id: String,
    parent_run_id: Option<String>,
    parent_node: Option<NodeKey>,
    depth: usize,
    max_depth: usize,
    resources: Arc<R>,
}

impl<R> Clone for RunContext<R> {
    fn clone(&self) -> Self {
        Self {
            run_id: self.run_id.clone(),
            parent_run_id: self.parent_run_id.clone(),
            parent_node: self.parent_node.clone(),
            depth: self.depth,
            max_depth: self.max_depth,
            resources: self.resources.clone(),
        }
    }
}

#[bon]
impl<R: Send + Sync + 'static> RunContext<R> {
    /// Creates a root identity; zero depth budget permits only this root.
    #[builder(start_fn = root_builder, finish_fn = build,
        builder_type = RunContextRootBuilder, state_mod(vis = "pub"))]
    pub fn root(run_id: String, max_depth: usize, resources: Arc<R>) -> Self {
        Self {
            run_id,
            parent_run_id: None,
            parent_node: None,
            depth: 0,
            max_depth,
            resources,
        }
    }

    /// Creates a fresh child identity or returns `CallError::DepthExceeded`.
    pub fn child(&self, parent_node: &NodeKey) -> Result<Self, Error> {
        if self.depth >= self.max_depth {
            return Err(CallError::DepthExceeded {
                parent_depth: self.depth,
                max_depth: self.max_depth,
            }
            .into());
        }
        Ok(Self {
            run_id: uuid::Uuid::new_v4().to_string(),
            parent_run_id: Some(self.run_id.clone()),
            parent_node: Some(parent_node.clone()),
            depth: self.depth + 1,
            max_depth: self.max_depth,
            resources: self.resources.clone(),
        })
    }

    /// Replaces resources without resetting identity or the inherited budget.
    pub fn with_resources<T: Send + Sync + 'static>(&self, resources: Arc<T>) -> RunContext<T> {
        RunContext {
            run_id: self.run_id.clone(),
            parent_run_id: self.parent_run_id.clone(),
            parent_node: self.parent_node.clone(),
            depth: self.depth,
            max_depth: self.max_depth,
            resources,
        }
    }

    /// This invocation’s unchanged business identity.
    pub fn run_id(&self) -> &str {
        &self.run_id
    }
    /// Immediate parent identity, absent for a root.
    pub fn parent_run_id(&self) -> Option<&str> {
        self.parent_run_id.as_deref()
    }
    /// Full parent node identity, including template instance key.
    pub fn parent_node(&self) -> Option<&NodeKey> {
        self.parent_node.as_ref()
    }
    /// Nesting depth; roots are zero.
    pub fn depth(&self) -> usize {
        self.depth
    }
    /// Maximum depth inherited by every descendant.
    pub fn max_depth(&self) -> usize {
        self.max_depth
    }
    /// Explicit shared resource handle; no parent State is included.
    pub fn resources(&self) -> &Arc<R> {
        &self.resources
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::NodeId;

    #[test]
    fn lineage_budget_and_resource_replacement_preserve_identity() {
        struct Resources;
        let resources = Arc::new(Resources);
        let root = RunContext::root_builder()
            .run_id("root".into())
            .max_depth(2)
            .resources(resources.clone())
            .build();
        let key = NodeKey::Instance {
            template: NodeId::new("worker"),
            key: "one".into(),
        };
        assert_eq!(root.depth(), 0);
        assert!(root.parent_node().is_none());
        let child = root.child(&key).unwrap();
        let sibling = root.child(&key).unwrap();
        assert_ne!(child.run_id(), sibling.run_id());
        assert_eq!(child.parent_run_id(), Some("root"));
        assert_eq!(child.parent_node(), Some(&key));
        assert!(Arc::ptr_eq(child.resources(), &resources));
        let copied = child.clone();
        let replaced = copied.with_resources(Arc::new(7));
        assert_eq!(replaced.run_id(), child.run_id());
        assert_eq!(replaced.parent_run_id(), child.parent_run_id());
        assert_eq!(replaced.parent_node(), child.parent_node());
        assert_eq!((replaced.depth(), replaced.max_depth()), (1, 2));
        let grandchild = replaced.child(&key).unwrap();
        assert_eq!(grandchild.parent_run_id(), Some(child.run_id()));
        assert_eq!(grandchild.depth(), 2);
        assert!(matches!(
            grandchild.child(&key),
            Err(Error::Call(CallError::DepthExceeded {
                parent_depth: 2,
                max_depth: 2
            }))
        ));
        assert!(matches!(
            RunContext::root("zero".into(), 0, Arc::new(())).child(&key),
            Err(Error::Call(CallError::DepthExceeded {
                parent_depth: 0,
                max_depth: 0
            }))
        ));
    }
}
