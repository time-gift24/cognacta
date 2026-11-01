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
/// Completed initialization and retained execution diagnostics, without scheduler resources.
pub struct Run<S: State, O> {
    pub(crate) state: Arc<S>,
    pub(crate) status: RunStatus,
    pub(crate) nodes: HashMap<NodeKey, NodeRun>,
    pub(crate) instances: HashMap<NodeId, Vec<NodeKey>>,
    pub(crate) errors: Vec<RunError>,
    pub(crate) final_output: Option<Arc<O>>,
    pub(crate) waves: usize,
    pub(crate) run_id: String,
    pub(crate) parent_run_id: Option<String>,
    pub(crate) parent_node: Option<NodeKey>,
    pub(crate) depth: usize,
    pub(crate) max_depth: usize,
}

impl<S: State, O: Send + Sync + 'static> Run<S, O> {
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

    pub fn final_output(&self) -> Option<&Arc<O>> {
        self.final_output.as_ref()
    }

    pub fn waves(&self) -> usize {
        self.waves
    }

    pub fn run_id(&self) -> &str {
        &self.run_id
    }
    pub fn parent_run_id(&self) -> Option<&str> {
        self.parent_run_id.as_deref()
    }
    pub fn parent_node(&self) -> Option<&NodeKey> {
        self.parent_node.as_ref()
    }
    pub fn depth(&self) -> usize {
        self.depth
    }
    pub fn max_depth(&self) -> usize {
        self.max_depth
    }

    /// Consumes diagnostics and returns the original result Arc or a stable call error.
    pub fn into_result(self) -> Result<Arc<O>, crate::Error> {
        if let [RunError::MissingOutput { .. }] = self.errors.as_slice() {
            return Err(crate::CallError::MissingOutput.into());
        }
        if self.status == RunStatus::Completed {
            return Ok(self.final_output.expect("completed run has a typed return"));
        }
        Err(crate::CallError::Execution {
            source: Box::new(ExecutionErrors(self.errors)),
        }
        .into())
    }
}

#[derive(Debug, thiserror::Error)]
#[error("graph execution failed with {} errors", .0.len())]
struct ExecutionErrors(Vec<RunError>);

#[cfg(test)]
mod tests {
    use super::*;
    use crate::*;

    #[derive(Default, State)]
    struct Empty {}
    struct Fail(&'static str);
    impl NodeInstance<Empty> for Fail {
        type Output = ();
        async fn run(&self, _: &Input, _: NodeContext<Empty>) -> Result<Outcome<Empty, ()>, Error> {
            Err(Error::execution(std::io::Error::other(self.0)))
        }
    }

    #[tokio::test]
    async fn consuming_failure_preserves_every_error_and_source_in_order() {
        let graph = Graph::<Empty, ()>::build(
            vec![
                Node::new(NodeId::new("first"), Fail("one")),
                Node::new(NodeId::new("second"), Fail("two")),
            ],
            vec![],
            vec![],
            NodeId::new("first"),
        )
        .unwrap();
        let input = GraphInput::new(
            ["first", "second"]
                .into_iter()
                .map(|id| (NodeId::new(id), Input::new(vec![])))
                .collect(),
        );
        let run = LocalScheduler::new(SchedulerConfig::new(2, 1).unwrap())
            .run(
                &graph,
                input,
                RunContext::root("errors".into(), 1, Arc::new(())),
            )
            .await
            .unwrap();
        assert_eq!(run.errors().len(), 2);
        let Error::Call(CallError::Execution { source }) = run.into_result().unwrap_err() else {
            panic!("wrong error category")
        };
        let errors = &source.downcast_ref::<ExecutionErrors>().unwrap().0;
        assert_eq!(errors.len(), 2);
        for (error, (id, message)) in errors.iter().zip([("first", "one"), ("second", "two")]) {
            let RunError::Node {
                key,
                source: Error::Node(NodeError::Execution(source)),
            } = error
            else {
                panic!("missing node source")
            };
            assert_eq!(key, &NodeKey::Static(NodeId::new(id)));
            assert_eq!(
                source.downcast_ref::<std::io::Error>().unwrap().to_string(),
                message
            );
        }
    }
}
