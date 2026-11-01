use crate::{GraphInput, RunContext};
use std::sync::{
    Arc, Mutex,
    atomic::{AtomicUsize, Ordering},
};

use crate::{
    Add, Append, Directive, Edge, Error, Graph, GraphError, Input, LocalScheduler, MergeError,
    Node, NodeContext, NodeError, NodeId, NodeInstance, NodeKey, NodeStatus, Outcome, Override,
    RunError, RunStatus, SchedulerConfig, State,
};

#[derive(Default, State)]
struct TestState {
    #[reducer(Override)]
    title: Option<String>,
    #[reducer(Append)]
    items: Vec<String>,
    #[reducer(Add)]
    count: u8,
}

struct Worker {
    name: &'static str,
    behavior: Behavior,
    leaked: Option<Arc<Mutex<Option<Arc<TestState>>>>>,
    calls: Option<Arc<AtomicUsize>>,
}

#[derive(Clone, Copy)]
enum Behavior {
    Ok,
    Fail,
    Panic,
}

impl Worker {
    fn ok(name: &'static str) -> Self {
        Self {
            name,
            behavior: Behavior::Ok,
            leaked: None,
            calls: None,
        }
    }
}

impl NodeInstance<TestState> for Worker {
    type Output = String;

    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<TestState>,
    ) -> Result<Outcome<TestState, Self::Output>, Error> {
        if let Some(calls) = &self.calls {
            calls.fetch_add(1, Ordering::Relaxed);
        }
        if let Some(leaked) = &self.leaked {
            *leaked.lock().unwrap() = Some(ctx.state.clone());
        }
        match self.behavior {
            Behavior::Fail => Err(Error::execution(std::io::Error::other("controlled"))),
            Behavior::Panic => panic!("controlled panic"),
            Behavior::Ok => Ok(Outcome {
                value: Some(Arc::new(self.name.into())),
                state_delta: TestStateDelta {
                    title: None,
                    items: Some(vec![self.name.into()]),
                    count: Some(1),
                },
                directive: None,
            }),
        }
    }
}

fn scheduler(max_concurrency: usize, max_waves: usize) -> LocalScheduler {
    LocalScheduler::new(SchedulerConfig::new(max_concurrency, max_waves).unwrap())
}

#[tokio::test]
async fn failed_member_does_not_cancel_fixed_wave() {
    let graph = Graph::<_, String>::build(
        vec![
            Node::new(
                NodeId::new("w1"),
                Worker {
                    behavior: Behavior::Fail,
                    ..Worker::ok("w1")
                },
            ),
            Node::new(NodeId::new("w2"), Worker::ok("w2")),
            Node::new(NodeId::new("w3"), Worker::ok("w3")),
        ],
        vec![],
        vec![],
        NodeId::new("w1"),
    )
    .unwrap();
    let run = scheduler(1, 1)
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("fixed".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Failed);
    assert_eq!(run.waves(), 1);
    assert_eq!(run.state().count, 2);
    assert_eq!(run.state().items, ["w2", "w3"]);
    assert_eq!(run.errors().len(), 1);
    for name in ["w2", "w3"] {
        let node = run.node(&NodeKey::Static(NodeId::new(name))).unwrap();
        assert_eq!(node.status(), NodeStatus::Completed);
        assert!(node.output().is_some());
    }
}

#[tokio::test]
async fn panic_and_business_error_keep_their_node_keys() {
    let graph = Graph::<_, String>::build(
        vec![
            Node::new(
                NodeId::new("panic"),
                Worker {
                    behavior: Behavior::Panic,
                    ..Worker::ok("panic")
                },
            ),
            Node::new(
                NodeId::new("fail"),
                Worker {
                    behavior: Behavior::Fail,
                    ..Worker::ok("fail")
                },
            ),
        ],
        vec![],
        vec![],
        NodeId::new("panic"),
    )
    .unwrap();
    let run = scheduler(2, 1)
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("tasks".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.errors().len(), 2);
    assert!(matches!(
        &run.errors()[0],
        RunError::Node { key, source: Error::Node(NodeError::Task(_)) }
            if key == &NodeKey::Static(NodeId::new("panic"))
    ));
    assert!(matches!(
        &run.errors()[1],
        RunError::Node { key, source: Error::Node(NodeError::Execution(_)) }
            if key == &NodeKey::Static(NodeId::new("fail"))
    ));
}

#[tokio::test]
async fn escaped_state_reports_invariant_and_retains_output() {
    let leaked = Arc::new(Mutex::new(None));
    let graph = Graph::<_, String>::build(
        vec![Node::new(
            NodeId::new("leak"),
            Worker {
                leaked: Some(leaked.clone()),
                ..Worker::ok("leak")
            },
        )],
        vec![],
        vec![],
        NodeId::new("leak"),
    )
    .unwrap();
    let run = scheduler(1, 1)
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("leak".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert!(matches!(run.errors(), [RunError::Invariant(_)]));
    assert_eq!(run.state().count, 0);
    assert!(
        run.node(&NodeKey::Static(NodeId::new("leak")))
            .unwrap()
            .output()
            .is_some()
    );
    drop(leaked.lock().unwrap().take());
}

#[tokio::test]
async fn zero_wave_quota_starts_no_task() {
    let calls = Arc::new(AtomicUsize::new(0));
    let graph = Graph::<_, String>::build(
        vec![Node::new(
            NodeId::new("entry"),
            Worker {
                calls: Some(calls.clone()),
                ..Worker::ok("entry")
            },
        )],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = scheduler(1, 0)
        .run(
            &graph,
            GraphInput::new(
                graph
                    .entries
                    .iter()
                    .map(|id| (id.clone(), Input::new(vec![])))
                    .collect(),
            ),
            RunContext::root("quota".into(), 4, Arc::new(())),
        )
        .await
        .unwrap();
    assert!(matches!(run.errors(), [RunError::MaxWaves]));
    assert_eq!(calls.load(Ordering::Relaxed), 0);
    let entry = run.node(&NodeKey::Static(NodeId::new("entry"))).unwrap();
    assert_eq!(entry.status(), NodeStatus::Pending);
    assert_eq!(entry.attempts(), 0);
}

#[test]
fn graph_validation_and_static_single_writer_analysis() {
    assert!(matches!(SchedulerConfig::new(0, 1), Err(Error::Config(_))));
    let duplicate = Graph::<_, String>::build(
        vec![
            Node::new(NodeId::new("a"), Worker::ok("a")),
            Node::new(NodeId::new("a"), Worker::ok("a")),
        ],
        vec![],
        vec![],
        NodeId::new("a"),
    );
    assert!(matches!(
        duplicate,
        Err(Error::Graph(GraphError::DuplicateNode { .. }))
    ));

    let conflict = Graph::<_, String>::build(
        vec![
            Node::new(NodeId::new("a"), Worker::ok("a")),
            Node::new(NodeId::new("b"), Worker::ok("b")).writes(vec![TestStateField::Title]),
            Node::new(NodeId::new("c"), Worker::ok("c")).writes(vec![TestStateField::Title]),
            Node::new(NodeId::new("d"), Worker::ok("d")),
        ],
        vec![
            Edge {
                source: NodeId::new("a"),
                target: NodeId::new("b"),
                when: None,
            },
            Edge {
                source: NodeId::new("a"),
                target: NodeId::new("c"),
                when: None,
            },
            Edge {
                source: NodeId::new("b"),
                target: NodeId::new("d"),
                when: None,
            },
            Edge {
                source: NodeId::new("c"),
                target: NodeId::new("d"),
                when: None,
            },
        ],
        vec![],
        NodeId::new("d"),
    );
    assert!(matches!(
        conflict,
        Err(Error::Graph(GraphError::ConcurrentSingleWriter {
            field: "title",
            ..
        }))
    ));
}

#[test]
fn reducer_overflow_has_safe_display_and_real_source() {
    let error = Error::from(MergeError::Reduce {
        field: Some("count"),
        source: Box::new(std::io::Error::other("secret detail")),
    });
    assert!(!error.to_string().contains("secret detail"));
    assert!(std::error::Error::source(&error).is_some());
}

#[test]
fn directive_type_is_constructible_without_old_cluster_api() {
    let directive = Directive::Deliver(vec![]);
    assert!(matches!(directive, Directive::Deliver(targets) if targets.is_empty()));
}
