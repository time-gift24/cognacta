use std::{
    collections::BTreeMap,
    error::Error as _,
    fmt,
    panic::AssertUnwindSafe,
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
};

use async_trait::async_trait;
use futures_util::FutureExt;
use tracing::{
    Event, Level, Metadata, Subscriber,
    field::{Field, Visit},
    span::{Attributes, Id, Record},
};

use crate::{
    Cluster, Control, Error, ErrorKind, Node, NodeContext, NodeInstance, Outcome, RunStatus,
    Scheduler, State,
};

#[derive(Clone, Debug, Default)]
struct Fields(BTreeMap<String, String>);

impl Visit for Fields {
    fn record_str(&mut self, field: &Field, value: &str) {
        self.0.insert(field.name().into(), value.into());
    }

    fn record_debug(&mut self, field: &Field, value: &dyn fmt::Debug) {
        self.0.insert(field.name().into(), format!("{value:?}"));
    }
}

#[derive(Clone, Debug)]
struct Observed {
    name: &'static str,
    level: Level,
    parent: Option<u64>,
    fields: Fields,
}

#[derive(Clone, Debug, Default)]
struct Trace {
    spans: BTreeMap<u64, Observed>,
    events: Vec<Observed>,
    entered: Vec<u64>,
}

impl Trace {
    fn event(&self, name: &str) -> &Observed {
        let found = self.events_named(name);
        assert_eq!(found.len(), 1, "{name}: {self:#?}");
        found[0]
    }

    fn events_named(&self, name: &str) -> Vec<&Observed> {
        self.events
            .iter()
            .filter(|event| event.fields.0.get("event").is_some_and(|v| v == name))
            .collect()
    }

    fn scope(&self, record: &Observed) -> Vec<&'static str> {
        let mut names = Vec::new();
        let mut parent = record.parent;
        while let Some(id) = parent {
            let span = &self.spans[&id];
            names.push(span.name);
            parent = span.parent;
        }
        names.reverse();
        names
    }

    fn assert_no_cancel(&self) {
        assert!(self.events_named("cluster.run.cancelled").is_empty());
        assert!(self.events_named("cluster.step.cancelled").is_empty());
    }

    fn assert_private(&self) {
        let printed = format!("{self:?}");
        for marker in [
            "STATE_SECRET",
            "INPUT_SECRET",
            "PAYLOAD_SECRET",
            "DELTA_SECRET",
            "ERROR_SECRET",
            "SOURCE_SECRET",
        ] {
            assert!(!printed.contains(marker), "telemetry leaked {marker}");
        }
        for record in self.spans.values().chain(&self.events) {
            for field in record.fields.0.keys() {
                assert!(
                    matches!(
                        field.as_str(),
                        "event" | "phase" | "step_phase" | "node_id" | "error_kind" | "control"
                    ),
                    "unexpected telemetry field: {field}"
                );
            }
        }
    }
}

#[derive(Clone, Default)]
struct Capture(Arc<Mutex<Trace>>);

impl Capture {
    fn snapshot(&self) -> Trace {
        self.0.lock().unwrap().clone()
    }
}

impl Subscriber for Capture {
    fn enabled(&self, _: &Metadata<'_>) -> bool {
        true
    }

    fn new_span(&self, attrs: &Attributes<'_>) -> Id {
        let mut trace = self.0.lock().unwrap();
        let id = trace.spans.len() as u64 + 1;
        let parent = attrs.parent().map(Id::into_u64).or_else(|| {
            attrs
                .is_contextual()
                .then(|| trace.entered.last().copied())
                .flatten()
        });
        let mut fields = Fields::default();
        attrs.record(&mut fields);
        trace.spans.insert(
            id,
            Observed {
                name: attrs.metadata().name(),
                level: *attrs.metadata().level(),
                parent,
                fields,
            },
        );
        Id::from_u64(id)
    }

    fn record(&self, id: &Id, values: &Record<'_>) {
        values.record(
            &mut self
                .0
                .lock()
                .unwrap()
                .spans
                .get_mut(&id.into_u64())
                .unwrap()
                .fields,
        );
    }

    fn record_follows_from(&self, _: &Id, _: &Id) {}

    fn event(&self, event: &Event<'_>) {
        let mut trace = self.0.lock().unwrap();
        let parent = event.parent().map(Id::into_u64).or_else(|| {
            event
                .is_contextual()
                .then(|| trace.entered.last().copied())
                .flatten()
        });
        let mut fields = Fields::default();
        event.record(&mut fields);
        trace.events.push(Observed {
            name: event.metadata().name(),
            level: *event.metadata().level(),
            parent,
            fields,
        });
    }

    fn enter(&self, id: &Id) {
        self.0.lock().unwrap().entered.push(id.into_u64());
    }

    fn exit(&self, _: &Id) {
        self.0.lock().unwrap().entered.pop();
    }
}

struct PrivateState(String);

struct Delta {
    value: String,
    reject: bool,
}

impl State for PrivateState {
    type Delta = Delta;

    fn apply_delta(&mut self, delta: Delta) -> Result<(), Error> {
        if delta.reject {
            return Err(private_error());
        }
        self.0 = delta.value;
        Ok(())
    }
}

fn private_error() -> Error {
    Error::new(ErrorKind::InvalidRequest, "ERROR_SECRET")
        .with_source(Box::new(std::io::Error::other("SOURCE_SECRET")))
}

enum Behavior {
    Finish,
    Forward(String),
    Repeat(usize),
    Fail,
    Reject,
    Pending,
    Panic,
}

struct Fake {
    behavior: Behavior,
    calls: Arc<AtomicUsize>,
}

#[async_trait]
impl NodeInstance<PrivateState> for Fake {
    type Input = String;
    type Payload = String;

    async fn run(
        &self,
        _input: String,
        _ctx: NodeContext<'_, PrivateState>,
    ) -> Result<Outcome<Delta, String>, Error> {
        let calls = self.calls.fetch_add(1, Ordering::SeqCst) + 1;
        let control = match &self.behavior {
            Behavior::Finish | Behavior::Reject => Control::Finish,
            Behavior::Forward(target) => Control::Goto {
                target: target.clone(),
                input: "PAYLOAD_SECRET".into(),
            },
            Behavior::Repeat(limit) if calls < *limit => Control::Goto {
                target: "loop".into(),
                input: "PAYLOAD_SECRET".into(),
            },
            Behavior::Repeat(_) => Control::Finish,
            Behavior::Fail => return Err(private_error()),
            Behavior::Pending => return std::future::pending().await,
            Behavior::Panic => panic!("intentional fake panic"),
        };
        Ok(Outcome {
            state_delta: Some(Delta {
                value: "DELTA_SECRET".into(),
                reject: matches!(self.behavior, Behavior::Reject),
            }),
            control,
        })
    }
}

fn add(cluster: &mut Cluster<PrivateState>, id: &str, behavior: Behavior) -> Arc<AtomicUsize> {
    let calls = Arc::new(AtomicUsize::new(0));
    cluster
        .add(
            Node::builder()
                .id(id.to_owned())
                .body(Fake {
                    behavior,
                    calls: calls.clone(),
                })
                .build()
                .unwrap(),
        )
        .unwrap();
    calls
}

#[tokio::test]
async fn successful_steps_are_nested_and_settle_once_without_business_content() {
    let capture = Capture::default();
    let _subscriber = tracing::subscriber::set_default(capture.clone());
    let mut cluster = Cluster::new();
    add(&mut cluster, "first", Behavior::Forward("last".into()));
    add(&mut cluster, "last", Behavior::Finish);
    let mut run = cluster
        .start()
        .state(PrivateState("STATE_SECRET".into()))
        .entry("first".into())
        .input("INPUT_SECRET".to_owned())
        .call()
        .unwrap();
    Scheduler::new().drive(&mut run).await.unwrap();
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(run.state().0, "DELTA_SECRET");

    let trace = capture.snapshot();
    assert_eq!(
        trace
            .spans
            .values()
            .filter(|s| s.name == "cluster.run")
            .count(),
        1
    );
    assert_eq!(
        trace
            .spans
            .values()
            .filter(|s| s.name == "cluster.step")
            .count(),
        2
    );
    for span in trace.spans.values() {
        assert_eq!(
            span.level,
            if span.name == "cluster.run" {
                Level::INFO
            } else {
                Level::DEBUG
            }
        );
    }
    for name in ["cluster.run.started", "cluster.run.completed"] {
        let event = trace.event(name);
        assert_eq!(event.level, Level::INFO);
        assert_eq!(trace.scope(event), ["cluster.run"]);
    }
    for name in ["cluster.step.started", "cluster.step.completed"] {
        let events = trace.events_named(name);
        assert_eq!(events.len(), 2);
        for event in events {
            assert_eq!(event.level, Level::DEBUG);
            assert_eq!(trace.scope(event), ["cluster.run", "cluster.step"]);
        }
    }
    let controls: Vec<_> = trace
        .events_named("cluster.step.completed")
        .iter()
        .map(|e| e.fields.0.get("control").unwrap().as_str())
        .collect();
    assert_eq!(controls, ["goto", "finish"]);
    trace.assert_no_cancel();
    trace.assert_private();
}

#[tokio::test]
async fn failures_report_the_stage_and_preserve_sources_without_logging_them() {
    for (behavior, mismatch, kind, stage, kind_field) in [
        (
            Behavior::Fail,
            false,
            ErrorKind::NodeExecution,
            "body",
            "node_execution",
        ),
        (
            Behavior::Reject,
            false,
            ErrorKind::StateDeltaRejected,
            "delta",
            "state_delta_rejected",
        ),
        (
            Behavior::Finish,
            true,
            ErrorKind::InputTypeMismatch,
            "input",
            "input_type_mismatch",
        ),
    ] {
        let capture = Capture::default();
        let _subscriber = tracing::subscriber::set_default(capture.clone());
        let mut cluster = Cluster::new();
        let calls = add(&mut cluster, "attempt", behavior);
        let mut run = if mismatch {
            cluster
                .start()
                .state(PrivateState("STATE_SECRET".into()))
                .entry("attempt".into())
                .input(42_usize)
                .call()
                .unwrap()
        } else {
            cluster
                .start()
                .state(PrivateState("STATE_SECRET".into()))
                .entry("attempt".into())
                .input("INPUT_SECRET".to_owned())
                .call()
                .unwrap()
        };
        let error = Scheduler::new().drive(&mut run).await.unwrap_err();
        assert_eq!(error.kind(), kind);
        assert_eq!(run.status(), RunStatus::Failed);
        assert_eq!(run.state().0, "STATE_SECRET");
        assert_eq!(calls.load(Ordering::SeqCst), usize::from(!mismatch));
        if !mismatch {
            let original = error.source().unwrap().downcast_ref::<Error>().unwrap();
            assert_eq!(original.message(), "ERROR_SECRET");
            assert_eq!(original.source().unwrap().to_string(), "SOURCE_SECRET");
        }
        let trace = capture.snapshot();
        let failed = trace.event("cluster.step.failed");
        assert_eq!(failed.level, Level::WARN);
        assert_eq!(failed.fields.0["step_phase"], stage);
        assert_eq!(failed.fields.0["error_kind"], kind_field);
        assert_eq!(trace.scope(failed), ["cluster.run", "cluster.step"]);
        let failed = trace.event("cluster.run.failed");
        assert_eq!(failed.level, Level::WARN);
        assert_eq!(failed.fields.0["error_kind"], kind_field);
        assert_eq!(trace.scope(failed), ["cluster.run"]);
        assert!(trace.events_named("cluster.step.completed").is_empty());
        assert!(trace.events_named("cluster.run.completed").is_empty());
        trace.assert_no_cancel();
        trace.assert_private();
    }
}

#[tokio::test]
async fn unsafe_dynamic_target_is_bounded_only_in_telemetry() {
    let capture = Capture::default();
    let _subscriber = tracing::subscriber::set_default(capture.clone());
    let target = format!("missing\n\r\t{}", "界".repeat(150));
    let mut cluster = Cluster::new();
    add(&mut cluster, "start", Behavior::Forward(target.clone()));
    let mut run = cluster
        .start()
        .state(PrivateState("STATE_SECRET".into()))
        .entry("start".into())
        .input("INPUT_SECRET".to_owned())
        .call()
        .unwrap();
    let error = Scheduler::new().drive(&mut run).await.unwrap_err();
    assert_eq!(error.kind(), ErrorKind::UnknownNode);
    assert_eq!(error.node_id(), Some(&target));
    assert_eq!(run.node_id(), Some(&target));
    assert_eq!(run.state().0, "DELTA_SECRET");
    let trace = capture.snapshot();
    assert_eq!(
        trace.event("cluster.step.failed").fields.0["step_phase"],
        "lookup"
    );
    let target_field = &trace.event("cluster.step.failed").fields.0["node_id"];
    assert_ne!(target_field, &target);
    assert!(target_field.starts_with("missing"));
    for record in trace.spans.values().chain(&trace.events) {
        if let Some(id) = record.fields.0.get("node_id") {
            assert!(id.len() <= 256);
            assert!(!id.chars().any(char::is_control));
        }
    }
    trace.assert_private();
}

#[tokio::test]
async fn dropping_unpolled_and_pending_drives_has_distinct_observation() {
    let capture = Capture::default();
    let _subscriber = tracing::subscriber::set_default(capture.clone());
    let mut cluster = Cluster::new();
    let calls = add(&mut cluster, "wait", Behavior::Pending);
    let mut run = cluster
        .start()
        .state(PrivateState("STATE_SECRET".into()))
        .entry("wait".into())
        .input("INPUT_SECRET".to_owned())
        .call()
        .unwrap();
    let scheduler = Scheduler::new();
    drop(scheduler.drive(&mut run));
    assert_eq!(run.status(), RunStatus::Ready);
    assert!(capture.snapshot().events.is_empty());
    assert!(capture.snapshot().spans.is_empty());
    assert_eq!(calls.load(Ordering::SeqCst), 0);

    let mut drive = Box::pin(scheduler.drive(&mut run));
    assert!(futures_util::poll!(&mut drive).is_pending());
    drop(drive);
    assert_eq!(run.status(), RunStatus::Running);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let trace = capture.snapshot();
    let run_cancel = trace.event("cluster.run.cancelled");
    assert_eq!(run_cancel.level, Level::DEBUG);
    assert_eq!(trace.scope(run_cancel), ["cluster.run"]);
    let step_cancel = trace.event("cluster.step.cancelled");
    assert_eq!(step_cancel.level, Level::DEBUG);
    assert_eq!(trace.scope(step_cancel), ["cluster.run", "cluster.step"]);
    assert!(trace.events_named("cluster.run.completed").is_empty());
    assert!(trace.events_named("cluster.run.failed").is_empty());

    assert_eq!(
        scheduler.drive(&mut run).await.unwrap_err().kind(),
        ErrorKind::RunNotReady
    );
    assert_eq!(run.status(), RunStatus::Running);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let trace = capture.snapshot();
    trace.event("cluster.run.cancelled");
    trace.event("cluster.step.cancelled");
}

#[tokio::test]
async fn dropping_at_scheduler_yield_cancels_only_the_run() {
    let capture = Capture::default();
    let _subscriber = tracing::subscriber::set_default(capture.clone());
    let mut cluster = Cluster::new();
    let calls = add(&mut cluster, "loop", Behavior::Repeat(1024));
    let mut run = cluster
        .start()
        .state(PrivateState("STATE_SECRET".into()))
        .entry("loop".into())
        .input("INPUT_SECRET".to_owned())
        .call()
        .unwrap();
    let scheduler = Scheduler::new();
    let mut drive = Box::pin(scheduler.drive(&mut run));
    assert!(futures_util::poll!(&mut drive).is_pending());
    drop(drive);

    assert_eq!(run.status(), RunStatus::Running);
    let completed = calls.load(Ordering::SeqCst);
    assert!(completed > 0);
    let trace = capture.snapshot();
    assert_eq!(trace.events_named("cluster.step.started").len(), completed);
    assert_eq!(
        trace.events_named("cluster.step.completed").len(),
        completed
    );
    assert!(trace.events_named("cluster.step.cancelled").is_empty());
    trace.event("cluster.run.cancelled");
    assert!(trace.events_named("cluster.run.completed").is_empty());
    assert!(trace.events_named("cluster.run.failed").is_empty());
}

#[tokio::test]
async fn panic_caught_before_future_drop_is_not_reported_as_cancellation() {
    let capture = Capture::default();
    let _subscriber = tracing::subscriber::set_default(capture.clone());
    let mut cluster = Cluster::new();
    add(&mut cluster, "panic", Behavior::Panic);
    let mut run = cluster
        .start()
        .state(PrivateState("STATE_SECRET".into()))
        .entry("panic".into())
        .input("INPUT_SECRET".to_owned())
        .call()
        .unwrap();
    let scheduler = Scheduler::new();
    let mut drive = Box::pin(scheduler.drive(&mut run));
    assert!(
        AssertUnwindSafe(drive.as_mut())
            .catch_unwind()
            .await
            .is_err()
    );
    assert!(!std::thread::panicking());
    drop(drive);
    assert_eq!(run.status(), RunStatus::Running);
    let trace = capture.snapshot();
    trace.event("cluster.run.started");
    trace.event("cluster.step.started");
    trace.assert_no_cancel();
    assert!(trace.events_named("cluster.run.failed").is_empty());
    assert!(trace.events_named("cluster.run.completed").is_empty());
}

#[tokio::test]
async fn flow_also_completes_without_a_subscriber() {
    let _subscriber =
        tracing::subscriber::set_default(tracing::subscriber::NoSubscriber::default());
    let mut cluster = Cluster::new();
    let calls = add(&mut cluster, "finish", Behavior::Finish);
    let mut run = cluster
        .start()
        .state(PrivateState("STATE_SECRET".into()))
        .entry("finish".into())
        .input("INPUT_SECRET".to_owned())
        .call()
        .unwrap();
    Scheduler::new().drive(&mut run).await.unwrap();
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(run.state().0, "DELTA_SECRET");
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}
