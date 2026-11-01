use crate::{GraphInput, RunContext};
use std::{
    cell::Cell,
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
};

use crate::{
    DeliverTarget, Directive, DirectiveError, Edge, Error, Graph, Input, Join, LocalScheduler,
    Node, NodeContext, NodeId, NodeInstance, NodeKey, NodeStatus, Outcome, Reducer, RunError,
    RunStatus, SchedulerConfig, SharedValue, State, WritePolicy,
};

#[derive(Default, State)]
struct EmptyState {}

struct NonClone(u32);

struct Produce;
impl NodeInstance<EmptyState> for Produce {
    type Output = NonClone;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, NonClone>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(NonClone(7))),
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

struct Consume;
impl NodeInstance<EmptyState> for Consume {
    type Output = u32;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, u32>, Error> {
        let source = NodeId::new("source");
        let value = input.one::<NonClone>(&source)?;
        assert_eq!(input.all::<NonClone>()?.len(), 1);
        assert_eq!(input.origins(&source).len(), 1);
        assert!(matches!(input.one::<String>(&source), Err(Error::Input(_))));
        Ok(Outcome {
            value: Some(Arc::new(value.0)),
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn non_clone_output_is_shared_once_across_duplicate_edges() {
    let graph = Graph::<_, u32>::build(
        vec![
            Node::new(NodeId::new("source"), Produce),
            Node::new(NodeId::new("target"), Consume),
        ],
        vec![
            Edge {
                source: NodeId::new("source"),
                target: NodeId::new("target"),
                when: None,
            },
            Edge {
                source: NodeId::new("source"),
                target: NodeId::new("target"),
                when: None,
            },
            Edge {
                source: NodeId::new("source"),
                target: NodeId::new("target"),
                when: Some(Arc::new(|_: &EmptyState| false)),
            },
        ],
        vec![NodeId::new("source")],
        NodeId::new("target"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(1, 2).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("input".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    let output = run.final_output().unwrap();
    assert_eq!(**output, 7);
}

struct Planner;
impl NodeInstance<EmptyState> for Planner {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        let delivery = |key: &str| DeliverTarget {
            template: NodeId::new("worker"),
            payload: Arc::new(String::from("job")) as SharedValue,
            key: key.into(),
        };
        Ok(Outcome {
            value: Some(Arc::new("plan".into())),
            state_delta: EmptyStateDelta::default(),
            directive: Some(Directive::Deliver(vec![delivery("same"), delivery("same")])),
        })
    }
}

struct Worker;
impl NodeInstance<EmptyState> for Worker {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        Ok(Outcome {
            value: Some(Arc::new("work".into())),
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn duplicate_instance_key_rejects_the_entire_route_batch() {
    let graph = Graph::<_, String>::build(
        vec![
            Node::new(NodeId::new("planner"), Planner),
            Node::new(NodeId::new("worker"), Worker).template(true),
        ],
        vec![],
        vec![NodeId::new("planner")],
        NodeId::new("planner"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(1, 2).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("duplicate".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert!(run.instances(&NodeId::new("worker")).is_empty());
    assert!(matches!(
        run.errors(),
        [RunError::InvalidDirective {
            source: DirectiveError::DuplicateInstanceKey { .. },
            ..
        }]
    ));
}

struct TransitionSource;
impl NodeInstance<EmptyState> for TransitionSource {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        Ok(Outcome {
            value: Some(Arc::new("source".into())),
            state_delta: EmptyStateDelta::default(),
            directive: Some(Directive::Transition {
                target: NodeId::new("target"),
                payload: Some(Arc::new(2_u32) as SharedValue),
                immediate: false,
            }),
        })
    }
}

struct LastTransition;
impl NodeInstance<EmptyState> for LastTransition {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        Ok(Outcome {
            value: Some(Arc::new("last".into())),
            state_delta: EmptyStateDelta::default(),
            directive: Some(Directive::Transition {
                target: NodeId::new("target"),
                payload: Some(Arc::new(3_u32) as SharedValue),
                immediate: false,
            }),
        })
    }
}

struct TransitionTarget;
impl NodeInstance<EmptyState> for TransitionTarget {
    type Output = u32;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, u32>, Error> {
        assert!(input.one::<u32>(&NodeId::new("first")).is_err());
        let last = input.one::<u32>(&NodeId::new("last"))?;
        Ok(Outcome {
            value: Some(Arc::new(*last)),
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn last_transition_replaces_payload_and_permit() {
    let graph = Graph::<_, u32>::build(
        vec![
            Node::new(NodeId::new("first"), TransitionSource),
            Node::new(NodeId::new("last"), LastTransition),
            Node::new(NodeId::new("target"), TransitionTarget),
        ],
        vec![
            Edge {
                source: NodeId::new("first"),
                target: NodeId::new("target"),
                when: None,
            },
            Edge {
                source: NodeId::new("last"),
                target: NodeId::new("target"),
                when: None,
            },
        ],
        vec![NodeId::new("first"), NodeId::new("last")],
        NodeId::new("target"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(2, 2).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("last".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    let target = run.node(&NodeKey::Static(NodeId::new("target"))).unwrap();
    assert_eq!(target.attempts(), 1);
    assert_eq!(target.output().unwrap().downcast_ref::<u32>(), Some(&3));
}

struct NoOutput;
impl NodeInstance<EmptyState> for NoOutput {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        Ok(Outcome {
            value: None,
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn completed_without_values_reports_missing_output() {
    let graph = Graph::<_, String>::build(
        vec![Node::new(NodeId::new("empty"), NoOutput)],
        vec![],
        vec![],
        NodeId::new("empty"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(1, 1).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("empty".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Failed);
    assert!(run.final_output().is_none());
    assert!(matches!(run.errors(), [RunError::MissingOutput { .. }]));
    let node = run.node(&NodeKey::Static(NodeId::new("empty"))).unwrap();
    assert_eq!(node.status(), NodeStatus::Completed);
}

#[derive(Default)]
struct CellReducer;

impl Reducer<u32> for CellReducer {
    type Delta = Cell<u32>;
    const POLICY: WritePolicy = WritePolicy::SingleWriter;

    fn reduce(&mut self, _current: &u32, delta: Cell<u32>) -> Result<u32, Error> {
        Ok(delta.get())
    }

    fn finish(self, value: u32) -> Result<u32, Error> {
        Ok(value)
    }
}

#[derive(Default, State)]
struct CellState {
    #[reducer(CellReducer)]
    count: u32,
}

struct CellNode;
impl NodeInstance<CellState> for CellNode {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<CellState>,
    ) -> Result<Outcome<CellState, String>, Error> {
        Ok(Outcome {
            value: Some(Arc::new("cell".into())),
            state_delta: CellStateDelta {
                count: Some(Cell::new(9)),
            },
            directive: None,
        })
    }
}

#[tokio::test]
async fn send_but_not_sync_delta_crosses_the_node_boundary() {
    let graph = Graph::<_, String>::build(
        vec![Node::new(NodeId::new("cell"), CellNode)],
        vec![],
        vec![],
        NodeId::new("cell"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(1, 1).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("cell".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    assert_eq!(run.state().count, 9);
}

struct RearmNode {
    calls: Arc<AtomicUsize>,
    inputs: Arc<Mutex<Vec<usize>>>,
}
impl NodeInstance<EmptyState> for RearmNode {
    type Output = u32;
    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, u32>, Error> {
        let call = self.calls.fetch_add(1, Ordering::Relaxed) + 1;
        self.inputs
            .lock()
            .unwrap()
            .push(input.entry::<String>()?.len());
        Ok(Outcome {
            value: Some(Arc::new(call as u32)),
            state_delta: EmptyStateDelta::default(),
            directive: (call == 1).then(|| Directive::Transition {
                target: NodeId::new("rearm"),
                payload: None,
                immediate: true,
            }),
        })
    }
}

#[tokio::test]
async fn rearm_preserves_attempts_and_entry_input_but_replaces_output() {
    let calls = Arc::new(AtomicUsize::new(0));
    let inputs = Arc::new(Mutex::new(Vec::new()));
    let graph = Graph::<_, u32>::build(
        vec![Node::new(
            NodeId::new("rearm"),
            RearmNode {
                calls: calls.clone(),
                inputs: inputs.clone(),
            },
        )],
        vec![],
        vec![],
        NodeId::new("rearm"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(1, 2).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| {
                        (
                            id.clone(),
                            Input::new(vec![Arc::new(String::from("run")) as SharedValue]),
                        )
                    })
                    .collect(),
            ),
            RunContext::root("rearm".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    assert_eq!(run.waves(), 2);
    assert_eq!(*inputs.lock().unwrap(), [3, 3]);
    let node = run.node(&NodeKey::Static(NodeId::new("rearm"))).unwrap();
    assert_eq!(node.attempts(), 2);
    assert_eq!(node.output().unwrap().downcast_ref::<u32>(), Some(&2));
}

struct JoinTarget;
impl NodeInstance<EmptyState> for JoinTarget {
    type Output = String;
    async fn run(
        &self,
        _input: &Input,
        _ctx: NodeContext<EmptyState>,
    ) -> Result<Outcome<EmptyState, String>, Error> {
        Ok(Outcome {
            value: Some(Arc::new("joined".into())),
            state_delta: EmptyStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn custom_join_receives_done_and_live_edge_counts() {
    let votes = Arc::new(Mutex::new(Vec::new()));
    let observed = votes.clone();
    let graph = Graph::<_, String>::build(
        vec![
            Node::new(NodeId::new("a"), Worker),
            Node::new(NodeId::new("b"), Worker),
            Node::new(NodeId::new("joined"), JoinTarget).join(Join::Custom(Arc::new(
                move |done, total| {
                    observed.lock().unwrap().push((done, total));
                    done == total
                },
            ))),
        ],
        vec![
            Edge {
                source: NodeId::new("a"),
                target: NodeId::new("joined"),
                when: None,
            },
            Edge {
                source: NodeId::new("b"),
                target: NodeId::new("joined"),
                when: None,
            },
        ],
        vec![],
        NodeId::new("joined"),
    )
    .unwrap();
    let run = LocalScheduler::new(SchedulerConfig::new(1, 2).unwrap())
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("join".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    assert_eq!(*votes.lock().unwrap(), [(2, 2)]);
}
