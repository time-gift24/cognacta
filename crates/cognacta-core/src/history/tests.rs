use super::codec;
use crate::*;
use std::{
    collections::{HashMap, HashSet},
    sync::{
        Mutex, OnceLock, Weak,
        atomic::{AtomicUsize, Ordering},
    },
};

#[derive(Default, serde::Serialize, serde::Deserialize, State)]
struct Counter {
    #[reducer(Add)]
    total: u64,
    #[reducer(Append)]
    order: Vec<String>,
}

#[derive(Default)]
struct Counts {
    bodies: Mutex<HashMap<String, usize>>,
    initializers: Mutex<HashMap<String, usize>>,
}
impl Counts {
    fn body(&self, run_id: &str) {
        *self
            .bodies
            .lock()
            .unwrap()
            .entry(run_id.into())
            .or_default() += 1;
    }
    fn initialized(&self, run_id: &str) {
        *self
            .initializers
            .lock()
            .unwrap()
            .entry(run_id.into())
            .or_default() += 1;
    }
    fn body_count(&self) -> usize {
        self.bodies.lock().unwrap().values().sum()
    }
}

fn scheduler(k: usize) -> Arc<dyn Scheduler> {
    Arc::new(LocalScheduler::new(SchedulerConfig::new(k, 12).unwrap()))
}
fn input(entries: &[(&str, Vec<SharedValue>)]) -> GraphInput {
    GraphInput::new(
        entries
            .iter()
            .map(|(id, values)| (NodeId::new(*id), Input::new(values.clone())))
            .collect(),
    )
}
fn copy(event: &Event) -> Event {
    serde_json::from_slice(&serde_json::to_vec(event).unwrap()).unwrap()
}

struct CaptureLog {
    inner: InMemoryEventLog,
    order: Mutex<Vec<Arc<Event>>>,
    writes: AtomicUsize,
    fail_at: usize,
    save_before_error: bool,
}
impl CaptureLog {
    fn new(fail_at: usize, save_before_error: bool) -> Self {
        Self {
            inner: InMemoryEventLog::new(),
            order: Mutex::new(Vec::new()),
            writes: AtomicUsize::new(0),
            fail_at,
            save_before_error,
        }
    }
    fn failure() -> Error {
        EventLogError::Append {
            source: Box::new(std::io::Error::other("injected interruption")),
        }
        .into()
    }
}
impl EventLog for CaptureLog {
    async fn append(&self, event: Event) -> Result<(), Error> {
        let fail = self.writes.fetch_add(1, Ordering::SeqCst) + 1 == self.fail_at;
        if fail && !self.save_before_error {
            return Err(Self::failure());
        }
        let retained = Arc::new(copy(&event));
        self.inner.append(event).await?;
        self.order.lock().unwrap().push(retained);
        if fail { Err(Self::failure()) } else { Ok(()) }
    }
    async fn events(&self, id: &str, after: u64) -> Result<Vec<Arc<Event>>, Error> {
        self.inner.events(id, after).await
    }
    async fn all_events(&self) -> Result<Vec<Arc<Event>>, Error> {
        self.inner.all_events().await
    }
}

struct Producer {
    amount: u64,
    deliver: bool,
}
impl NodeInstance<Counter, Counts> for Producer {
    type Output = u64;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Counter, Counts>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Counter, u64>, Error> {
        ctx.run.resources().body(ctx.run.run_id());
        Ok(Outcome {
            value: Some(Arc::new(self.amount)),
            state_delta: CounterDelta {
                total: Some(self.amount),
                order: Some(vec![ctx.key.to_string()]),
            },
            directive: self.deliver.then(|| {
                Directive::Deliver(vec![DeliverTarget {
                    template: NodeId::new("worker"),
                    key: "job".into(),
                    payload: Arc::new(serde_json::json!(10_u64)),
                }])
            }),
        })
    }
}
struct Worker;
impl NodeInstance<Counter, Counts> for Worker {
    type Output = u64;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Counter, Counts>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Counter, u64>, Error> {
        ctx.run.resources().body(ctx.run.run_id());
        let amount: u64 = serde_json::from_value(input.values()[0].value.as_ref().clone())
            .map_err(|source| InputError::Decode { source })?;
        Ok(Outcome {
            value: Some(Arc::new(amount)),
            state_delta: CounterDelta {
                total: Some(amount),
                order: Some(vec![ctx.key.to_string()]),
            },
            directive: None,
        })
    }
}
struct Report;
impl NodeInstance<Counter, Counts> for Report {
    type Output = u64;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Counter, Counts>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Counter, u64>, Error> {
        ctx.run.resources().body(ctx.run.run_id());
        Ok(Outcome {
            value: Some(Arc::new(ctx.state.total)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
fn graph() -> Graph<Counter, u64, Counts> {
    Graph::build_with_initializer(
        vec![
            Node::new(
                NodeId::new("a"),
                Producer {
                    amount: 1,
                    deliver: true,
                },
            ),
            Node::new(
                NodeId::new("b"),
                Producer {
                    amount: 2,
                    deliver: false,
                },
            ),
            Node::new(NodeId::new("worker"), Worker).template(true),
            Node::new(NodeId::new("report"), Report),
        ],
        vec![
            Edge {
                source: NodeId::new("a"),
                target: NodeId::new("report"),
                when: None,
            },
            Edge {
                source: NodeId::new("worker"),
                target: NodeId::new("report"),
                when: None,
            },
        ],
        vec![NodeId::new("a"), NodeId::new("b")],
        NodeId::new("report"),
        |_, ctx| async move {
            ctx.resources().initialized(ctx.run_id());
            Ok(Counter::default())
        },
    )
    .unwrap()
}
fn snapshot(run: &Run<Counter, u64>) -> serde_json::Value {
    let nodes: serde_json::Map<String, serde_json::Value> = run.nodes.iter().map(|(key, node)| {
        (key.to_string(), serde_json::json!({"status": format!("{:?}", node.status()), "attempts": node.attempts(), "input": node.input(), "output": node.output()}))
    }).collect();
    serde_json::json!({"state": run.state(), "nodes": nodes, "waves": run.waves(), "failures": run.failures(), "output": run.final_output(), "status": format!("{:?}", run.status())})
}

#[tokio::test]
async fn every_wave_prefix_replays_and_resumes_without_lost_or_duplicate_deltas() {
    let graph = graph();
    let log = Arc::new(InMemoryEventLog::new());
    let counts = Arc::new(Counts::default());
    let live = scheduler(2)
        .run(
            &graph,
            input(&[("a", vec![]), ("b", vec![])]),
            RunContext::root("root".into(), 4, counts.clone()).with_event_log(log.clone()),
        )
        .await
        .unwrap();
    assert_eq!(
        (live.state().total, **live.final_output().unwrap()),
        (13, 13)
    );
    assert_eq!(live.state().order, ["a", "b", "worker[job]"]);
    let expected = snapshot(&live);
    let events = log.events("root", 0).await.unwrap();
    for end in 1..=events.len() {
        let prefix = &events[..end];
        let before = counts.body_count();
        let restored = replay(&graph, prefix).unwrap();
        assert_eq!(
            counts.body_count(),
            before,
            "replay must not execute bodies"
        );
        assert_eq!(restored.last_seq().get(), end as u64);
        if let Some(run) = restored.run() {
            let expected_total = prefix
                .iter()
                .filter_map(|event| match event.data() {
                    EventData::StateDelta { outcomes, .. } => Some(outcomes),
                    _ => None,
                })
                .flatten()
                .map(|node| match node.key.to_string().as_str() {
                    "a" => 1,
                    "b" => 2,
                    "worker[job]" => 10,
                    _ => 0,
                })
                .sum::<u64>();
            assert_eq!(run.state().total, expected_total, "prefix {end}");
        }
        let resumed_log = Arc::new(InMemoryEventLog::new());
        for event in prefix {
            resumed_log.append(copy(event)).await.unwrap();
        }
        let history = History::new(resumed_log.clone());
        let resources = Arc::new(Counts::default());
        if restored.is_terminal() {
            assert_eq!(snapshot(restored.run().unwrap()), expected);
            assert!(matches!(
                scheduler(1)
                    .resume(&graph, "root", history, resources)
                    .await,
                Err(Error::History(HistoryError::TerminalRun { .. }))
            ));
            continue;
        }
        let run = scheduler(1)
            .resume(&graph, "root", history, resources.clone())
            .await
            .unwrap();
        assert_eq!(snapshot(&run), expected, "resume prefix {end}");
        let completed = prefix
            .iter()
            .filter(|event| matches!(event.data(), EventData::NodeCompleted { .. }))
            .count();
        assert_eq!(
            resources.body_count(),
            4 - completed,
            "known results must not execute again"
        );
        let after = resumed_log.events("root", 0).await.unwrap();
        assert_eq!(&after[..end], prefix);
        assert_eq!(
            snapshot(replay(&graph, &after).unwrap().run().unwrap()),
            expected
        );
    }
}

#[tokio::test]
async fn every_append_failure_including_lost_acknowledgement_can_continue_from_actual_history() {
    let graph = graph();
    let complete = Arc::new(InMemoryEventLog::new());
    let expected = scheduler(1)
        .run(
            &graph,
            input(&[("a", vec![]), ("b", vec![])]),
            RunContext::root("root".into(), 4, Arc::new(Counts::default()))
                .with_event_log(complete.clone()),
        )
        .await
        .unwrap();
    let count = complete.events("root", 0).await.unwrap().len();
    for save in [false, true] {
        for failed in 1..=count {
            let log = Arc::new(CaptureLog::new(failed, save));
            let resources = Arc::new(Counts::default());
            let context =
                RunContext::root("root".into(), 4, resources.clone()).with_event_log(log.clone());
            let history = context.history();
            assert!(matches!(
                scheduler(1)
                    .run(&graph, input(&[("a", vec![]), ("b", vec![])]), context)
                    .await,
                Err(Error::EventLog(_))
            ));
            let events = log.events("root", 0).await.unwrap();
            let run = if events.is_empty() {
                scheduler(1)
                    .run(
                        &graph,
                        input(&[("a", vec![]), ("b", vec![])]),
                        RunContext::root("root".into(), 4, resources).with_event_log(log),
                    )
                    .await
                    .unwrap()
            } else {
                let restored = replay(&graph, &events).unwrap();
                if restored.is_terminal() {
                    restored.into_run().unwrap()
                } else {
                    scheduler(1)
                        .resume(&graph, "root", history, resources)
                        .await
                        .unwrap()
                }
            };
            assert_eq!(
                snapshot(&run),
                snapshot(&expected),
                "append {failed}, saved {save}"
            );
        }
    }
}

type RecursiveGraph = Graph<Counter, u64, Counts>;
struct Recursive(Arc<OnceLock<Weak<RecursiveGraph>>>);
impl NodeInstance<Counter, Counts> for Recursive {
    type Output = u64;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Counter, Counts>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Counter, u64>, Error> {
        ctx.run.resources().body(ctx.run.run_id());
        let depth = serde_json::from_value::<u64>(input.entry()?.clone())
            .map_err(|source| cognacta_core::InputError::Decode { source })?;
        let nested = if depth == 0 {
            0
        } else {
            let graph = self.0.get().unwrap().upgrade().unwrap();
            *ctx.call(
                "descend",
                graph.as_ref(),
                crate::graph_input! { step: serde_json::json!(depth - 1) },
                ctx.run.resources().clone(),
                scheduler,
            )
            .await?
        };
        Ok(Outcome {
            value: Some(Arc::new(ctx.state.total + nested)),
            state_delta: CounterDelta {
                total: Some(1),
                order: None,
            },
            directive: None,
        })
    }
}
fn recursive_graph() -> Arc<RecursiveGraph> {
    let binding = Arc::new(OnceLock::new());
    let graph = Arc::new(
        Graph::build_with_initializer(
            vec![Node::new(NodeId::new("step"), Recursive(binding.clone()))],
            vec![],
            vec![],
            NodeId::new("step"),
            |input, ctx| async move {
                ctx.resources().initialized(ctx.run_id());
                Ok(Counter {
                    total: serde_json::from_value(
                        input.entry(&NodeId::new("step"))?.entry()?.clone(),
                    )
                    .map_err(|source| InputError::Decode { source })?,
                    order: vec![],
                })
            },
        )
        .unwrap(),
    );
    binding.set(Arc::downgrade(&graph)).ok().unwrap();
    graph
}

#[tokio::test]
async fn recursive_call_links_survive_every_cross_run_prefix() {
    let graph = recursive_graph();
    let baseline = Arc::new(CaptureLog::new(usize::MAX, false));
    let result = scheduler(1)
        .run(
            graph.as_ref(),
            crate::graph_input! { step: serde_json::json!(3_u64) },
            RunContext::root("recursive".into(), 4, Arc::new(Counts::default()))
                .with_event_log(baseline.clone()),
        )
        .await
        .unwrap();
    assert_eq!(**result.final_output().unwrap(), 6);
    assert_eq!(result.state().total, 4);
    let events = baseline.order.lock().unwrap().clone();
    let leaf_id = events
        .iter()
        .find_map(|event| {
            matches!(event.data(), EventData::RunStarted { depth: 3, .. })
                .then(|| event.run_id().to_owned())
        })
        .unwrap();
    for end in 1..events.len() {
        let log = Arc::new(InMemoryEventLog::new());
        for event in &events[..end] {
            log.append(copy(event)).await.unwrap();
        }
        let counts = Arc::new(Counts::default());
        let run = scheduler(2)
            .resume(
                graph.as_ref(),
                "recursive",
                History::new(log.clone()),
                counts.clone(),
            )
            .await
            .unwrap();
        assert_eq!(
            (run.state().total, **run.final_output().unwrap()),
            (4, 6),
            "prefix {end}"
        );
        let all = log.all_events().await.unwrap();
        let starts = all
            .iter()
            .filter(|event| event.kind() == "run_started")
            .collect::<Vec<_>>();
        assert_eq!(
            starts.len(),
            4,
            "one Run per recursive call at prefix {end}"
        );
        assert_eq!(
            starts
                .iter()
                .map(|event| event.run_id())
                .collect::<HashSet<_>>()
                .len(),
            4
        );
        for event in &events[..end] {
            if let EventData::CallLinked { call } = event.data() {
                assert!(
                    starts
                        .iter()
                        .any(|start| start.run_id() == call.child_run_id)
                );
            }
            if matches!(event.data(), EventData::RunInitialized { .. }) {
                assert!(
                    !counts
                        .initializers
                        .lock()
                        .unwrap()
                        .contains_key(event.run_id()),
                    "initialized Run must not initialize again"
                );
            }
        }
        if events[..end]
            .iter()
            .any(|event| event.run_id() == leaf_id && event.kind() == "node_completed")
        {
            assert!(
                !counts.bodies.lock().unwrap().contains_key(&leaf_id),
                "completed leaf must be reused"
            );
        }
        for start in starts {
            let stream = log.events(start.run_id(), 0).await.unwrap();
            assert!(replay(graph.as_ref(), &stream).unwrap().is_terminal());
            assert_eq!(
                stream
                    .iter()
                    .filter(|event| event.kind() == "node_started")
                    .count(),
                1
            );
        }
    }
}

#[tokio::test]
async fn malformed_references_and_json_values_fail_before_projection() {
    let graph = graph();
    let log = Arc::new(InMemoryEventLog::new());
    scheduler(1)
        .run(
            &graph,
            input(&[("a", vec![]), ("b", vec![])]),
            RunContext::root("root".into(), 4, Arc::new(Counts::default()))
                .with_event_log(log.clone()),
        )
        .await
        .unwrap();
    let events = log.events("root", 0).await.unwrap();
    let mut legacy = serde_json::to_value(&events[0]).unwrap();
    legacy["data"]["format"] = serde_json::json!(1);
    assert!(matches!(
        replay(&graph, &[Arc::new(serde_json::from_value(legacy).unwrap())]),
        Err(Error::History(HistoryError::UnsupportedFormat { found: 1 }))
    ));
    let position = events
        .iter()
        .position(|event| event.kind() == "state_delta")
        .unwrap();
    let mut prefix = events[..=position].to_vec();
    let mut wire = serde_json::to_value(prefix.last().unwrap()).unwrap();
    wire["data"]["outcomes"].as_array_mut().unwrap().pop();
    prefix[position] = Arc::new(serde_json::from_value(wire).unwrap());
    assert!(matches!(
        replay(&graph, &prefix),
        Err(Error::History(HistoryError::Invalid {
            reason: HistoryViolation::ResultReference,
            ..
        }))
    ));
    let malformed = serde_json::json!("not a number");
    assert!(matches!(
        codec::decode::<u64>(malformed),
        Err(Error::EventLog(EventLogError::Decode { .. }))
    ));
}

#[derive(Clone, Copy)]
enum FailureMode {
    Node,
    Merge,
    Control,
}
struct FailingProducer(FailureMode);
impl NodeInstance<Counter, Counts> for FailingProducer {
    type Output = u64;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Counter, Counts>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Counter, u64>, Error> {
        ctx.run.resources().body(ctx.run.run_id());
        if matches!(self.0, FailureMode::Node) {
            return Err(Error::execution(std::io::Error::other("node failure")));
        }
        Ok(Outcome {
            value: Some(Arc::new(2)),
            state_delta: CounterDelta {
                total: Some(2),
                order: Some(vec!["b".into()]),
            },
            directive: matches!(self.0, FailureMode::Control).then(|| Directive::Transition {
                target: NodeId::new("missing"),
                payload: None,
                immediate: true,
            }),
        })
    }
}

#[tokio::test]
async fn failure_prefixes_preserve_atomic_state_and_suppress_the_entire_control_batch() {
    for mode in [FailureMode::Node, FailureMode::Merge, FailureMode::Control] {
        let graph: Graph<Counter, u64, Counts> = Graph::build_with_initializer(
            vec![
                Node::new(
                    NodeId::new("a"),
                    Producer {
                        amount: 1,
                        deliver: true,
                    },
                ),
                Node::new(NodeId::new("b"), FailingProducer(mode)),
                Node::new(NodeId::new("worker"), Worker).template(true),
            ],
            vec![],
            vec![NodeId::new("a"), NodeId::new("b")],
            NodeId::new("a"),
            move |_, _| async move {
                Ok(Counter {
                    total: if matches!(mode, FailureMode::Merge) {
                        u64::MAX
                    } else {
                        0
                    },
                    order: vec![],
                })
            },
        )
        .unwrap();
        let log = Arc::new(InMemoryEventLog::new());
        let live = scheduler(2)
            .run(
                &graph,
                input(&[("a", vec![]), ("b", vec![])]),
                RunContext::root("failed".into(), 2, Arc::new(Counts::default()))
                    .with_event_log(log.clone()),
            )
            .await
            .unwrap();
        assert_eq!(live.status(), RunStatus::Failed);
        let total = match mode {
            FailureMode::Node => 1,
            FailureMode::Merge => u64::MAX,
            FailureMode::Control => 3,
        };
        assert_eq!(live.state().total, total);
        assert!(live.instances(&NodeId::new("worker")).is_empty());
        assert!(matches!(
            (&live.failures()[0].cause, mode),
            (FailureCause::Node { .. }, FailureMode::Node)
                | (
                    FailureCause::Merge {
                        reason: MergeFailureKind::Overflow,
                        ..
                    },
                    FailureMode::Merge
                )
                | (
                    FailureCause::Control {
                        reason: ControlFailureKind::UnknownTarget,
                        ..
                    },
                    FailureMode::Control
                )
        ));
        if matches!(mode, FailureMode::Merge) {
            assert!(
                live.state().order.is_empty(),
                "no field may be partially committed"
            );
        }
        let expected = snapshot(&live);
        let events = log.events("failed", 0).await.unwrap();
        for end in 1..=events.len() {
            let prefix = &events[..end];
            let restored = replay(&graph, prefix).unwrap();
            if restored.is_terminal() {
                assert_eq!(snapshot(restored.run().unwrap()), expected);
                continue;
            }
            let resumed_log = Arc::new(InMemoryEventLog::new());
            for event in prefix {
                resumed_log.append(copy(event)).await.unwrap();
            }
            let resumed = scheduler(1)
                .resume(
                    &graph,
                    "failed",
                    History::new(resumed_log.clone()),
                    Arc::new(Counts::default()),
                )
                .await
                .unwrap();
            assert_eq!(snapshot(&resumed), expected, "failure prefix {end}");
            let all = resumed_log.events("failed", 0).await.unwrap();
            assert_eq!(
                all.iter()
                    .filter(|e| matches!(e.data(), EventData::StateDelta { .. }))
                    .count(),
                1
            );
            assert_eq!(
                all.iter()
                    .filter(|e| matches!(e.data(), EventData::Control { .. }))
                    .count(),
                1
            );
            assert_eq!(
                snapshot(replay(&graph, &all).unwrap().run().unwrap()),
                expected
            );
        }
    }
}

#[derive(Default)]
struct OnlySendReducer;
impl Reducer<u32> for OnlySendReducer {
    type Delta = std::cell::Cell<u32>;
    const POLICY: WritePolicy = WritePolicy::SingleWriter;
    fn reduce(&mut self, current: &u32, delta: Self::Delta) -> Result<u32, Error> {
        Ok(current + delta.get())
    }
    fn finish(self, value: u32) -> Result<u32, Error> {
        Ok(value)
    }
}
#[derive(Default, serde::Serialize, serde::Deserialize, State)]
struct OnlySendState {
    #[reducer(OnlySendReducer)]
    count: u32,
}
#[derive(serde::Serialize, serde::Deserialize)]
struct NonCloneOutput(u32);
struct OnlySendNode;
impl NodeInstance<OnlySendState, AtomicUsize> for OnlySendNode {
    type Output = NonCloneOutput;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<OnlySendState, AtomicUsize>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<OnlySendState, NonCloneOutput>, Error> {
        ctx.run.resources().fetch_add(1, Ordering::SeqCst);
        Ok(Outcome {
            value: Some(Arc::new(NonCloneOutput(7))),
            state_delta: OnlySendStateDelta {
                count: Some(std::cell::Cell::new(7)),
            },
            directive: None,
        })
    }
}
#[tokio::test]
async fn recovery_does_not_require_sync_delta_or_clone_state_and_output() {
    let graph: Graph<OnlySendState, NonCloneOutput, AtomicUsize> = Graph::build(
        vec![Node::new(NodeId::new("a"), OnlySendNode)],
        vec![],
        vec![],
        NodeId::new("a"),
    )
    .unwrap();
    let log = Arc::new(InMemoryEventLog::new());
    let count = Arc::new(AtomicUsize::new(0));
    let live = scheduler(1)
        .run(
            &graph,
            input(&[("a", vec![])]),
            RunContext::root("send".into(), 1, count.clone()).with_event_log(log.clone()),
        )
        .await
        .unwrap();
    assert_eq!(live.state().count, 7);
    let events = log.events("send", 0).await.unwrap();
    let prefix = events
        .iter()
        .take_while(|event| !matches!(event.data(), EventData::StateDelta { .. }));
    let resumed_log = Arc::new(InMemoryEventLog::new());
    for event in prefix {
        resumed_log.append(copy(event)).await.unwrap();
    }
    let resumed = scheduler(1)
        .resume(&graph, "send", History::new(resumed_log), count.clone())
        .await
        .unwrap();
    assert_eq!(resumed.state().count, 7);
    assert_eq!(resumed.final_output().unwrap().0, 7);
    assert_eq!(count.load(Ordering::SeqCst), 1);
    assert_eq!(
        replay(&graph, &events)
            .unwrap()
            .run()
            .unwrap()
            .state()
            .count,
        7
    );
}
