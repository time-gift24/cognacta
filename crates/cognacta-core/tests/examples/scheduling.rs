use cognacta_core::*;
use std::{
    cell::Cell,
    collections::HashMap,
    future::Future,
    pin::Pin,
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
};
use tokio::{
    sync::{Semaphore, mpsc},
    task::JoinSet,
};

fn id(name: &str) -> NodeId {
    NodeId::new(name)
}
fn key(name: &str) -> NodeKey {
    NodeKey::Static(id(name))
}
fn input(name: &str, values: Vec<SharedValue>) -> GraphInput {
    GraphInput::new(HashMap::from([(id(name), Input::new(values))]))
}
fn json(value: impl serde::Serialize) -> SharedValue {
    Arc::new(serde_json::to_value(value).unwrap())
}
fn local(k: usize) -> Arc<dyn Scheduler> {
    Arc::new(LocalScheduler::new(SchedulerConfig::new(k, 16).unwrap()))
}

// An independent driver: admission is reversed, and finished tasks refill the pool.
// It uses only the exported protocol; it never delegates to LocalScheduler.
struct Reverse {
    config: SchedulerConfig,
    calls: AtomicUsize,
}
impl Reverse {
    fn new(k: usize) -> Arc<Self> {
        Arc::new(Self {
            config: SchedulerConfig::new(k, 16).unwrap(),
            calls: AtomicUsize::new(0),
        })
    }
}
impl Scheduler for Reverse {
    fn config(&self) -> SchedulerConfig {
        self.config
    }
    fn drive<'a>(
        self: Arc<Self>,
        execution: &'a mut (dyn Execution + 'a),
    ) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'a>> {
        Box::pin(async move {
            self.calls.fetch_add(1, Ordering::SeqCst);
            while let Some(ready) = execution.advance().await? {
                let mut waiting = ready.into_iter().rev();
                let mut tasks = JoinSet::new();
                loop {
                    while tasks.len() < self.config.max_concurrency().get() {
                        let Some(key) = waiting.next() else { break };
                        let task = execution.dispatch(&key).unwrap();
                        tasks.spawn(async move { (key, task.await) });
                    }
                    let Some(joined) = tasks.join_next().await else {
                        break;
                    };
                    let (key, result) = joined.unwrap();
                    execution.complete(key, result).await.unwrap();
                }
            }
            Ok(())
        })
    }
}

#[derive(Default)]
struct CellAppend;
impl Reducer<Vec<usize>> for CellAppend {
    type Delta = Cell<usize>; // Deliberately Send, not Sync.
    const POLICY: WritePolicy = WritePolicy::MultiWriter;
    fn reduce(&mut self, current: &Vec<usize>, delta: Cell<usize>) -> Result<Vec<usize>, Error> {
        let mut next = current.clone();
        next.push(delta.get());
        Ok(next)
    }
    fn finish(self, value: Vec<usize>) -> Result<Vec<usize>, Error> {
        Ok(value)
    }
}
#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct Wave {
    #[reducer(CellAppend)]
    order: Vec<usize>,
}
struct Gates {
    started: mpsc::UnboundedSender<usize>,
    gates: Vec<Semaphore>,
    fail: bool,
}
struct Work(usize);
impl NodeInstance<Wave, Gates> for Work {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Wave, Gates>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Wave, ()>, Error> {
        let gates = ctx.run.resources();
        gates.started.send(self.0).unwrap();
        let permit = gates.gates[self.0].acquire().await.unwrap();
        permit.forget();
        if gates.fail && self.0 == 1 {
            return Err(Error::execution(std::io::Error::other("business failure")));
        }
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: WaveDelta {
                order: Some(Cell::new(self.0)),
            },
            directive: None,
        })
    }
}

#[tokio::test]
async fn real_drivers_control_admission_and_refill_but_settle_in_graph_order() {
    let graph = Arc::new(
        Graph::<Wave, (), Gates>::build(
            (0..3)
                .map(|n| Node::new(id(&n.to_string()), Work(n)))
                .collect(),
            vec![],
            vec![],
            id("0"),
        )
        .unwrap(),
    );
    for reverse in [false, true] {
        for fail in [false, true] {
            let scheduler: Arc<dyn Scheduler> = if reverse { Reverse::new(2) } else { local(2) };
            let (started, mut starts) = mpsc::unbounded_channel();
            let gates = Arc::new(Gates {
                started,
                gates: (0..3).map(|_| Semaphore::new(0)).collect(),
                fail,
            });
            let log = Arc::new(InMemoryEventLog::new());
            let (g, r, recording) = (graph.clone(), gates.clone(), log.clone());
            let run = tokio::spawn(async move {
                scheduler
                    .run(
                        &g,
                        GraphInput::new(
                            (0..3)
                                .map(|n| (id(&n.to_string()), Input::new(vec![])))
                                .collect(),
                        ),
                        RunContext::root("wave".into(), 0, r).with_event_log(recording),
                    )
                    .await
                    .unwrap()
            });
            let first = starts.recv().await.unwrap();
            let second = starts.recv().await.unwrap();
            assert_eq!([first, second], if reverse { [2, 1] } else { [0, 1] });
            assert!(starts.try_recv().is_err());
            gates.gates[1].add_permits(1); // A business failure must also free a slot.
            let third = starts.recv().await.unwrap();
            assert_eq!(third, if reverse { 0 } else { 2 });
            gates.gates[third].add_permits(1);
            gates.gates[first].add_permits(1);
            let run = run.await.unwrap();
            assert_eq!(
                run.state().order,
                if fail { vec![0, 2] } else { vec![0, 1, 2] }
            );
            assert_eq!(run.waves(), 1);
            for n in 0..3 {
                let node = run.node(&key(&n.to_string())).unwrap();
                assert_eq!(node.attempts(), 1);
                assert_eq!(
                    node.status(),
                    if fail && n == 1 {
                        NodeStatus::Failed
                    } else {
                        NodeStatus::Completed
                    }
                );
            }
            assert_eq!(run.errors().len(), usize::from(fail));
            let events = log.events("wave", 0).await.unwrap();
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
                    .filter(|event| event.kind() == "node_started")
                    .count(),
                3
            );
            assert_eq!(
                events
                    .iter()
                    .filter(|event| event.kind() == "node_completed")
                    .count(),
                if fail { 2 } else { 3 }
            );
            assert_eq!(events[events.len() - 2].kind(), "control");
            assert_eq!(
                events.last().unwrap().kind(),
                if fail { "run_failed" } else { "run_completed" }
            );
        }
    }
}

#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct Level {
    #[reducer(Override)]
    depth: usize,
    #[reducer(Add)]
    visits: usize,
}
#[derive(serde::Serialize, serde::Deserialize)]
struct Token(usize);
// No Clone.
#[derive(Debug)]
struct Identity {
    run: String,
    parent: Option<String>,
    node: Option<NodeKey>,
    depth: usize,
}
struct Resources {
    token: Arc<Token>,
    identities: Mutex<Vec<Identity>>,
}
#[derive(Clone, Copy)]
enum Route {
    Static,
    Deliver,
    Transition,
}
struct Prepare(Route);
impl NodeInstance<Level, Resources> for Prepare {
    type Output = GraphInput;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Level, Resources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Level, GraphInput>, Error> {
        assert_eq!(ctx.state.depth, ctx.run.depth());
        assert_eq!(ctx.state.visits, 0);
        let token: Token = serde_json::from_value(input.entry()?.clone())
            .map_err(|source| InputError::Decode { source })?;
        assert_eq!(token.0, ctx.run.resources().token.0);
        let value = Arc::new(crate::scheduling::input("prepare", vec![json(token)]));
        let payload = json(value.as_ref());
        let directive = match self.0 {
            Route::Static => None,
            Route::Deliver => Some(Directive::Deliver(vec![DeliverTarget {
                template: id("worker"),
                key: "same-key".into(),
                payload: payload.clone(),
            }])),
            Route::Transition => Some(Directive::Transition {
                target: id("worker"),
                payload: Some(payload),
                immediate: true,
            }),
        };
        Ok(Outcome {
            value: Some(value),
            state_delta: LevelDelta {
                visits: Some(1),
                ..Default::default()
            },
            directive,
        })
    }
}
struct Leaf;
impl NodeInstance<Level, Resources> for Leaf {
    type Output = Token;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Level, Resources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Level, Token>, Error> {
        assert_eq!(ctx.state.visits, 1);
        let graph_input: GraphInput = serde_json::from_value(input.one(&id("prepare"))?.clone())
            .map_err(|source| InputError::Decode { source })?;
        let value: Token =
            serde_json::from_value(graph_input.entry(&id("prepare"))?.entry()?.clone())
                .map_err(|source| InputError::Decode { source })?;
        if value.0 != 73 {
            return Err(Error::execution(std::io::Error::other(
                "leaf rejected input",
            )));
        }
        Ok(Outcome {
            value: Some(Arc::new(value)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
struct Report;
impl NodeInstance<Level, Resources> for Report {
    type Output = Token;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Level, Resources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Level, Token>, Error> {
        assert_eq!(ctx.state.visits, 1); // Child deltas do not enter the parent state.
        assert_eq!(ctx.state.depth, ctx.run.depth());
        let value: Token = serde_json::from_value(input.one(&id("worker"))?.clone())
            .map_err(|source| InputError::Decode { source })?;
        assert_eq!(value.0, ctx.run.resources().token.0);
        Ok(Outcome {
            value: Some(Arc::new(value)),
            state_delta: LevelDelta {
                visits: Some(1),
                ..Default::default()
            },
            directive: None,
        })
    }
}
fn layers(count: usize, route: Route) -> Vec<Arc<Graph<Level, Token, Resources>>> {
    let mut graphs: Vec<Arc<Graph<Level, Token, Resources>>> = Vec::new();
    for _ in 0..count {
        let worker = match graphs.last() {
            Some(child) => Node::new(id("worker"), child.clone()),
            None => Node::new(id("worker"), Leaf),
        }
        .template(matches!(route, Route::Deliver));
        let prepare = Node::new(id("prepare"), Prepare(route)).declared_targets(match route {
            Route::Static => vec![],
            Route::Deliver => vec![DirectiveTarget::Deliver(id("worker"))],
            Route::Transition => vec![DirectiveTarget::Transition(id("worker"))],
        });
        let mut edges = vec![Edge {
            source: id("worker"),
            target: id("report"),
            when: None,
        }];
        if !matches!(route, Route::Deliver) {
            edges.push(Edge {
                source: id("prepare"),
                target: id("worker"),
                when: None,
            });
        }
        graphs.push(Arc::new(
            Graph::build_with_initializer(
                vec![prepare, worker, Node::new(id("report"), Report)],
                edges,
                vec![id("prepare")],
                id("report"),
                |input, ctx| async move {
                    assert_eq!(input.entry(&id("prepare"))?.values().len(), 1);
                    ctx.resources().identities.lock().unwrap().push(Identity {
                        run: ctx.run_id().into(),
                        parent: ctx.parent_run_id().map(str::to_owned),
                        node: ctx.parent_node().cloned(),
                        depth: ctx.depth(),
                    });
                    Ok(Level {
                        depth: ctx.depth(),
                        visits: 0,
                    })
                },
            )
            .unwrap(),
        ));
    }
    graphs
}

#[tokio::test]
async fn three_and_five_levels_share_the_selected_driver_and_ordinary_run_contract() {
    for count in [3, 5] {
        for route in [Route::Static, Route::Deliver, Route::Transition] {
            let graphs = layers(count, route);
            for k in [1, 2] {
                let alternate = Reverse::new(k);
                for scheduler in [local(k), alternate.clone() as Arc<dyn Scheduler>] {
                    let before = alternate.calls.load(Ordering::SeqCst);
                    // Also execute every layer as a root to inspect its ordinary NodeRun records.
                    for (index, graph) in graphs.iter().enumerate() {
                        let resources = Arc::new(Resources {
                            token: Arc::new(Token(73)),
                            identities: Mutex::new(vec![]),
                        });
                        let log = Arc::new(InMemoryEventLog::new());
                        let context = RunContext::root("root".into(), count, resources.clone())
                            .with_event_log(log.clone());
                        let run = scheduler
                            .clone()
                            .run(
                                graph,
                                input("prepare", vec![json(resources.token.as_ref())]),
                                context,
                            )
                            .await
                            .unwrap();
                        assert_eq!(run.status(), RunStatus::Completed);
                        assert_eq!(run.state().visits, 2);
                        assert_eq!(run.state().depth, 0);
                        assert_eq!(run.depth(), 0);
                        assert_eq!(run.waves(), 3);
                        assert_eq!(run.final_output().unwrap().0, resources.token.0);
                        assert_eq!(
                            run.instances(&id("worker")).len(),
                            usize::from(matches!(route, Route::Deliver))
                        );
                        let worker = if matches!(route, Route::Deliver) {
                            NodeKey::Instance {
                                template: id("worker"),
                                key: "same-key".into(),
                            }
                        } else {
                            key("worker")
                        };
                        for node_key in [key("prepare"), worker.clone(), key("report")] {
                            let node = run.node(&node_key).unwrap();
                            assert_eq!(node.status(), NodeStatus::Completed);
                            assert_eq!(node.attempts(), 1);
                        }
                        let events = log.all_events().await.unwrap();
                        let records = resources.identities.lock().unwrap();
                        assert_eq!(records.len(), index + 1);
                        for (depth, record) in records.iter().enumerate() {
                            let history = events
                                .iter()
                                .filter(|event| event.run_id() == record.run)
                                .collect::<Vec<_>>();
                            assert_eq!(history.first().unwrap().kind(), "run_started");
                            assert_eq!(history.last().unwrap().kind(), "run_completed");
                            assert_eq!(
                                history
                                    .iter()
                                    .map(|event| event.seq().get())
                                    .collect::<Vec<_>>(),
                                (1..=history.len() as u64).collect::<Vec<_>>()
                            );
                            assert!(
                                history
                                    .iter()
                                    .all(|event| event.parent_run_id() == record.parent.as_deref())
                            );
                            assert_eq!(record.depth, depth);
                            assert_eq!(
                                record.parent.as_deref(),
                                depth.checked_sub(1).map(|n| records[n].run.as_str())
                            );
                            assert_eq!(record.node.as_ref(), (depth > 0).then_some(&worker));
                        }
                        let unique: std::collections::HashSet<_> =
                            records.iter().map(|r| &r.run).collect();
                        assert_eq!(unique.len(), index + 1);
                    }
                    if Arc::ptr_eq(&scheduler, &(alternate.clone() as Arc<dyn Scheduler>)) {
                        assert_eq!(
                            alternate.calls.load(Ordering::SeqCst) - before,
                            count * (count + 1) / 2
                        );
                    }
                }
            }
        }
    }
}

#[derive(Clone, Copy)]
enum DriverFailure {
    Partial,
    Protocol,
    EarlyReturn,
    AfterEnd,
}
impl Scheduler for DriverFailure {
    fn config(&self) -> SchedulerConfig {
        SchedulerConfig::new(2, 16).unwrap()
    }
    fn drive<'a>(
        self: Arc<Self>,
        execution: &'a mut (dyn Execution + 'a),
    ) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'a>> {
        Box::pin(async move {
            match *self {
                Self::EarlyReturn => return Ok(()),
                Self::AfterEnd => {
                    while let Some(ready) = execution.advance().await? {
                        for key in ready {
                            let result = execution.dispatch(&key)?.await;
                            execution.complete(key, result).await?;
                        }
                    }
                }
                Self::Partial => {
                    let ready = execution.advance().await?.unwrap();
                    let first = tokio::spawn(execution.dispatch(&ready[0])?);
                    let second = tokio::spawn(execution.dispatch(&ready[1])?);
                    // Reap in the opposite order; settlement must still follow ready order.
                    execution
                        .complete(ready[1].clone(), second.await.unwrap())
                        .await?;
                    execution
                        .complete(ready[0].clone(), first.await.unwrap())
                        .await?;
                }
                Self::Protocol => {
                    assert!(matches!(
                        execution.dispatch(&key("first")),
                        Err(Error::Scheduling { .. })
                    ));
                    let ready = execution.advance().await?.unwrap();
                    assert!(matches!(
                        execution.advance().await,
                        Err(Error::Scheduling { .. })
                    ));
                    assert!(matches!(
                        execution.complete(ready[0].clone(), Ok(())).await,
                        Err(Error::Scheduling { .. })
                    ));
                    assert!(matches!(
                        execution.dispatch(&key("absent")),
                        Err(Error::Scheduling { .. })
                    ));
                    let future = execution.dispatch(&ready[0])?;
                    assert!(matches!(
                        execution.dispatch(&ready[0]),
                        Err(Error::Scheduling { .. })
                    ));
                    assert!(matches!(
                        execution.complete(ready[0].clone(), Ok(())).await,
                        Err(Error::Scheduling { .. })
                    ));
                    let result = future.await;
                    execution.complete(ready[0].clone(), result).await?;
                    return execution.complete(ready[0].clone(), Ok(())).await;
                }
            }
            Err(Error::scheduling(std::io::Error::other("driver offline")))
        })
    }
}
struct Signal(bool);
impl NodeInstance<Wave> for Signal {
    type Output = usize;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Wave>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Wave, usize>, Error> {
        if self.0 {
            return Err(Error::execution(std::io::Error::other("node failed")));
        }
        Ok(Outcome {
            value: Some(Arc::new(17)),
            state_delta: WaveDelta {
                order: Some(Cell::new(1)),
            },
            directive: Some(Directive::Deliver(vec![DeliverTarget {
                template: id("worker"),
                key: "never-routed".into(),
                payload: Arc::new(serde_json::Value::Null),
            }])),
        })
    }
}

#[tokio::test]
async fn driver_failures_settle_started_tasks_preserve_sources_and_suppress_routes() {
    let graph = Graph::<Wave, usize>::build(
        vec![
            Node::new(id("first"), Signal(false)),
            Node::new(id("second"), Signal(true)),
            Node::new(id("queued"), Signal(false)),
            Node::new(id("worker"), Signal(false)).template(true),
        ],
        vec![],
        vec![id("first"), id("second"), id("queued")],
        id("first"),
    )
    .unwrap();
    for mode in [
        DriverFailure::Partial,
        DriverFailure::Protocol,
        DriverFailure::EarlyReturn,
        DriverFailure::AfterEnd,
    ] {
        let driver: Arc<dyn Scheduler> = Arc::new(mode);
        let log = Arc::new(InMemoryEventLog::new());
        let weak = Arc::downgrade(&driver);
        let run = driver
            .run(
                &graph,
                GraphInput::new(
                    ["first", "second", "queued"]
                        .map(|name| (id(name), Input::new(vec![])))
                        .into(),
                ),
                RunContext::root("failed".into(), 0, Arc::new(())).with_event_log(log.clone()),
            )
            .await
            .unwrap();
        assert_eq!(run.status(), RunStatus::Failed);
        let events = log.events("failed", 0).await.unwrap();
        assert_eq!(events.last().unwrap().kind(), "run_failed");
        assert_eq!(
            events
                .iter()
                .filter(|event| event.kind() == "control")
                .count(),
            usize::from(!matches!(mode, DriverFailure::EarlyReturn))
        );
        assert!(run.final_output().is_none());
        assert!(run.instances(&id("worker")).is_empty());
        assert!(weak.upgrade().is_none());
        assert!(matches!(
            run.errors().last(),
            Some(RunError::Scheduling {
                source: Error::Scheduling { .. }
            })
        ));
        if matches!(mode, DriverFailure::Partial | DriverFailure::AfterEnd) {
            let RunError::Node {
                key: failed,
                source: Error::Node(NodeError::Execution(source)),
            } = &run.errors()[0]
            else {
                panic!("missing first node error")
            };
            assert_eq!(failed, &key("second"));
            assert_eq!(
                source.downcast_ref::<std::io::Error>().unwrap().to_string(),
                "node failed"
            );
            let Some(RunError::Scheduling {
                source: Error::Scheduling { source },
            }) = run.errors().last()
            else {
                unreachable!()
            };
            assert_eq!(
                source.downcast_ref::<std::io::Error>().unwrap().to_string(),
                "driver offline"
            );
        }
        assert_eq!(
            run.node(&key("queued")).unwrap().attempts(),
            u32::from(matches!(mode, DriverFailure::AfterEnd))
        );
        assert_eq!(
            run.state().order.len(),
            match mode {
                DriverFailure::EarlyReturn => 0,
                DriverFailure::AfterEnd => 2,
                _ => 1,
            }
        );
        for name in ["first", "second", "queued"] {
            assert_ne!(run.node(&key(name)).unwrap().status(), NodeStatus::Running);
        }
        if !matches!(mode, DriverFailure::EarlyReturn) {
            assert_eq!(
                run.node(&key("first")).unwrap().status(),
                NodeStatus::Completed
            );
            assert!(run.node(&key("first")).unwrap().output().is_some());
        }
    }
}

#[tokio::test]
async fn a_driver_error_after_successful_settlement_prevents_a_successful_run() {
    #[derive(serde::Serialize, Default, State, serde::Deserialize)]
    struct Empty {}
    struct Done;
    impl NodeInstance<Empty> for Done {
        type Output = ();
        async fn run(
            &self,
            _: &Input,
            _: NodeContext<Empty>,
            _: Arc<dyn Scheduler>,
        ) -> Result<Outcome<Empty, ()>, Error> {
            Ok(Outcome {
                value: Some(Arc::new(())),
                state_delta: Default::default(),
                directive: None,
            })
        }
    }
    let graph = Graph::<Empty, ()>::build(
        vec![Node::new(id("entry"), Done)],
        vec![],
        vec![],
        id("entry"),
    )
    .unwrap();
    let driver: Arc<dyn Scheduler> = Arc::new(DriverFailure::AfterEnd);
    let run = driver
        .run(
            &graph,
            input("entry", vec![]),
            RunContext::root("end".into(), 0, Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(
        run.node(&key("entry")).unwrap().status(),
        NodeStatus::Completed
    );
    assert_eq!(run.status(), RunStatus::Failed);
    assert!(run.final_output().is_none());
    assert!(matches!(run.errors(), [RunError::Scheduling { .. }]));
}

#[tokio::test]
async fn a_fifth_level_failure_propagates_without_running_parent_successors() {
    let graphs = layers(5, Route::Deliver);
    let resources = Arc::new(Resources {
        token: Arc::new(Token(0)),
        identities: Mutex::new(vec![]),
    });
    for scheduler in [local(1), Reverse::new(1) as Arc<dyn Scheduler>] {
        resources.identities.lock().unwrap().clear();
        let run = scheduler
            .run(
                graphs.last().unwrap(),
                input("prepare", vec![json(resources.token.as_ref())]),
                RunContext::root("failed-tree".into(), 4, resources.clone()),
            )
            .await
            .unwrap();
        assert_eq!(run.status(), RunStatus::Failed);
        assert_eq!(run.state().visits, 1);
        assert_eq!(resources.identities.lock().unwrap().len(), 5);
        assert_eq!(run.instances(&id("worker")).len(), 1);
        let worker = &run.instances(&id("worker"))[0];
        assert_eq!(run.node(worker).unwrap().status(), NodeStatus::Failed);
        assert_eq!(run.node(&key("report")).unwrap().attempts(), 0);
        assert!(
            matches!(run.errors(), [RunError::Node { key, source: Error::Call(CallError::Execution { .. }) }] if key == worker)
        );
        assert!(run.final_output().is_none());
    }
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn runtime_carries_observation_context_across_an_independent_driver() {
    use tracing::instrument::WithSubscriber;
    use tracing_subscriber::{
        Layer,
        layer::{Context, SubscriberExt},
    };
    struct CountEvents(Arc<AtomicUsize>);
    impl<S: tracing::Subscriber> Layer<S> for CountEvents {
        fn on_event(&self, _: &tracing::Event<'_>, _: Context<'_, S>) {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
    }
    // Other tests run without a subscriber; register both contexts for tracing's interest cache.
    let _unobserved = tracing::Dispatch::new(tracing::subscriber::NoSubscriber::default());
    let events = Arc::new(AtomicUsize::new(0));
    let subscriber = tracing_subscriber::registry().with(CountEvents(events.clone()));
    let graphs = layers(5, Route::Static);
    let resources = Arc::new(Resources {
        token: Arc::new(Token(73)),
        identities: Mutex::new(vec![]),
    });
    let scheduler: Arc<dyn Scheduler> = Reverse::new(1);
    let run = scheduler
        .run(
            graphs.last().unwrap(),
            input("prepare", vec![json(resources.token.as_ref())]),
            RunContext::root("observed".into(), 4, resources),
        )
        .with_subscriber(subscriber)
        .await
        .unwrap();
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(events.load(Ordering::SeqCst), 10);
}
