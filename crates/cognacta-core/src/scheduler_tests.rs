use std::{
    error::Error as _,
    future::Future as _,
    sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    },
    task::{Context, Poll, Waker},
    time::Duration,
};

use async_trait::async_trait;

use crate::{
    Cluster, Control, Error, ErrorKind, Node, NodeContext, NodeInstance, Outcome, RunStatus,
    Scheduler, State,
};

#[derive(Clone, Debug, Default, PartialEq)]
struct Ledger {
    value: usize,
    updates: usize,
    path: Vec<&'static str>,
}

#[derive(Default)]
struct Delta {
    value: Option<usize>,
    visit: Option<&'static str>,
    reject: bool,
}

impl State for Ledger {
    type Delta = Delta;

    fn apply_delta(&mut self, delta: Delta) -> Result<(), Error> {
        if delta.reject {
            return Err(Error::new(ErrorKind::InvalidRequest, "delta rejected")
                .with_source(Box::new(std::io::Error::other("delta source"))));
        }
        if let Some(value) = delta.value {
            self.value = value;
        }
        if let Some(visit) = delta.visit {
            self.path.push(visit);
        }
        self.updates += 1;
        Ok(())
    }
}

fn register<B>(cluster: &mut Cluster<Ledger>, id: &str, body: B)
where
    B: NodeInstance<Ledger> + 'static,
    B::Input: 'static,
    B::Payload: 'static,
{
    cluster
        .add(
            Node::builder()
                .id(id.to_owned())
                .body(body)
                .build()
                .unwrap(),
        )
        .unwrap();
}

struct OwnedText {
    text: String,
    drops: Arc<AtomicUsize>,
}

impl Drop for OwnedText {
    fn drop(&mut self) {
        self.drops.fetch_add(1, Ordering::SeqCst);
    }
}

struct Count {
    target: &'static str,
    calls: Arc<AtomicUsize>,
}

#[async_trait]
impl NodeInstance<Ledger> for Count {
    type Input = OwnedText;
    type Payload = usize;

    async fn run(
        &self,
        input: OwnedText,
        ctx: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, usize>, Error> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        assert_eq!(ctx.state.updates, 0);
        let length = input.text.len();
        Ok(Outcome {
            state_delta: Some(Delta {
                value: Some(length),
                visit: Some("count"),
                ..Delta::default()
            }),
            control: Control::Goto {
                target: self.target.to_owned(),
                input: length,
            },
        })
    }
}

struct Render;

#[async_trait]
impl NodeInstance<Ledger> for Render {
    type Input = usize;
    type Payload = ();

    async fn run(
        &self,
        input: usize,
        ctx: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, ()>, Error> {
        assert_eq!(ctx.state.value, input);
        assert_eq!(ctx.state.path, ["count"]);
        Ok(Outcome {
            state_delta: Some(Delta {
                value: Some(input + 1),
                visit: Some("render"),
                ..Delta::default()
            }),
            control: Control::Finish,
        })
    }
}

#[test]
fn node_construction_validates_identity_without_rewriting_it() {
    for id in ["", " ", " node", "node ", "node\nchild", "node\u{7f}"] {
        let error = Node::builder()
            .id(id.to_owned())
            .body(Render)
            .build()
            .err()
            .unwrap();
        assert_eq!(error.kind(), ErrorKind::InvalidRequest, "{id:?}");
    }
    let node = Node::builder()
        .id("模型/next node".to_owned())
        .body(Render)
        .build()
        .unwrap();
    assert_eq!(node.id(), "模型/next node");
}

#[tokio::test]
async fn typed_chain_moves_input_once_commits_before_routing_and_keeps_original_registration() {
    let calls = Arc::new(AtomicUsize::new(0));
    let duplicate_calls = Arc::new(AtomicUsize::new(0));
    let drops = Arc::new(AtomicUsize::new(0));
    let mut cluster = Cluster::<Ledger>::new();
    register(
        &mut cluster,
        "count",
        Count {
            target: "render",
            calls: calls.clone(),
        },
    );
    register(&mut cluster, "render", Render);
    let error = cluster
        .add(
            Node::builder()
                .id("count".to_owned())
                .body(Count {
                    target: "missing",
                    calls: duplicate_calls.clone(),
                })
                .build()
                .unwrap(),
        )
        .unwrap_err();
    assert_eq!(error.kind(), ErrorKind::DuplicateNode);
    assert_eq!(error.node_id().map(String::as_str), Some("count"));
    assert!(error.source().is_none());

    let mut run = cluster
        .start()
        .state(Ledger::default())
        .entry("count".to_owned())
        .input(OwnedText {
            text: "hello".to_owned(),
            drops: drops.clone(),
        })
        .call()
        .unwrap();
    assert_eq!(run.status(), RunStatus::Ready);
    assert_eq!(run.node_id().map(String::as_str), Some("count"));
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let scheduler = Scheduler::default();
    scheduler.drive(&mut run).await.unwrap();
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(run.node_id(), None);
    assert_eq!(
        run.state(),
        &Ledger {
            value: 6,
            updates: 2,
            path: vec!["count", "render"]
        }
    );
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(duplicate_calls.load(Ordering::SeqCst), 0);
    assert_eq!(drops.load(Ordering::SeqCst), 1);

    let error = scheduler.drive(&mut run).await.unwrap_err();
    assert_eq!(error.kind(), ErrorKind::RunNotReady);
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(run.state().updates, 2);
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

struct Add;

#[async_trait]
impl NodeInstance<Ledger> for Add {
    type Input = usize;
    type Payload = ();

    async fn run(
        &self,
        input: usize,
        ctx: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, ()>, Error> {
        Ok(Outcome {
            state_delta: (input != 0).then_some(Delta {
                value: Some(ctx.state.value + input),
                ..Delta::default()
            }),
            control: Control::Finish,
        })
    }
}

#[tokio::test]
async fn runs_own_independent_state_and_none_delta_does_not_apply() {
    let mut cluster = Cluster::default();
    register(&mut cluster, "add", Add);
    let initial = Ledger {
        value: 10,
        ..Ledger::default()
    };
    let mut first = cluster
        .start()
        .state(initial.clone())
        .entry("add".to_owned())
        .input(3_usize)
        .call()
        .unwrap();
    let mut second = cluster
        .start()
        .state(initial)
        .entry("add".to_owned())
        .input(0_usize)
        .call()
        .unwrap();
    let scheduler = Scheduler::new();
    scheduler.drive(&mut first).await.unwrap();
    assert_eq!(first.state().value, 13);
    assert_eq!(second.status(), RunStatus::Ready);
    assert_eq!(second.state().value, 10);
    assert_eq!(second.state().updates, 0);
    scheduler.drive(&mut second).await.unwrap();
    assert_eq!(second.status(), RunStatus::Completed);
    assert_eq!(second.state().value, 10);
    assert_eq!(second.state().updates, 0);
    assert_eq!(first.state().value, 13);
}

struct Route;
struct Branch(&'static str);

#[async_trait]
impl NodeInstance<Ledger> for Route {
    type Input = usize;
    type Payload = usize;

    async fn run(
        &self,
        input: usize,
        _: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, usize>, Error> {
        Ok(Outcome {
            state_delta: Some(Delta {
                visit: Some("route"),
                ..Delta::default()
            }),
            control: if input == 0 {
                Control::Finish
            } else {
                Control::Goto {
                    target: if input.is_multiple_of(2) {
                        "even"
                    } else {
                        "odd"
                    }
                    .to_owned(),
                    input: input - 1,
                }
            },
        })
    }
}

#[async_trait]
impl NodeInstance<Ledger> for Branch {
    type Input = usize;
    type Payload = usize;

    async fn run(
        &self,
        input: usize,
        _: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, usize>, Error> {
        Ok(Outcome {
            state_delta: Some(Delta {
                visit: Some(self.0),
                ..Delta::default()
            }),
            control: Control::Goto {
                target: "route".to_owned(),
                input,
            },
        })
    }
}

#[tokio::test]
async fn outcome_selects_one_branch_per_step_and_can_return_to_an_earlier_node() {
    let mut cluster = Cluster::new();
    register(&mut cluster, "route", Route);
    register(&mut cluster, "even", Branch("even"));
    register(&mut cluster, "odd", Branch("odd"));
    for (input, expected) in [
        (1_usize, vec!["route", "odd", "route"]),
        (2, vec!["route", "even", "route", "odd", "route"]),
    ] {
        let mut run = cluster
            .start()
            .state(Ledger::default())
            .entry("route".to_owned())
            .input(input)
            .call()
            .unwrap();
        Scheduler::new().drive(&mut run).await.unwrap();
        assert_eq!(run.status(), RunStatus::Completed);
        assert_eq!(run.state().path, expected);
    }
}

struct Seed(&'static str);

#[async_trait]
impl NodeInstance<Ledger> for Seed {
    type Input = ();
    type Payload = String;

    async fn run(
        &self,
        _: (),
        _: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, String>, Error> {
        Ok(Outcome {
            state_delta: Some(Delta {
                value: Some(1),
                visit: Some("seed"),
                ..Delta::default()
            }),
            control: Control::Goto {
                target: self.0.to_owned(),
                input: "payload".to_owned(),
            },
        })
    }
}

struct NeedsNumber(Arc<AtomicUsize>);

#[async_trait]
impl NodeInstance<Ledger> for NeedsNumber {
    type Input = usize;
    type Payload = ();

    async fn run(&self, _: usize, _: NodeContext<'_, Ledger>) -> Result<Outcome<Delta, ()>, Error> {
        self.0.fetch_add(1, Ordering::SeqCst);
        Ok(Outcome {
            state_delta: None,
            control: Control::Finish,
        })
    }
}

#[tokio::test]
async fn unknown_target_and_input_mismatch_preserve_committed_delta_without_entering_target() {
    for (target, expected) in [
        ("missing", ErrorKind::UnknownNode),
        ("number", ErrorKind::InputTypeMismatch),
    ] {
        let calls = Arc::new(AtomicUsize::new(0));
        let mut cluster = Cluster::new();
        register(&mut cluster, "seed", Seed(target));
        register(&mut cluster, "number", NeedsNumber(calls.clone()));
        let mut run = cluster
            .start()
            .state(Ledger::default())
            .entry("seed".to_owned())
            .input(())
            .call()
            .unwrap();
        let scheduler = Scheduler::new();
        let error = scheduler.drive(&mut run).await.unwrap_err();
        assert_eq!(error.kind(), expected);
        assert_eq!(error.node_id().map(String::as_str), Some(target));
        assert!(error.source().is_none());
        assert_eq!(run.status(), RunStatus::Failed);
        assert_eq!(run.node_id().map(String::as_str), Some(target));
        assert_eq!(
            run.state(),
            &Ledger {
                value: 1,
                updates: 1,
                path: vec!["seed"]
            }
        );
        assert_eq!(calls.load(Ordering::SeqCst), 0);
        assert_eq!(
            scheduler.drive(&mut run).await.unwrap_err().kind(),
            ErrorKind::RunNotReady
        );
        assert_eq!(run.status(), RunStatus::Failed);
        assert_eq!(run.node_id().map(String::as_str), Some(target));
        assert_eq!(run.state().updates, 1);
    }
}

#[tokio::test]
async fn start_checks_entry_existence_but_defers_input_type_check_to_drive() {
    let calls = Arc::new(AtomicUsize::new(0));
    let mut cluster = Cluster::new();
    register(&mut cluster, "number", NeedsNumber(calls.clone()));
    let error = cluster
        .start()
        .state(Ledger::default())
        .entry("missing".to_owned())
        .input(())
        .call()
        .err()
        .unwrap();
    assert_eq!(error.kind(), ErrorKind::UnknownNode);
    assert_eq!(error.node_id().map(String::as_str), Some("missing"));
    assert!(error.source().is_none());
    let mut run = cluster
        .start()
        .state(Ledger::default())
        .entry("number".to_owned())
        .input("wrong".to_owned())
        .call()
        .unwrap();
    assert_eq!(run.status(), RunStatus::Ready);
    let error = Scheduler::new().drive(&mut run).await.unwrap_err();
    assert_eq!(error.kind(), ErrorKind::InputTypeMismatch);
    assert_eq!(run.status(), RunStatus::Failed);
    assert_eq!(run.node_id().map(String::as_str), Some("number"));
    assert_eq!(run.state(), &Ledger::default());
    assert_eq!(calls.load(Ordering::SeqCst), 0);
}

struct Fail;

#[async_trait]
impl NodeInstance<Ledger> for Fail {
    type Input = String;
    type Payload = ();

    async fn run(
        &self,
        _: String,
        _: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, ()>, Error> {
        Err(Error::new(ErrorKind::Transport, "original node error")
            .with_request_id("original-request".to_owned())
            .with_retry_after(Duration::from_secs(2))
            .with_source(Box::new(std::io::Error::new(
                std::io::ErrorKind::ConnectionReset,
                "original source",
            ))))
    }
}

#[tokio::test]
async fn body_error_is_wrapped_once_with_its_original_classification_diagnostics_and_source() {
    let mut cluster = Cluster::new();
    register(&mut cluster, "seed", Seed("fail"));
    register(&mut cluster, "fail", Fail);
    let mut run = cluster
        .start()
        .state(Ledger::default())
        .entry("seed".to_owned())
        .input(())
        .call()
        .unwrap();
    let error = Scheduler::new().drive(&mut run).await.unwrap_err();
    assert_eq!(error.kind(), ErrorKind::NodeExecution);
    assert_eq!(error.node_id().map(String::as_str), Some("fail"));
    assert_eq!(run.status(), RunStatus::Failed);
    assert_eq!(run.node_id().map(String::as_str), Some("fail"));
    assert_eq!(run.state().value, 1);
    let original = error.source().unwrap().downcast_ref::<Error>().unwrap();
    assert_eq!(original.kind(), ErrorKind::Transport);
    assert_eq!(original.message(), "original node error");
    assert_eq!(original.request_id(), Some("original-request"));
    assert_eq!(original.retry_after(), Some(Duration::from_secs(2)));
    let source = original
        .source()
        .unwrap()
        .downcast_ref::<std::io::Error>()
        .unwrap();
    assert_eq!(source.kind(), std::io::ErrorKind::ConnectionReset);
}

struct Reject {
    finish: bool,
}

#[async_trait]
impl NodeInstance<Ledger> for Reject {
    type Input = String;
    type Payload = usize;

    async fn run(
        &self,
        _: String,
        _: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, usize>, Error> {
        Ok(Outcome {
            state_delta: Some(Delta {
                value: Some(999),
                visit: Some("reject"),
                reject: true,
            }),
            control: if self.finish {
                Control::Finish
            } else {
                Control::Goto {
                    target: "sentinel".to_owned(),
                    input: 0,
                }
            },
        })
    }
}

#[test]
fn rejected_delta_is_atomic_in_the_example_state() {
    let mut state = Ledger {
        value: 1,
        updates: 1,
        path: vec!["seed"],
    };
    let before = state.clone();
    assert!(
        state
            .apply_delta(Delta {
                value: Some(999),
                visit: Some("reject"),
                reject: true
            })
            .is_err()
    );
    assert_eq!(state, before);
}

#[tokio::test]
async fn rejected_delta_blocks_both_goto_and_finish_and_preserves_earlier_steps() {
    for finish in [false, true] {
        let calls = Arc::new(AtomicUsize::new(0));
        let mut cluster = Cluster::new();
        register(&mut cluster, "seed", Seed("reject"));
        register(&mut cluster, "reject", Reject { finish });
        register(&mut cluster, "sentinel", NeedsNumber(calls.clone()));
        let mut run = cluster
            .start()
            .state(Ledger::default())
            .entry("seed".to_owned())
            .input(())
            .call()
            .unwrap();
        let error = Scheduler::new().drive(&mut run).await.unwrap_err();
        assert_eq!(error.kind(), ErrorKind::StateDeltaRejected);
        assert_eq!(error.node_id().map(String::as_str), Some("reject"));
        assert_eq!(run.status(), RunStatus::Failed);
        assert_eq!(run.node_id().map(String::as_str), Some("reject"));
        assert_eq!(
            run.state(),
            &Ledger {
                value: 1,
                updates: 1,
                path: vec!["seed"]
            }
        );
        assert_eq!(calls.load(Ordering::SeqCst), 0);
        let original = error.source().unwrap().downcast_ref::<Error>().unwrap();
        assert_eq!(original.kind(), ErrorKind::InvalidRequest);
        assert_eq!(original.message(), "delta rejected");
        assert!(original.source().unwrap().is::<std::io::Error>());
    }
}

struct Wait(Arc<AtomicUsize>);

#[async_trait]
impl NodeInstance<Ledger> for Wait {
    type Input = OwnedText;
    type Payload = ();

    async fn run(
        &self,
        input: OwnedText,
        _: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, ()>, Error> {
        self.0.fetch_add(1, Ordering::SeqCst);
        std::future::pending::<()>().await;
        drop(input);
        Ok(Outcome {
            state_delta: None,
            control: Control::Finish,
        })
    }
}

#[tokio::test]
async fn dropping_an_active_drive_leaves_running_and_does_not_redeliver_input() {
    let calls = Arc::new(AtomicUsize::new(0));
    let drops = Arc::new(AtomicUsize::new(0));
    let mut cluster = Cluster::new();
    register(&mut cluster, "wait", Wait(calls.clone()));
    let mut run = cluster
        .start()
        .state(Ledger::default())
        .entry("wait".to_owned())
        .input(OwnedText {
            text: "pending".to_owned(),
            drops: drops.clone(),
        })
        .call()
        .unwrap();
    let scheduler = Scheduler::new();
    drop(scheduler.drive(&mut run));
    assert_eq!(run.status(), RunStatus::Ready);
    assert_eq!(calls.load(Ordering::SeqCst), 0);
    assert_eq!(drops.load(Ordering::SeqCst), 0);
    let mut future = Box::pin(scheduler.drive(&mut run));
    assert!(matches!(
        future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop())),
        Poll::Pending
    ));
    drop(future);
    assert_eq!(run.status(), RunStatus::Running);
    assert_eq!(run.node_id().map(String::as_str), Some("wait"));
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    let error = scheduler.drive(&mut run).await.unwrap_err();
    assert_eq!(error.kind(), ErrorKind::RunNotReady);
    assert_eq!(run.status(), RunStatus::Running);
    assert_eq!(run.node_id().map(String::as_str), Some("wait"));
    assert_eq!(run.state(), &Ledger::default());
    assert_eq!(calls.load(Ordering::SeqCst), 1);
}

const IMMEDIATE_STEPS: usize = 1024;

struct ImmediateLoop(Arc<AtomicUsize>);

#[async_trait]
impl NodeInstance<Ledger> for ImmediateLoop {
    type Input = OwnedText;
    type Payload = OwnedText;

    async fn run(
        &self,
        input: OwnedText,
        ctx: NodeContext<'_, Ledger>,
    ) -> Result<Outcome<Delta, OwnedText>, Error> {
        self.0.fetch_add(1, Ordering::SeqCst);
        let value = ctx.state.value + 1;
        Ok(Outcome {
            state_delta: Some(Delta {
                value: Some(value),
                ..Delta::default()
            }),
            control: if value < IMMEDIATE_STEPS {
                Control::Goto {
                    target: "loop".to_owned(),
                    input,
                }
            } else {
                Control::Finish
            },
        })
    }
}

#[tokio::test(flavor = "current_thread")]
async fn immediate_goto_loop_allows_a_queued_heartbeat_before_completion() {
    let calls = Arc::new(AtomicUsize::new(0));
    let drops = Arc::new(AtomicUsize::new(0));
    let mut cluster = Cluster::new();
    register(&mut cluster, "loop", ImmediateLoop(calls.clone()));
    let mut run = cluster
        .start()
        .state(Ledger::default())
        .entry("loop".to_owned())
        .input(OwnedText {
            text: "move through every step".to_owned(),
            drops: drops.clone(),
        })
        .call()
        .unwrap();
    let heartbeat = tokio::spawn(async move { calls.load(Ordering::SeqCst) });

    Scheduler::new().drive(&mut run).await.unwrap();

    let progress = heartbeat.await.unwrap();
    assert!(progress > 0 && progress < IMMEDIATE_STEPS, "{progress}");
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(run.state().value, IMMEDIATE_STEPS);
    assert_eq!(run.state().updates, IMMEDIATE_STEPS);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn dropping_an_immediate_goto_loop_at_yield_keeps_running_and_drops_input_once() {
    let calls = Arc::new(AtomicUsize::new(0));
    let drops = Arc::new(AtomicUsize::new(0));
    let mut cluster = Cluster::new();
    register(&mut cluster, "loop", ImmediateLoop(calls.clone()));
    let mut run = cluster
        .start()
        .state(Ledger::default())
        .entry("loop".to_owned())
        .input(OwnedText {
            text: "drop between steps".to_owned(),
            drops: drops.clone(),
        })
        .call()
        .unwrap();
    let scheduler = Scheduler::new();
    let mut future = Box::pin(scheduler.drive(&mut run));
    assert!(matches!(
        future
            .as_mut()
            .poll(&mut Context::from_waker(Waker::noop())),
        Poll::Pending
    ));
    let completed = calls.load(Ordering::SeqCst);
    assert!(completed > 0 && completed < IMMEDIATE_STEPS);
    assert_eq!(drops.load(Ordering::SeqCst), 0);

    drop(future);

    assert_eq!(run.status(), RunStatus::Running);
    assert_eq!(run.node_id().map(String::as_str), Some("loop"));
    assert_eq!(run.state().value, completed);
    assert_eq!(run.state().updates, completed);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
    assert_eq!(
        scheduler.drive(&mut run).await.unwrap_err().kind(),
        ErrorKind::RunNotReady
    );
    assert_eq!(calls.load(Ordering::SeqCst), completed);
    assert_eq!(drops.load(Ordering::SeqCst), 1);
}
