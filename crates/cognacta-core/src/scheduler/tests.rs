use super::*;
use crate::*;
use crate::{
    Append, DeliverTarget, Edge, GraphError, Node, NodeContext, NodeInstance, Outcome, Override,
};
use crate::{GraphInput, RunContext};

#[derive(Default, State)]
struct TestState {
    #[reducer(Append)]
    order: Vec<NodeKey>,
    #[reducer(Override)]
    gate: bool,
}

#[derive(Default)]
struct TestNode {
    gate: Option<bool>,
    directive: Option<Directive>,
}

impl NodeInstance<TestState> for TestNode {
    type Output = NodeKey;

    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<TestState>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<TestState, NodeKey>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(ctx.key.clone())),
            state_delta: TestStateDelta {
                order: Some(vec![ctx.key]),
                gate: self.gate,
            },
            directive: self.directive.clone(),
        })
    }
}

fn node(id: &str) -> Node<TestState> {
    Node::new(NodeId::new(id), TestNode::default())
}

fn edge(source: &str, target: &str) -> Edge<TestState> {
    Edge {
        source: NodeId::new(source),
        target: NodeId::new(target),
        when: None,
    }
}

#[tokio::test]
async fn instances_settle_in_creation_order_across_templates() {
    let deliveries = ["second", "first"]
        .map(|template| DeliverTarget {
            template: NodeId::new(template),
            key: "one".into(),
            payload: Arc::new(()),
        })
        .to_vec();
    let graph = Graph::<_, NodeKey>::build(
        vec![
            Node::new(
                NodeId::new("planner"),
                TestNode {
                    directive: Some(Directive::Deliver(deliveries)),
                    ..TestNode::default()
                },
            ),
            node("first").template(true),
            node("second").template(true),
        ],
        vec![],
        vec![NodeId::new("planner")],
        NodeId::new("planner"),
    )
    .unwrap();
    for concurrency in [1, 2] {
        let run = (Arc::new(LocalScheduler::new(
            SchedulerConfig::new(concurrency, 2).unwrap(),
        )) as Arc<dyn Scheduler>)
            .run(
                &graph,
                GraphInput::new(
                    graph
                        .entries
                        .iter()
                        .map(|id| (id.clone(), Input::new(vec![])))
                        .collect(),
                ),
                RunContext::root("instances".into(), 4, Arc::new(())),
            )
            .await
            .unwrap();
        assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
        assert_eq!(
            run.state().order,
            [
                NodeKey::Static(NodeId::new("planner")),
                NodeKey::Instance {
                    template: NodeId::new("second"),
                    key: "one".into(),
                },
                NodeKey::Instance {
                    template: NodeId::new("first"),
                    key: "one".into(),
                },
            ]
        );
    }
}

#[tokio::test]
async fn sweep_settles_dead_candidates_before_state_changes() {
    let graph = Graph::<_, NodeKey>::build(
        vec![
            node("seed"),
            node("D"),
            node("E"),
            Node::new(
                NodeId::new("F"),
                TestNode {
                    gate: Some(true),
                    ..TestNode::default()
                },
            )
            .join(Join::Any),
        ],
        vec![
            Edge {
                when: Some(Arc::new(|_| false)),
                ..edge("seed", "D")
            },
            Edge {
                when: Some(Arc::new(|_| false)),
                ..edge("D", "E")
            },
            Edge {
                when: Some(Arc::new(|state| state.gate)),
                ..edge("seed", "E")
            },
            edge("D", "F"),
            edge("seed", "F"),
        ],
        vec![NodeId::new("seed")],
        NodeId::new("F"),
    )
    .unwrap();
    let run = (Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 3).unwrap()))
        as Arc<dyn Scheduler>)
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("sweep".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    assert_eq!(run.waves(), 2);
    assert!(run.state().gate);
    for id in ["D", "E"] {
        let node = run.node(&NodeKey::Static(NodeId::new(id))).unwrap();
        assert_eq!(node.status(), NodeStatus::Skipped);
        assert_eq!(node.attempts(), 0);
    }
}

#[tokio::test]
async fn explicit_entry_writes_before_its_successor_wave() {
    let graph = Graph::<_, NodeKey>::build(
        vec![
            node("a"),
            Node::new(
                NodeId::new("b"),
                TestNode {
                    gate: Some(false),
                    ..TestNode::default()
                },
            )
            .writes(vec![TestStateField::Gate]),
            Node::new(
                NodeId::new("c"),
                TestNode {
                    gate: Some(true),
                    ..TestNode::default()
                },
            )
            .writes(vec![TestStateField::Gate]),
        ],
        vec![edge("a", "b"), edge("a", "c")],
        vec![NodeId::new("a"), NodeId::new("b")],
        NodeId::new("c"),
    )
    .unwrap();
    let run = (Arc::new(LocalScheduler::new(SchedulerConfig::new(2, 2).unwrap()))
        as Arc<dyn Scheduler>)
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("entry".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
    assert_eq!(run.waves(), 2);
    assert!(run.state().gate);
}

#[test]
fn connected_explicit_entries_are_checked_for_write_conflicts() {
    let result = Graph::<_, NodeKey>::build(
        vec![
            node("a").writes(vec![TestStateField::Gate]),
            node("b").writes(vec![TestStateField::Gate]),
        ],
        vec![edge("a", "b")],
        vec![NodeId::new("a"), NodeId::new("b")],
        NodeId::new("a"),
    );
    assert!(matches!(
        result,
        Err(Error::Graph(GraphError::ConcurrentSingleWriter { field: "gate", writers }))
            if writers == [NodeId::new("a"), NodeId::new("b")]
    ));
}
