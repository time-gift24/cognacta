use crate::*;
use serde::{Deserialize, Serialize, Serializer};
use std::{
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicUsize, Ordering},
    },
    time::SystemTime,
};
use tokio::sync::{Notify, Semaphore};

#[derive(Default, Serialize, State, serde::Deserialize)]
struct Data {
    #[reducer(Append)]
    order: Vec<String>,
    #[reducer(Override)]
    optional: Option<String>,
}

struct Step {
    calls: Arc<AtomicUsize>,
    fail: bool,
    panic: bool,
    directive: Option<Directive>,
    clear: bool,
    value: bool,
}

impl Step {
    fn new(calls: &Arc<AtomicUsize>) -> Self {
        Self {
            calls: calls.clone(),
            fail: false,
            panic: false,
            directive: None,
            clear: false,
            value: true,
        }
    }
}

impl NodeInstance<Data> for Step {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        assert!(!self.panic, "node panic");
        if self.fail {
            return Err(Error::execution(std::io::Error::other("business failure")));
        }
        Ok(Outcome {
            value: self.value.then(|| Arc::new(())),
            state_delta: DataDelta {
                order: Some(vec![ctx.key.to_string()]),
                optional: self.clear.then_some(None),
            },
            directive: self.directive.clone(),
        })
    }
}

fn scheduler(k: usize) -> Arc<dyn Scheduler> {
    Arc::new(LocalScheduler::new(SchedulerConfig::new(k, 8).unwrap()))
}

fn input(names: &[&str]) -> GraphInput {
    GraphInput::new(
        names
            .iter()
            .map(|name| (NodeId::new(*name), Input::new(vec![])))
            .collect(),
    )
}

fn context<L: EventLog + 'static>(name: &str, log: Arc<L>) -> RunContext {
    RunContext::root(name.into(), 4, Arc::new(())).with_event_log(log)
}

fn make_graph(nodes: Vec<Node<Data>>, edges: Vec<Edge<Data>>, returned: &str) -> Graph<Data, ()> {
    Graph::build(nodes, edges, vec![], NodeId::new(returned)).unwrap()
}

fn edge(from: &str, to: &str) -> Edge<Data> {
    Edge {
        source: NodeId::new(from),
        target: NodeId::new(to),
        when: None,
    }
}

struct ControlledLog {
    inner: InMemoryEventLog,
    fail: Option<&'static str>,
    child_only: bool,
    block: Option<&'static str>,
    blocked: AtomicBool,
    reached: Notify,
    failed: Notify,
    release: Semaphore,
}

impl ControlledLog {
    fn new(fail: Option<&'static str>, block: Option<&'static str>) -> Self {
        Self {
            inner: InMemoryEventLog::new(),
            fail,
            child_only: false,
            block,
            blocked: AtomicBool::new(false),
            reached: Notify::new(),
            failed: Notify::new(),
            release: Semaphore::new(0),
        }
    }
}

impl EventLog for ControlledLog {
    async fn append(&self, event: Event) -> Result<(), Error> {
        if self.block == Some(event.kind()) && !self.blocked.swap(true, Ordering::SeqCst) {
            self.reached.notify_one();
            self.release.acquire().await.unwrap().forget();
        }
        if self.fail == Some(event.kind()) && (!self.child_only || event.parent_run_id().is_some())
        {
            self.failed.notify_one();
            return Err(EventLogError::Append {
                source: Box::new(std::io::Error::other("storage offline")),
            }
            .into());
        }
        self.inner.append(event).await
    }
    async fn events(&self, run_id: &str, after_seq: u64) -> Result<Vec<Arc<Event>>, Error> {
        self.inner.events(run_id, after_seq).await
    }
    async fn all_events(&self) -> Result<Vec<Arc<Event>>, Error> {
        self.inner.all_events().await
    }
}

#[tokio::test]
async fn append_failures_gate_startup_nodes_downstream_and_terminal_publication() {
    for (kind, expected_init, expected_calls) in [
        ("run_started", 0, 0),
        ("run_initialized", 1, 0),
        ("node_started", 1, 0),
        ("node_completed", 1, 1),
        ("control", 1, 1),
        ("run_completed", 1, 2),
    ] {
        let calls = Arc::new(AtomicUsize::new(0));
        let initialized = Arc::new(AtomicUsize::new(0));
        let init = initialized.clone();
        let projections = Arc::new(AtomicUsize::new(0));
        let projected = projections.clone();
        let first =
            Node::new(NodeId::new("first"), Step::new(&calls)).with_resources(move |_: &()| {
                projected.fetch_add(1, Ordering::SeqCst);
                Ok(Arc::new(()))
            });
        let graph = Graph::<Data, ()>::build_with_initializer(
            vec![first, Node::new(NodeId::new("next"), Step::new(&calls))],
            vec![edge("first", "next")],
            vec![],
            NodeId::new("next"),
            move |_, _| {
                let init = init.clone();
                async move {
                    init.fetch_add(1, Ordering::SeqCst);
                    Ok(Data::default())
                }
            },
        )
        .unwrap();
        let log = Arc::new(ControlledLog::new(Some(kind), None));
        let result = scheduler(1)
            .run(&graph, input(&["first"]), context("root", log.clone()))
            .await;
        assert!(
            matches!(result, Err(Error::EventLog(EventLogError::Append { .. }))),
            "{kind}"
        );
        assert_eq!(initialized.load(Ordering::SeqCst), expected_init, "{kind}");
        assert_eq!(calls.load(Ordering::SeqCst), expected_calls, "{kind}");
        assert_eq!(
            projections.load(Ordering::SeqCst),
            usize::from(expected_calls > 0),
            "{kind}"
        );
        let events = log.events("root", 0).await.unwrap();
        assert!(!events.iter().any(|event| matches!(
            event.data(),
            EventData::RunFailed { .. } | EventData::RunCompleted { .. }
        )));
        assert_eq!(
            events
                .iter()
                .map(|event| event.seq().get())
                .collect::<Vec<_>>(),
            (1..=events.len() as u64).collect::<Vec<_>>()
        );
    }
}

#[derive(Deserialize)]
struct CannotEncode;
impl Serialize for CannotEncode {
    fn serialize<S: Serializer>(&self, _: S) -> Result<S::Ok, S::Error> {
        Err(serde::ser::Error::custom("deliberate encoding failure"))
    }
}

#[derive(State, Deserialize)]
struct BadState {}
impl Serialize for BadState {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        CannotEncode.serialize(serializer)
    }
}
struct BadStateNode(Arc<AtomicUsize>);
impl NodeInstance<BadState> for BadStateNode {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<BadState>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<BadState, ()>, Error> {
        self.0.fetch_add(1, Ordering::SeqCst);
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
struct BadOutput(Arc<AtomicUsize>);
impl NodeInstance<Data> for BadOutput {
    type Output = CannotEncode;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, CannotEncode>, Error> {
        self.0.fetch_add(1, Ordering::SeqCst);
        Ok(Outcome {
            value: Some(Arc::new(CannotEncode)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

#[derive(Deserialize)]
struct BadReturn;
impl Serialize for BadReturn {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str("not a u64")
    }
}
struct ReturnNode;
impl NodeInstance<Data> for ReturnNode {
    type Output = BadReturn;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, BadReturn>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(BadReturn)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn invalid_final_output_stops_before_terminal_append() {
    let graph = Graph::<Data, BadReturn>::build(
        vec![Node::new(NodeId::new("one"), ReturnNode)],
        vec![],
        vec![],
        NodeId::new("one"),
    )
    .unwrap();
    let log = Arc::new(InMemoryEventLog::new());
    assert!(matches!(
        scheduler(1)
            .run(&graph, input(&["one"]), context("return", log.clone()))
            .await,
        Err(Error::EventLog(EventLogError::Decode { .. }))
    ));
    let events = log.events("return", 0).await.unwrap();
    assert!(
        events
            .iter()
            .any(|event| matches!(event.data(), EventData::NodeCompleted { .. }))
    );
    assert!(!events.iter().any(|event| matches!(
        event.data(),
        EventData::RunCompleted { .. } | EventData::RunFailed { .. }
    )));
}

#[tokio::test]
async fn encoding_failure_preserves_only_actual_state_or_node_prefixes() {
    let calls = Arc::new(AtomicUsize::new(0));
    let initialized = Arc::new(AtomicUsize::new(0));
    let init = initialized.clone();
    let graph = Graph::<BadState, ()>::build_with_initializer(
        vec![Node::new(NodeId::new("one"), BadStateNode(calls.clone()))],
        vec![],
        vec![],
        NodeId::new("one"),
        move |_, _| {
            let init = init.clone();
            async move {
                init.fetch_add(1, Ordering::SeqCst);
                Ok(BadState {})
            }
        },
    )
    .unwrap();
    let state_log = Arc::new(InMemoryEventLog::new());
    assert!(matches!(
        scheduler(1)
            .run(&graph, input(&["one"]), context("state", state_log.clone()))
            .await,
        Err(Error::EventLog(EventLogError::Encode { .. }))
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(
        state_log
            .events("state", 0)
            .await
            .unwrap()
            .iter()
            .map(|e| e.kind())
            .collect::<Vec<_>>(),
        ["run_started"]
    );
    let graph = Graph::<Data, CannotEncode>::build(
        vec![Node::new(NodeId::new("one"), BadOutput(calls.clone()))],
        vec![],
        vec![],
        NodeId::new("one"),
    )
    .unwrap();
    let log = Arc::new(InMemoryEventLog::new());
    assert!(matches!(
        scheduler(1)
            .run(&graph, input(&["one"]), context("output", log.clone()))
            .await,
        Err(Error::EventLog(EventLogError::Encode { .. }))
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        log.events("output", 0)
            .await
            .unwrap()
            .iter()
            .map(|e| e.kind())
            .collect::<Vec<_>>(),
        ["run_started", "run_initialized", "node_started"]
    );
    // Default in-memory recording obeys exactly the same encoding contract.
    assert!(matches!(
        scheduler(1)
            .run(
                &graph,
                input(&["one"]),
                RunContext::root("plain".into(), 1, Arc::new(()))
            )
            .await,
        Err(Error::EventLog(EventLogError::Encode { .. }))
    ));
}

#[tokio::test]
async fn json_outcomes_preserve_unit_optional_delta_and_delivery_payload() {
    let calls = Arc::new(AtomicUsize::new(0));
    let mut emit = Step::new(&calls);
    emit.clear = true;
    emit.directive = Some(Directive::Deliver(vec![DeliverTarget {
        template: NodeId::new("worker"),
        payload: Arc::new(serde_json::json!("hello")),
        key: "job".into(),
    }]));
    let graph = make_graph(
        vec![
            Node::new(NodeId::new("emit"), emit),
            Node::new(NodeId::new("worker"), Step::new(&calls)).template(true),
        ],
        vec![],
        "emit",
    );
    let log = Arc::new(InMemoryEventLog::new());
    let run = scheduler(1)
        .run(&graph, input(&["emit"]), context("data", log.clone()))
        .await
        .unwrap();
    assert_eq!(run.state().order, ["emit", "worker[job]"]);
    let events = log.events("data", 0).await.unwrap();
    let outcomes = events
        .iter()
        .filter_map(|event| match event.data() {
            EventData::NodeCompleted { outcome, .. } => Some(outcome),
            _ => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(
        outcomes[0].value.as_ref().unwrap().as_ref(),
        &serde_json::Value::Null
    );
    assert_eq!(outcomes[0].state_delta["optional"], serde_json::Value::Null);
    assert!(outcomes[1].state_delta.get("optional").is_none());
    assert_eq!(
        outcomes[0].state_delta["order"],
        serde_json::json!(["emit"])
    );
    let Some(Directive::Deliver(deliveries)) = &outcomes[0].directive else {
        panic!("missing delivery")
    };
    assert_eq!(deliveries[0].template.as_str(), "worker");
    assert_eq!(deliveries[0].key, "job");
    assert_eq!(deliveries[0].payload.as_ref(), &serde_json::json!("hello"));

    let mut no_value = Step::new(&calls);
    no_value.value = false;
    let graph = make_graph(
        vec![Node::new(NodeId::new("empty"), no_value)],
        vec![],
        "empty",
    );
    let log = Arc::new(InMemoryEventLog::new());
    assert_eq!(
        scheduler(1)
            .run(&graph, input(&["empty"]), context("empty", log.clone()))
            .await
            .unwrap()
            .status(),
        RunStatus::Failed
    );
    let events = log.events("empty", 0).await.unwrap();
    let EventData::NodeCompleted { outcome, .. } = events[3].data() else {
        panic!("missing outcome")
    };
    assert!(outcome.value.is_none());
}

#[test]
fn json_roundtrip_preserves_missing_and_explicit_null() {
    let absent = DataDelta {
        optional: None,
        ..Default::default()
    };
    let cleared = DataDelta {
        optional: Some(None),
        ..Default::default()
    };
    assert!(
        serde_json::to_value(&absent)
            .unwrap()
            .get("optional")
            .is_none()
    );
    assert_eq!(
        serde_json::to_value(&cleared).unwrap()["optional"],
        serde_json::Value::Null
    );
    let restored: DataDelta =
        serde_json::from_value(serde_json::to_value(&cleared).unwrap()).unwrap();
    assert_eq!(restored.optional, Some(None));

    let missing = RecordedOutcome {
        value: None,
        state_delta: serde_json::json!({}),
        directive: None,
    };
    let present = RecordedOutcome {
        value: Some(Arc::new(serde_json::Value::Null)),
        state_delta: serde_json::json!({}),
        directive: Some(Directive::Transition {
            target: NodeId::new("target"),
            payload: Some(Arc::new(serde_json::Value::Null)),
            immediate: true,
        }),
    };
    assert!(
        serde_json::to_value(&missing)
            .unwrap()
            .get("value")
            .is_none()
    );
    let encoded = serde_json::to_value(&present).unwrap();
    assert_eq!(encoded["value"], serde_json::Value::Null);
    assert_eq!(
        encoded["directive"]["Transition"]["payload"],
        serde_json::Value::Null
    );
    assert_eq!(
        serde_json::from_value::<RecordedOutcome>(encoded).unwrap(),
        present
    );
}

#[tokio::test]
async fn ordinary_failure_and_panic_each_record_once_and_drain_queued_members() {
    for panics in [false, true] {
        let calls = Arc::new(AtomicUsize::new(0));
        let mut failed = Step::new(&calls);
        failed.fail = !panics;
        failed.panic = panics;
        let graph = make_graph(
            vec![
                Node::new(NodeId::new("failed"), failed),
                Node::new(NodeId::new("queued"), Step::new(&calls)),
            ],
            vec![],
            "queued",
        );
        let log = Arc::new(InMemoryEventLog::new());
        let run = scheduler(1)
            .run(
                &graph,
                input(&["failed", "queued"]),
                context("root", log.clone()),
            )
            .await
            .unwrap();
        assert_eq!(run.status(), RunStatus::Failed);
        assert_eq!(calls.load(Ordering::SeqCst), 2);
        let events = log.events("root", 0).await.unwrap();
        assert_eq!(
            events.iter().filter(|e| e.kind() == "node_failed").count(),
            1
        );
        assert_eq!(events.iter().filter(|e| e.kind() == "control").count(), 1);
        assert_eq!(events.last().unwrap().kind(), "run_failed");
        assert_eq!(run.state().order, ["queued"]);
    }
}

struct DecodeInput;

impl NodeInstance<Data> for DecodeInput {
    type Output = ();

    async fn run(
        &self,
        input: &Input,
        _: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        let _: u64 = serde_json::from_value(input.entry()?.clone())
            .map_err(|source| InputError::Decode { source })?;
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: DataDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn input_schema_error_records_an_input_failure() {
    let graph = make_graph(
        vec![Node::new(NodeId::new("read"), DecodeInput)],
        vec![],
        "read",
    );
    let log = Arc::new(InMemoryEventLog::new());
    let input = GraphInput::new(std::collections::HashMap::from([(
        NodeId::new("read"),
        Input::new(vec![Arc::new(serde_json::json!("not a number"))]),
    )]));
    let run = scheduler(1)
        .run(&graph, input, context("schema", log.clone()))
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Failed);
    let events = log.events("schema", 0).await.unwrap();
    assert!(events.iter().any(|event| matches!(
        event.data(),
        EventData::NodeFailed {
            reason: FailureKind::Input,
            ..
        }
    )));
    assert!(!events.iter().any(|event| event.kind() == "node_completed"));
}

#[tokio::test]
async fn unpolled_and_cancelled_append_leave_only_stored_prefixes() {
    let calls = Arc::new(AtomicUsize::new(0));
    let graph = make_graph(
        vec![Node::new(NodeId::new("one"), Step::new(&calls))],
        vec![],
        "one",
    );
    let log = Arc::new(ControlledLog::new(None, Some("node_completed")));
    drop(scheduler(1).run(&graph, input(&["one"]), context("unpolled", log.clone())));
    assert!(log.all_events().await.unwrap().is_empty());
    let mut future = scheduler(1).run(&graph, input(&["one"]), context("cancelled", log.clone()));
    tokio::select! { _ = log.reached.notified() => {}, _ = &mut future => panic!("append should wait") }
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        log.events("cancelled", 0)
            .await
            .unwrap()
            .iter()
            .map(|e| e.kind())
            .collect::<Vec<_>>(),
        ["run_started", "run_initialized", "node_started"]
    );
    drop(future);
    tokio::task::yield_now().await;
    assert_eq!(log.events("cancelled", 0).await.unwrap().len(), 3);
}

struct Reenter;
impl NodeInstance<Data> for Reenter {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: DataDelta {
                order: Some(vec!["entry".into()]),
                optional: None,
            },
            directive: ctx.state.order.is_empty().then(|| Directive::Transition {
                target: NodeId::new("entry"),
                payload: None,
                immediate: false,
            }),
        })
    }
}

#[tokio::test]
async fn transition_attempts_and_skip_facts_precede_the_terminal_record() {
    let calls = Arc::new(AtomicUsize::new(0));
    let graph = make_graph(
        vec![
            Node::new(NodeId::new("entry"), Reenter),
            Node::new(NodeId::new("skip"), Step::new(&calls)),
        ],
        vec![Edge {
            when: Some(Arc::new(|_| false)),
            ..edge("entry", "skip")
        }],
        "entry",
    );
    let log = Arc::new(InMemoryEventLog::new());
    let run = scheduler(1)
        .run(&graph, input(&["entry"]), context("root", log.clone()))
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    let events = log.events("root", 0).await.unwrap();
    let attempts = events
        .iter()
        .filter_map(|e| match e.data() {
            EventData::NodeStarted { node, .. } => Some(node.attempt.get()),
            _ => None,
        })
        .collect::<Vec<_>>();
    assert_eq!(attempts, [1, 2]);
    assert_eq!(events[events.len() - 2].kind(), "node_skipped");
    let EventData::NodeCompleted { outcome, .. } = events[3].data() else {
        panic!("missing outcome")
    };
    let Some(Directive::Transition {
        target,
        payload,
        immediate,
    }) = outcome.directive.clone()
    else {
        panic!("missing transition")
    };
    assert_eq!(target.as_str(), "entry");
    assert!(payload.is_none());
    assert!(!immediate);
}

struct NestedInput;
impl NodeInstance<Data> for NestedInput {
    type Output = GraphInput;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, GraphInput>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(input(&["child"]))),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn children_inherit_log_and_attempt_but_independent_roots_keep_separate_gates() {
    let calls = Arc::new(AtomicUsize::new(0));
    let child = make_graph(
        vec![Node::new(NodeId::new("child"), Step::new(&calls))],
        vec![],
        "child",
    );
    let parent = make_graph(
        vec![
            Node::new(NodeId::new("prepare"), NestedInput),
            Node::new(NodeId::new("nested"), child).with_resources(|_: &()| Ok(Arc::new(()))),
        ],
        vec![edge("prepare", "nested")],
        "nested",
    );
    let log = Arc::new(InMemoryEventLog::new());
    scheduler(1)
        .run(&parent, input(&["prepare"]), context("parent", log.clone()))
        .await
        .unwrap();
    let all = log.all_events().await.unwrap();
    let start = all
        .iter()
        .find(|e| e.parent_run_id() == Some("parent") && e.kind() == "run_started")
        .unwrap();
    assert_eq!(start.seq().get(), 1);
    let EventData::RunStarted {
        caller: Some(caller),
        depth,
        ..
    } = start.data()
    else {
        panic!("missing lineage")
    };
    assert_eq!(caller.node.key, NodeKey::Static(NodeId::new("nested")));
    assert_eq!(caller.node.attempt.get(), 1);
    assert_eq!(*depth, 1);

    let mut failed = ControlledLog::new(Some("node_completed"), None);
    failed.child_only = true;
    let failed = Arc::new(failed);
    assert!(matches!(
        scheduler(1)
            .run(
                &parent,
                input(&["prepare"]),
                context("failed-root", failed.clone())
            )
            .await,
        Err(Error::EventLog(_))
    ));
    assert!(
        !failed
            .all_events()
            .await
            .unwrap()
            .iter()
            .any(|e| e.kind() == "run_failed")
    );
    let independent = make_graph(
        vec![Node::new(NodeId::new("one"), Step::new(&calls))],
        vec![],
        "one",
    );
    assert!(
        scheduler(1)
            .run(
                &independent,
                input(&["one"]),
                context("independent", failed.clone())
            )
            .await
            .unwrap()
            .into_result()
            .is_ok()
    );
}

struct TimedOutput(Arc<Mutex<Option<SystemTime>>>);
impl<'de> Deserialize<'de> for TimedOutput {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        <()>::deserialize(deserializer)?;
        Ok(Self(Arc::new(Mutex::new(None))))
    }
}
impl Serialize for TimedOutput {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        *self.0.lock().unwrap() = Some(SystemTime::now());
        serializer.serialize_unit()
    }
}
struct TimedNode(Arc<Mutex<Option<SystemTime>>>);
impl NodeInstance<Data> for TimedNode {
    type Output = TimedOutput;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, TimedOutput>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(TimedOutput(self.0.clone()))),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn completion_time_follows_outcome_serialization() {
    let serialized_at = Arc::new(Mutex::new(None));
    let graph = Graph::<Data, TimedOutput>::build(
        vec![Node::new(
            NodeId::new("timed"),
            TimedNode(serialized_at.clone()),
        )],
        vec![],
        vec![],
        NodeId::new("timed"),
    )
    .unwrap();
    let log = Arc::new(InMemoryEventLog::new());
    scheduler(1)
        .run(&graph, input(&["timed"]), context("root", log.clone()))
        .await
        .unwrap();
    let events = log.events("root", 0).await.unwrap();
    assert!(
        events
            .iter()
            .find(|e| e.kind() == "node_completed")
            .unwrap()
            .ts()
            >= serialized_at.lock().unwrap().unwrap()
    );
}

struct GatedStep {
    started: tokio::sync::mpsc::UnboundedSender<String>,
    release: Arc<Semaphore>,
    finished: Arc<AtomicUsize>,
}
impl NodeInstance<Data> for GatedStep {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        self.started.send(ctx.key.to_string()).unwrap();
        self.release.acquire().await.unwrap().forget();
        self.finished.fetch_add(1, Ordering::SeqCst);
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: DataDelta {
                order: Some(vec![ctx.key.to_string()]),
                optional: None,
            },
            directive: None,
        })
    }
}

#[tokio::test]
async fn concurrent_appends_wait_in_sequence_and_keep_ready_merge_order() {
    let (started, mut starts) = tokio::sync::mpsc::unbounded_channel();
    let gates: Vec<_> = (0..2).map(|_| Arc::new(Semaphore::new(0))).collect();
    let finished = Arc::new(AtomicUsize::new(0));
    let graph = make_graph(
        ["a", "b"]
            .iter()
            .zip(&gates)
            .map(|(key, release)| {
                Node::new(
                    NodeId::new(*key),
                    GatedStep {
                        started: started.clone(),
                        release: release.clone(),
                        finished: finished.clone(),
                    },
                )
            })
            .collect(),
        vec![],
        "b",
    );
    let log = Arc::new(ControlledLog::new(None, Some("node_completed")));
    let recording = log.clone();
    let run = tokio::spawn(async move {
        scheduler(2)
            .run(&graph, input(&["a", "b"]), context("root", recording))
            .await
    });
    assert_eq!(starts.recv().await.as_deref(), Some("a"));
    assert_eq!(starts.recv().await.as_deref(), Some("b"));
    gates[1].add_permits(1);
    log.reached.notified().await;
    gates[0].add_permits(1);
    // A's body can finish while B's asynchronous append holds the Run's sequence.
    while finished.load(Ordering::SeqCst) != 2 {
        tokio::task::yield_now().await;
    }
    assert!(!run.is_finished());
    assert_eq!(log.events("root", 0).await.unwrap().len(), 4);
    log.release.add_permits(1);
    let run = run.await.unwrap().unwrap();
    assert_eq!(run.state().order, ["a", "b"]);
    let events = log.events("root", 0).await.unwrap();
    assert_eq!(
        events
            .iter()
            .map(|event| event.seq().get())
            .collect::<Vec<_>>(),
        (1..=events.len() as u64).collect::<Vec<_>>()
    );
    assert_eq!(
        events
            .iter()
            .filter_map(|event| match event.data() {
                EventData::NodeCompleted { node, .. } => Some(node.key.to_string()),
                _ => None,
            })
            .collect::<Vec<_>>(),
        ["b", "a"]
    );
}

#[tokio::test]
async fn recording_failure_drains_started_sibling_and_never_admits_queued_node() {
    let (started, mut starts) = tokio::sync::mpsc::unbounded_channel();
    let gates: Vec<_> = (0..3).map(|_| Arc::new(Semaphore::new(0))).collect();
    let finished = Arc::new(AtomicUsize::new(0));
    let graph = make_graph(
        ["a", "b", "queued"]
            .iter()
            .zip(&gates)
            .map(|(key, release)| {
                Node::new(
                    NodeId::new(*key),
                    GatedStep {
                        started: started.clone(),
                        release: release.clone(),
                        finished: finished.clone(),
                    },
                )
            })
            .collect(),
        vec![],
        "b",
    );
    let log = Arc::new(ControlledLog::new(
        Some("node_completed"),
        Some("node_completed"),
    ));
    let recording = log.clone();
    let run = tokio::spawn(async move {
        scheduler(2)
            .run(
                &graph,
                input(&["a", "b", "queued"]),
                context("root", recording),
            )
            .await
    });
    assert_eq!(starts.recv().await.as_deref(), Some("a"));
    assert_eq!(starts.recv().await.as_deref(), Some("b"));
    gates[0].add_permits(1);
    log.reached.notified().await;
    log.release.add_permits(1);
    log.failed.notified().await;
    assert!(!run.is_finished());
    assert!(starts.try_recv().is_err());
    gates[1].add_permits(1);
    assert!(matches!(
        run.await.unwrap(),
        Err(Error::EventLog(EventLogError::Append { .. }))
    ));
    assert_eq!(finished.load(Ordering::SeqCst), 2);
    assert!(starts.try_recv().is_err());
    let events = log.events("root", 0).await.unwrap();
    assert_eq!(
        events.iter().map(|event| event.kind()).collect::<Vec<_>>(),
        [
            "run_started",
            "run_initialized",
            "node_started",
            "node_started"
        ]
    );
}

#[tokio::test]
async fn startup_business_errors_record_their_terminal_reason() {
    let calls = Arc::new(AtomicUsize::new(0));
    let graph = Graph::<Data, ()>::build_with_initializer(
        vec![Node::new(NodeId::new("one"), Step::new(&calls))],
        vec![],
        vec![],
        NodeId::new("one"),
        |_, _| async {
            Err(Error::execution(std::io::Error::other(
                "initialization failed",
            )))
        },
    )
    .unwrap();
    for (run_id, inputs, kind) in [
        (
            "invalid",
            input(&["wrong"]),
            TerminalFailure::Input {
                missing: vec![NodeId::new("one")],
                unexpected: vec![NodeId::new("wrong")],
            },
        ),
        (
            "initializer",
            input(&["one"]),
            TerminalFailure::Initialization,
        ),
    ] {
        let log = Arc::new(InMemoryEventLog::new());
        assert!(
            scheduler(1)
                .run(&graph, inputs, context(run_id, log.clone()))
                .await
                .is_err()
        );
        let events = log.events(run_id, 0).await.unwrap();
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].kind(), "run_started");
        assert_eq!(
            events[1].data(),
            &EventData::RunFailed { reason: Some(kind) }
        );
    }
    assert_eq!(calls.load(Ordering::SeqCst), 0);
}

struct HandlesChildFailure(Graph<Data, ()>);
impl NodeInstance<Data> for HandlesChildFailure {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        assert!(matches!(
            ctx.call(
                "child",
                &self.0,
                input(&["leaf"]),
                ctx.run.resources().clone(),
                scheduler.clone()
            )
            .await,
            Err(Error::EventLog(_))
        ));
        assert!(matches!(
            ctx.call(
                "another",
                &self.0,
                input(&["leaf"]),
                ctx.run.resources().clone(),
                scheduler
            )
            .await,
            Err(Error::EventLog(_))
        ));
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn handled_child_recording_failure_still_stops_parent_and_future_children() {
    let calls = Arc::new(AtomicUsize::new(0));
    let child = make_graph(
        vec![Node::new(NodeId::new("leaf"), Step::new(&calls))],
        vec![],
        "leaf",
    );
    let graph = make_graph(
        vec![Node::new(NodeId::new("parent"), HandlesChildFailure(child))],
        vec![],
        "parent",
    );
    let mut log = ControlledLog::new(Some("node_completed"), None);
    log.child_only = true;
    let log = Arc::new(log);
    assert!(matches!(
        scheduler(1)
            .run(&graph, input(&["parent"]), context("root", log.clone()))
            .await,
        Err(Error::EventLog(_))
    ));
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        log.events("root", 0)
            .await
            .unwrap()
            .iter()
            .map(|event| event.kind())
            .collect::<Vec<_>>(),
        [
            "run_started",
            "run_initialized",
            "node_started",
            "call_linked"
        ]
    );
}
