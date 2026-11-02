use crate::*;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};
use tracing::{
    Subscriber,
    field::{Field, Visit},
};
use tracing_subscriber::{
    Layer,
    layer::{Context, SubscriberExt},
    registry::LookupSpan,
};

#[derive(Default)]
struct Fields(HashMap<String, String>);
impl Visit for Fields {
    fn record_debug(&mut self, field: &Field, value: &dyn std::fmt::Debug) {
        self.0.insert(field.name().into(), format!("{value:?}"));
    }
    fn record_str(&mut self, field: &Field, value: &str) {
        self.0.insert(field.name().into(), value.into());
    }
}
type EventRecord = (tracing::Level, HashMap<String, String>);
#[derive(Clone, Default)]
struct Recorder(Arc<Mutex<Vec<EventRecord>>>);
impl<S: Subscriber + for<'a> LookupSpan<'a>> Layer<S> for Recorder {
    fn on_new_span(
        &self,
        attrs: &tracing::span::Attributes<'_>,
        id: &tracing::Id,
        ctx: Context<'_, S>,
    ) {
        let mut fields = Fields::default();
        attrs.record(&mut fields);
        ctx.span(id).unwrap().extensions_mut().insert(fields);
    }
    fn on_event(&self, event: &tracing::Event<'_>, ctx: Context<'_, S>) {
        let mut fields = Fields::default();
        if let Some(scope) = ctx.event_scope(event) {
            for span in scope.from_root() {
                if let Some(values) = span.extensions().get::<Fields>() {
                    fields.0.extend(values.0.clone());
                }
            }
        }
        event.record(&mut fields);
        self.0
            .lock()
            .unwrap()
            .push((*event.metadata().level(), fields.0));
    }
}
#[derive(Default, State)]
struct Empty {}
struct Task {
    panic: bool,
}
impl NodeInstance<Empty> for Task {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Empty>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Empty, ()>, Error> {
        assert!(!self.panic, "private node panic");
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
fn input() -> GraphInput {
    GraphInput::new(HashMap::from([(
        NodeId::new("entry"),
        Input::new(vec![Arc::new("secret-input")]),
    )]))
}
fn context(id: &str) -> RunContext<()> {
    RunContext::root(id.into(), 2, Arc::new(()))
}
fn local() -> Arc<dyn Scheduler> {
    Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 2).unwrap()))
}
fn events(recorder: &Recorder, id: &str) -> Vec<(tracing::Level, String)> {
    recorder
        .0
        .lock()
        .unwrap()
        .iter()
        .filter(|(_, fields)| fields.get("run_id").is_some_and(|value| value == id))
        .map(|(level, fields)| (*level, fields["event"].clone()))
        .collect()
}
fn graph(panic: bool) -> Graph<Empty, ()> {
    Graph::build(
        vec![Node::new(NodeId::new("entry"), Task { panic })],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap()
}

#[test]
fn lifecycle_covers_initialization_and_distinguishes_unpolled_cancel_and_expected_errors() {
    let recorder = Recorder::default();
    let subscriber = tracing_subscriber::registry().with(recorder.clone());
    tracing::subscriber::with_default(subscriber, || {
        let rt = tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap();
        rt.block_on(async {
            let local = local(); let graph = graph(false);
            drop(local.clone().run(&graph, input(), context("unpolled")));
            let run = local.clone().run(&graph, input(), context("completed")).await.unwrap();
            run.into_result().unwrap();
            let failure = local.clone().run(&graph, GraphInput::new(HashMap::new()), context("input-error")).await;
            assert!(failure.is_err()); drop(failure);
            let started = Arc::new(tokio::sync::Notify::new());
            let notified = started.clone();
            let pending = Graph::<Empty, ()>::build_with_initializer(vec![Node::new(NodeId::new("entry"), Task { panic: false })], vec![], vec![], NodeId::new("entry"), move |_, _| {
                let notified = notified.clone(); async move { notified.notify_one(); std::future::pending::<Result<Empty, Error>>().await }
            }).unwrap();
            let mut future = Box::pin(local.clone().run(&pending, input(), context("cancelled")));
            tokio::select! { biased; _ = &mut future => panic!("unexpected completion"), _ = started.notified() => {} }
            drop(future);
            let failure = Graph::<Empty, ()>::build_with_initializer(vec![Node::new(NodeId::new("entry"), Task { panic: true })], vec![], vec![], NodeId::new("entry"), |_, _| async { Err(Error::execution(std::io::Error::other("secret-source"))) }).unwrap();
            assert!(local.clone().run(&failure, input(), context("init-error")).await.is_err());
            let start = Arc::new(tokio::sync::Notify::new()); let release = Arc::new(tokio::sync::Notify::new());
            let (notify, proceed) = (start.clone(), release.clone());
            let delayed = Graph::<Empty, ()>::build_with_initializer(vec![Node::new(NodeId::new("entry"), Task { panic: false })], vec![], vec![], NodeId::new("entry"), move |_, _| {
                let (notify, proceed) = (notify.clone(), proceed.clone()); async move { notify.notify_one(); proceed.notified().await; Ok(Empty {}) }
            }).unwrap();
            let mut future = Box::pin(local.clone().run(&delayed, input(), context("delayed")));
            tokio::select! { biased; _ = &mut future => panic!("unexpected completion"), _ = start.notified() => {} }
            // Timing is measured only after initialization has definitely started.
            std::thread::sleep(Duration::from_millis(10)); release.notify_one(); future.await.unwrap().into_result().unwrap();
            let unsafe_id = format!("control\n{}", "x".repeat(400));
            local.clone().run(&graph, input(), context(&unsafe_id)).await.unwrap().into_result().unwrap();
            let parent = RunContext::root("limit".into(), 0, Arc::new(()));
            assert!(graph.run(&Input::new(vec![Arc::new(input())]), NodeContext { state: Arc::new(Empty {}), run: parent, key: NodeKey::Instance { template: NodeId::new("worker\n"), key: "x\r".into() } }, local.clone()).await.is_err());
        });
    });
    assert!(events(&recorder, "unpolled").is_empty());
    for (id, last, level) in [
        ("completed", "run_completed", tracing::Level::DEBUG),
        ("cancelled", "run_cancelled", tracing::Level::DEBUG),
        ("input-error", "run_failed", tracing::Level::WARN),
        ("init-error", "run_failed", tracing::Level::WARN),
        ("delayed", "run_completed", tracing::Level::DEBUG),
    ] {
        assert_eq!(
            events(&recorder, id),
            [
                (tracing::Level::DEBUG, "run_started".into()),
                (level, last.into())
            ]
        );
    }
    let recorded = recorder.0.lock().unwrap();
    let elapsed = recorded
        .iter()
        .find(|(_, fields)| {
            fields.get("run_id").is_some_and(|id| id == "delayed")
                && fields["event"] == "run_completed"
        })
        .unwrap()
        .1["elapsed_ms"]
        .parse::<f64>()
        .unwrap();
    assert!(elapsed >= 10.0);
    assert_eq!(events_from_records(&recorded, "limit"), ["depth_rejected"]);
    for (_, fields) in recorded.iter() {
        if let Some(id) = fields.get("run_id") {
            assert!(!id.contains('\n'));
            assert!(id.len() <= 256);
        }
        for value in fields.values() {
            assert!(!value.contains("secret-input"));
            assert!(!value.contains("secret-source"));
        }
    }
    assert!(recorded.iter().any(|(_, fields)| {
        fields
            .get("phase")
            .is_some_and(|phase| phase == "initialization")
    }));
}
fn events_from_records(
    records: &[(tracing::Level, HashMap<String, String>)],
    id: &str,
) -> Vec<String> {
    records
        .iter()
        .filter(|(_, fields)| fields.get("run_id").is_some_and(|value| value == id))
        .map(|(_, fields)| fields["event"].clone())
        .collect()
}

fn nested_input() -> GraphInput {
    GraphInput::new(HashMap::from([(
        NodeId::new("entry"),
        Input::new(vec![Arc::new(input())]),
    )]))
}
fn panic_initializer() -> Graph<Empty, ()> {
    Graph::build_with_initializer(
        vec![Node::new(NodeId::new("entry"), Task { panic: false })],
        vec![],
        vec![],
        NodeId::new("entry"),
        |_, _| async { panic!("private init panic") },
    )
    .unwrap()
}
#[test]
fn panic_unwind_is_not_cancel_and_task_panics_fail_only_the_containing_run() {
    let recorder = Recorder::default();
    tracing::subscriber::with_default(
        tracing_subscriber::registry().with(recorder.clone()),
        || {
            let caught = std::panic::catch_unwind(|| {
                let runtime = tokio::runtime::Builder::new_current_thread()
                    .build()
                    .unwrap();
                runtime.block_on(local().run(&panic_initializer(), input(), context("root-panic")))
            });
            assert!(caught.is_err());
            let runtime = tokio::runtime::Builder::new_current_thread()
                .build()
                .unwrap();
            runtime.block_on(async {
            let failed = local().run(&graph(true), input(), context("node-panic")).await.unwrap();
            assert!(matches!(failed.errors(), [RunError::Node { source: Error::Node(NodeError::Task(source)), .. }] if source.downcast_ref::<tokio::task::JoinError>().is_some()));
            drop(failed);
            let parent = Graph::<Empty, ()>::build(vec![Node::new(NodeId::new("entry"), panic_initializer())], vec![], vec![], NodeId::new("entry")).unwrap();
            let failed = local().run(&parent, nested_input(), context("parent")).await.unwrap();
            assert!(matches!(failed.into_result(), Err(Error::Call(CallError::Execution { .. }))));
        });
        },
    );
    assert_eq!(
        events(&recorder, "root-panic"),
        [(tracing::Level::DEBUG, "run_started".into())]
    );
    for id in ["node-panic", "parent"] {
        assert_eq!(
            events(&recorder, id),
            [
                (tracing::Level::DEBUG, "run_started".into()),
                (tracing::Level::WARN, "run_failed".into())
            ]
        );
    }
    let child = recorder
        .0
        .lock()
        .unwrap()
        .iter()
        .find(|(_, fields)| fields.get("parent_run_id").is_some_and(|id| id == "parent"))
        .unwrap()
        .1["run_id"]
        .clone();
    assert_eq!(
        events(&recorder, &child),
        [(tracing::Level::DEBUG, "run_started".into())]
    );
}

#[test]
fn warning_identity_survives_filtering_out_the_debug_span() {
    let recorder = Recorder::default();
    let subscriber = tracing_subscriber::registry()
        .with(recorder.clone())
        .with(tracing_subscriber::filter::LevelFilter::WARN);
    tracing::subscriber::with_default(subscriber, || {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap();
        let run = runtime
            .block_on(local().run(&graph(true), input(), context("filtered")))
            .unwrap();
        assert!(matches!(run.errors(), [RunError::Node { .. }]));
        assert!(matches!(
            run.into_result(),
            Err(Error::Call(CallError::Execution { .. }))
        ));
    });
    assert_eq!(
        events(&recorder, "filtered"),
        [(tracing::Level::WARN, "run_failed".into())]
    );
}

#[test]
fn scoped_subscriber_follows_child_runs_on_worker_threads() {
    use tracing::instrument::WithSubscriber;

    let runtime = tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .build()
        .unwrap();
    for (id, child, child_end, parent_end) in [
        (
            "success",
            graph(false),
            Some("run_completed"),
            "run_completed",
        ),
        ("node-panic", graph(true), Some("run_failed"), "run_failed"),
        ("init-panic", panic_initializer(), None, "run_failed"),
    ] {
        let recorder = Recorder::default();
        let subscriber = tracing_subscriber::registry().with(recorder.clone());
        let parent = Graph::<Empty, ()>::build(
            vec![Node::new(NodeId::new("entry"), child)],
            vec![],
            vec![],
            NodeId::new("entry"),
        )
        .unwrap();
        let result = runtime
            .block_on(
                local()
                    .run(&parent, nested_input(), context(id))
                    .with_subscriber(subscriber),
            )
            .unwrap()
            .into_result();
        assert_eq!(result.is_ok(), parent_end == "run_completed");
        let level = if result.is_ok() {
            tracing::Level::DEBUG
        } else {
            tracing::Level::WARN
        };
        assert_eq!(
            events(&recorder, id),
            [
                (tracing::Level::DEBUG, "run_started".into()),
                (level, parent_end.into()),
            ]
        );
        let child_id = recorder
            .0
            .lock()
            .unwrap()
            .iter()
            .find(|(_, fields)| {
                fields
                    .get("parent_run_id")
                    .is_some_and(|parent| parent == id)
            })
            .expect("child start is recorded by the parent's subscriber")
            .1["run_id"]
            .clone();
        let mut expected = vec![(tracing::Level::DEBUG, "run_started".into())];
        if let Some(event) = child_end {
            expected.push((level, event.into()));
        }
        assert_eq!(events(&recorder, &child_id), expected);
    }
}

#[test]
fn dropping_a_scoped_run_outside_poll_keeps_its_subscriber() {
    use tracing::instrument::WithSubscriber;

    let recorder = Recorder::default();
    let subscriber = tracing_subscriber::registry().with(recorder.clone());
    let started = Arc::new(tokio::sync::Notify::new());
    let notify = started.clone();
    let graph = Graph::<Empty, ()>::build_with_initializer(
        vec![Node::new(NodeId::new("entry"), Task { panic: false })],
        vec![],
        vec![],
        NodeId::new("entry"),
        move |_, _| {
            let notify = notify.clone();
            async move {
                notify.notify_one();
                std::future::pending().await
            }
        },
    )
    .unwrap();
    let local = local();
    let mut future = Box::pin(
        local
            .clone()
            .run(&graph, input(), context("scoped-cancel"))
            .with_subscriber(subscriber),
    );
    let runtime = tokio::runtime::Builder::new_current_thread()
        .build()
        .unwrap();
    runtime.block_on(async {
        tokio::select! {
            biased;
            _ = &mut future => panic!("pending initializer completed"),
            _ = started.notified() => {}
        }
    });
    drop(future);
    assert_eq!(
        events(&recorder, "scoped-cancel"),
        [
            (tracing::Level::DEBUG, "run_started".into()),
            (tracing::Level::DEBUG, "run_cancelled".into()),
        ]
    );
}

#[test]
fn dropping_a_five_level_run_cancels_every_started_run_and_releases_execution_handles() {
    let recorder = Recorder::default();
    let subscriber = tracing_subscriber::registry().with(recorder.clone());
    tracing::subscriber::with_default(subscriber, || {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap();
        runtime.block_on(async {
            let started = Arc::new(tokio::sync::Notify::new());
            let notify = started.clone();
            let mut graph = Graph::<Empty, ()>::build_with_initializer(
                vec![Node::new(NodeId::new("entry"), Task { panic: false })], vec![], vec![], NodeId::new("entry"),
                move |_, _| { let notify = notify.clone(); async move { notify.notify_one(); std::future::pending().await } },
            ).unwrap();
            let mut graph_input = input();
            for _ in 0..4 {
                graph = Graph::build(vec![Node::new(NodeId::new("entry"), graph)], vec![], vec![], NodeId::new("entry")).unwrap();
                graph_input = GraphInput::new(HashMap::from([(NodeId::new("entry"), Input::new(vec![Arc::new(graph_input)]))]));
            }
            let scheduler = local();
            let weak_scheduler = Arc::downgrade(&scheduler);
            let resources = Arc::new(());
            let weak_resources = Arc::downgrade(&resources);
            let mut future = Box::pin(scheduler.run(&graph, graph_input, RunContext::root("cancel-tree".into(), 4, resources)));
            tokio::select! { biased; _ = &mut future => panic!("pending leaf completed"), _ = started.notified() => {} }
            drop(future);
            // JoinSet cancellation is polled by the executor, including descendant JoinSets.
            for _ in 0..100 {
                if weak_scheduler.upgrade().is_none() && weak_resources.upgrade().is_none() { break; }
                tokio::task::yield_now().await;
            }
            assert!(weak_scheduler.upgrade().is_none());
            assert!(weak_resources.upgrade().is_none());
        });
    });
    let recorded = recorder.0.lock().unwrap();
    let mut runs: HashMap<&str, Vec<&str>> = HashMap::new();
    for (level, fields) in recorded.iter() {
        assert_eq!(*level, tracing::Level::DEBUG);
        runs.entry(&fields["run_id"])
            .or_default()
            .push(&fields["event"]);
    }
    assert_eq!(runs.len(), 5);
    for events in runs.values() {
        assert_eq!(events, &["run_started", "run_cancelled"]);
    }
}

#[test]
fn saturated_observation_sink_does_not_change_nested_results() {
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        mpsc,
    };
    struct BoundedSink {
        sender: mpsc::SyncSender<()>,
        dropped: Arc<AtomicUsize>,
    }
    impl<S: Subscriber> Layer<S> for BoundedSink {
        fn on_event(&self, _: &tracing::Event<'_>, _: Context<'_, S>) {
            if self.sender.try_send(()).is_err() {
                self.dropped.fetch_add(1, Ordering::SeqCst);
            }
        }
    }
    let (sender, _receiver) = mpsc::sync_channel(1);
    sender.send(()).unwrap();
    let dropped = Arc::new(AtomicUsize::new(0));
    let subscriber = tracing_subscriber::registry().with(BoundedSink {
        sender,
        dropped: dropped.clone(),
    });
    tracing::subscriber::with_default(subscriber, || {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .build()
            .unwrap();
        runtime.block_on(async {
            for panic in [false, true] {
                let parent = Graph::<Empty, ()>::build(
                    vec![Node::new(NodeId::new("entry"), graph(panic))],
                    vec![],
                    vec![],
                    NodeId::new("entry"),
                )
                .unwrap();
                let run = local()
                    .run(&parent, nested_input(), context("backpressure"))
                    .await
                    .unwrap();
                assert_eq!(
                    run.status(),
                    if panic {
                        RunStatus::Failed
                    } else {
                        RunStatus::Completed
                    }
                );
                assert_eq!(run.into_result().is_err(), panic);
            }
        });
    });
    assert_eq!(dropped.load(Ordering::SeqCst), 8); // One start and one terminal event per Run.
}
