use crate::*;
use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
};

#[derive(Default, State)]
struct Data {
    #[reducer(Add)]
    total: usize,
}

// Deliberately neither Default nor Clone.
#[derive(State)]
struct Initialized {
    #[reducer(Override)]
    value: usize,
}

struct NonClone(usize);
struct Read;
impl NodeInstance<Initialized, AtomicUsize> for Read {
    type Output = NonClone;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Initialized, AtomicUsize>,
    ) -> Result<Outcome<Initialized, NonClone>, Error> {
        ctx.run.resources().fetch_add(1, Ordering::SeqCst);
        assert!(
            input
                .entry_origins()
                .iter()
                .all(|origin| origin.origin == Origin::Run)
        );
        Ok(Outcome {
            value: Some(Arc::new(NonClone(ctx.state.value))),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
fn input(values: Vec<SharedValue>) -> GraphInput {
    GraphInput::new(HashMap::from([(NodeId::new("entry"), Input::new(values))]))
}
fn scheduler(k: usize) -> LocalScheduler {
    LocalScheduler::new(SchedulerConfig::new(k, 8).unwrap())
}
fn context<R: Send + Sync + 'static>(resources: Arc<R>) -> RunContext<R> {
    RunContext::root("root".into(), 3, resources)
}

#[tokio::test]
async fn validates_before_async_initialization_and_releases_resources_with_run_retained() {
    let initialized = Arc::new(AtomicUsize::new(0));
    let observed = initialized.clone();
    let entered = Arc::new(tokio::sync::Notify::new());
    let release = Arc::new(tokio::sync::Notify::new());
    let (started, proceed) = (entered.clone(), release.clone());
    let graph = Graph::<Initialized, NonClone, AtomicUsize>::builder_with_initializer()
        .nodes(vec![Node::new(NodeId::new("entry"), Read)])
        .edges(vec![])
        .entries(vec![])
        .return_node(NodeId::new("entry"))
        .state_initializer(move |input, ctx| {
            let (observed, started, proceed) = (observed.clone(), started.clone(), proceed.clone());
            async move {
                observed.fetch_add(1, Ordering::SeqCst);
                started.notify_one();
                proceed.notified().await;
                Ok(Initialized {
                    value: *input.entry(&NodeId::new("entry"))?.entry::<usize>()?
                        + ctx.resources().load(Ordering::SeqCst),
                })
            }
        })
        .build()
        .unwrap();
    assert_eq!(initialized.load(Ordering::SeqCst), 0);
    let resources = Arc::new(AtomicUsize::new(10));
    let local = scheduler(1);
    let error = local
        .run(
            &graph,
            GraphInput::new(HashMap::from([(NodeId::new("extra"), Input::new(vec![]))])),
            context(resources.clone()),
        )
        .await
        .err()
        .unwrap();
    let Error::Call(CallError::Input { source }) = error else {
        panic!("wrong classification")
    };
    assert!(
        matches!(source.downcast_ref::<InputError>(), Some(InputError::EntrySetMismatch { missing, unexpected }) if missing == &[NodeId::new("entry")] && unexpected == &[NodeId::new("extra")])
    );
    assert_eq!(initialized.load(Ordering::SeqCst), 0);
    let future = local.run(
        &graph,
        input(vec![Arc::new(5_usize)]),
        context(resources.clone()),
    );
    tokio::pin!(future);
    tokio::select! { biased; result = &mut future => panic!("early result: {}", result.is_ok()), _ = entered.notified() => {} }
    assert_eq!(resources.load(Ordering::SeqCst), 10);
    release.notify_one();
    let run = future.await.unwrap();
    assert_eq!(run.state().value, 15);
    assert_eq!(run.final_output().unwrap().0, 15);
    let returned = run.final_output().unwrap().clone();
    let node_output = run
        .node(&NodeKey::Static(NodeId::new("entry")))
        .unwrap()
        .output()
        .unwrap()
        .clone()
        .downcast::<NonClone>()
        .ok()
        .unwrap();
    assert!(Arc::ptr_eq(&returned, &node_output));
    let weak = Arc::downgrade(&resources);
    drop(resources);
    assert!(weak.upgrade().is_none());
    assert!(Arc::ptr_eq(&returned, &run.into_result().unwrap()));
}

struct Value<O> {
    value: Arc<O>,
}
impl<O: Send + Sync + 'static, R: Send + Sync + 'static> NodeInstance<Data, R> for Value<O> {
    type Output = O;
    async fn run(&self, _: &Input, _: NodeContext<Data, R>) -> Result<Outcome<Data, O>, Error> {
        Ok(Outcome {
            value: Some(self.value.clone()),
            state_delta: DataDelta { total: Some(1) },
            directive: None,
        })
    }
}
fn value<O: Send + Sync + 'static>(id: &str, output: O) -> Node<Data> {
    Node::new(
        NodeId::new(id),
        Value {
            value: Arc::new(output),
        },
    )
}

#[test]
fn return_declarations_and_entry_roles_are_checked_once() {
    let build = |nodes, edges, entries, ret| {
        Graph::<Data, usize>::build(nodes, edges, entries, NodeId::new(ret))
    };
    assert!(matches!(
        build(vec![value("entry", 1_usize)], vec![], vec![], "unknown"),
        Err(Error::Graph(GraphError::UnknownReturnNode { .. }))
    ));
    assert!(matches!(
        build(
            vec![value("entry", 1_usize).template(true)],
            vec![],
            vec![],
            "entry"
        ),
        Err(Error::Graph(GraphError::InvalidReturnNode { .. }))
    ));
    assert!(matches!(
        build(vec![value("entry", ())], vec![], vec![], "entry"),
        Err(Error::Graph(GraphError::ReturnTypeMismatch { .. }))
    ));
    assert!(matches!(
        build(
            vec![value("entry", 1_usize)],
            vec![],
            vec![NodeId::new("unknown")],
            "entry"
        ),
        Err(Error::Graph(GraphError::UnknownEntry { .. }))
    ));
    assert!(matches!(
        build(
            vec![value("entry", 1_usize), value("worker", ()).template(true)],
            vec![],
            vec![NodeId::new("worker")],
            "entry"
        ),
        Err(Error::Graph(GraphError::InvalidTemplateRole { .. }))
    ));
    assert!(matches!(
        build(
            vec![
                value("entry", 1_usize)
                    .declared_targets(vec![DirectiveTarget::Transition(NodeId::new("absent"))])
            ],
            vec![],
            vec![],
            "entry"
        ),
        Err(Error::Graph(GraphError::InvalidDeclaredTarget { .. }))
    ));
}

#[tokio::test]
async fn unit_optional_and_heterogeneous_multi_entry_returns() {
    for output in [None, Some(7_usize)] {
        let graph = Graph::<Data, Option<usize>>::build(
            vec![value("entry", output)],
            vec![],
            vec![],
            NodeId::new("entry"),
        )
        .unwrap();
        assert_eq!(
            *scheduler(1)
                .run(&graph, input(vec![]), context(Arc::new(())))
                .await
                .unwrap()
                .into_result()
                .unwrap(),
            output
        );
    }
    let graph = Graph::<Data, ()>::build(
        vec![value("entry", ())],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    scheduler(1)
        .run(&graph, input(vec![]), context(Arc::new(())))
        .await
        .unwrap()
        .into_result()
        .unwrap();
    struct Typed;
    impl NodeInstance<Data> for Typed {
        type Output = usize;
        async fn run(
            &self,
            input: &Input,
            ctx: NodeContext<Data>,
        ) -> Result<Outcome<Data, usize>, Error> {
            let value = match ctx.key {
                NodeKey::Static(ref id) if id.as_str() == "text" => input.entry::<String>()?.len(),
                _ => *input.entry::<usize>()?,
            };
            Ok(Outcome {
                value: Some(Arc::new(value)),
                state_delta: DataDelta { total: Some(value) },
                directive: None,
            })
        }
    }
    let graph = Graph::<Data, usize>::build(
        vec![
            Node::new(NodeId::new("text"), Typed),
            Node::new(NodeId::new("number"), Typed),
        ],
        vec![],
        vec![],
        NodeId::new("number"),
    )
    .unwrap();
    let make_input = || {
        GraphInput::new(HashMap::from([
            (NodeId::new("number"), Input::new(vec![Arc::new(8_usize)])),
            (
                NodeId::new("text"),
                Input::new(vec![Arc::new("abc".to_owned())]),
            ),
        ]))
    };
    let local = scheduler(2);
    let (first, second) = tokio::join!(
        local.run(&graph, make_input(), context(Arc::new(()))),
        local.run(&graph, make_input(), context(Arc::new(())))
    );
    for run in [first.unwrap(), second.unwrap()] {
        assert_eq!(run.state().total, 11);
        assert_eq!(*run.into_result().unwrap(), 8);
    }
}

struct Fail;
impl NodeInstance<Data> for Fail {
    type Output = usize;
    async fn run(&self, _: &Input, _: NodeContext<Data>) -> Result<Outcome<Data, usize>, Error> {
        Err(Error::execution(std::io::Error::other("private-source")))
    }
}

#[tokio::test]
async fn early_return_waits_for_errors_and_call_classifies_all_failure_boundaries() {
    let graph = Graph::<Data, usize>::build(
        vec![
            value("entry", 1_usize),
            Node::new(NodeId::new("fail"), Fail),
        ],
        vec![Edge {
            source: NodeId::new("entry"),
            target: NodeId::new("fail"),
            when: None,
        }],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let local = scheduler(1);
    let parent = context(Arc::new(()));
    let key = NodeKey::Static(NodeId::new("parent"));
    let run = local
        .run(&graph, input(vec![]), parent.clone())
        .await
        .unwrap();
    assert_eq!(run.waves(), 2);
    assert!(run.final_output().is_none());
    assert_eq!(run.errors().len(), 1);
    assert_eq!(run.state().total, 1);
    let error = run.into_result().unwrap_err();
    assert!(matches!(&error, Error::Call(CallError::Execution { .. })));
    assert!(!error.to_string().contains("private-source"));
    assert!(
        std::error::Error::source(&error)
            .unwrap()
            .source()
            .is_some()
    );
    assert!(matches!(
        local.call(&graph, input(vec![]), &parent, &key).await,
        Err(Error::Call(CallError::Execution { .. }))
    ));
    assert!(matches!(
        local
            .call(&graph, GraphInput::new(HashMap::new()), &parent, &key)
            .await,
        Err(Error::Call(CallError::Input { .. }))
    ));
    assert!(matches!(
        local
            .call(
                &graph,
                input(vec![]),
                &RunContext::root("zero".into(), 0, Arc::new(())),
                &key
            )
            .await,
        Err(Error::Call(CallError::DepthExceeded { .. }))
    ));
    let graph = Graph::<Data, usize>::build_with_initializer(
        vec![value("entry", 1_usize)],
        vec![],
        vec![],
        NodeId::new("entry"),
        |_, _| async { Err(Error::execution(std::io::Error::other("private-init"))) },
    )
    .unwrap();
    let error = local
        .call(&graph, input(vec![]), &parent, &key)
        .await
        .unwrap_err();
    assert!(matches!(
        &error,
        Error::Call(CallError::Initialization { .. })
    ));
    assert!(!error.to_string().contains("private-init"));
    let graph = Graph::<Data, usize>::build(
        vec![value("entry", 1_usize), value("return", 2_usize)],
        vec![Edge {
            source: NodeId::new("entry"),
            target: NodeId::new("return"),
            when: Some(Arc::new(|_| false)),
        }],
        vec![],
        NodeId::new("return"),
    )
    .unwrap();
    assert!(matches!(
        local.call(&graph, input(vec![]), &parent, &key).await,
        Err(Error::Call(CallError::MissingOutput))
    ));
}

struct Forward<E, T> {
    scheduler: Arc<E>,
    target: Arc<T>,
    resources: Arc<AtomicUsize>,
    retry: bool,
}
impl<E, T> NodeInstance<Data> for Forward<E, T>
where
    E: Scheduler<T, NonClone, AtomicUsize> + 'static,
    T: Send + Sync + 'static,
{
    type Output = NonClone;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Data>,
    ) -> Result<Outcome<Data, NonClone>, Error> {
        let selected = *input.all::<usize>()?[0];
        let parent = ctx.run.with_resources(self.resources.clone());
        let mut result = self
            .scheduler
            .call(
                &self.target,
                super::subgraph_tests::input(vec![Arc::new(selected)]),
                &parent,
                &ctx.key,
            )
            .await;
        if self.retry && result.is_err() {
            result = self
                .scheduler
                .call(
                    &self.target,
                    super::subgraph_tests::input(vec![Arc::new(selected)]),
                    &parent,
                    &ctx.key,
                )
                .await;
        }
        let value = result?;
        Ok(Outcome {
            state_delta: DataDelta {
                total: Some(value.0),
            },
            value: Some(value),
            directive: None,
        })
    }
}

#[tokio::test]
async fn retry_is_a_new_sibling_with_isolated_state_and_unreverted_side_effects() {
    let seen = Arc::new(Mutex::new(Vec::new()));
    let observed = seen.clone();
    let child = Arc::new(
        Graph::<Initialized, NonClone, AtomicUsize>::build_with_initializer(
            vec![Node::new(NodeId::new("entry"), Read)],
            vec![],
            vec![],
            NodeId::new("entry"),
            move |input, ctx| {
                observed.lock().unwrap().push(ctx.clone());
                async move {
                    assert_eq!(input.entry(&NodeId::new("entry"))?.all::<usize>()?.len(), 1);
                    let attempt = ctx.resources().fetch_add(1, Ordering::SeqCst);
                    if attempt == 0 {
                        return Err(Error::execution(std::io::Error::other("first attempt")));
                    }
                    Ok(Initialized {
                        value: *input.entry(&NodeId::new("entry"))?.entry::<usize>()?,
                    })
                }
            },
        )
        .unwrap(),
    );
    let resources = Arc::new(AtomicUsize::new(0));
    let local = Arc::new(scheduler(1));
    let graph = Graph::<Data, NonClone>::build(
        vec![Node::new(
            NodeId::new("entry"),
            Forward {
                scheduler: local.clone(),
                target: child,
                resources: resources.clone(),
                retry: true,
            },
        )],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = local
        .run(
            &graph,
            input(vec![
                Arc::new(7_usize),
                Arc::new("not forwarded".to_owned()),
            ]),
            context(Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(run.state().total, 7);
    assert_eq!(run.final_output().unwrap().0, 7);
    assert_eq!(
        run.node(&NodeKey::Static(NodeId::new("entry")))
            .unwrap()
            .attempts(),
        1
    );
    assert_eq!(resources.load(Ordering::SeqCst), 3);
    let seen = seen.lock().unwrap();
    assert_eq!(seen.len(), 2);
    assert_ne!(seen[0].run_id(), seen[1].run_id());
    for ctx in seen.iter() {
        assert_eq!(ctx.parent_run_id(), Some("root"));
        assert_eq!(
            ctx.parent_node(),
            Some(&NodeKey::Static(NodeId::new("entry")))
        );
        assert_eq!(ctx.depth(), 1);
    }
}

struct RemoteTarget;
struct FakeScheduler {
    output: Arc<NonClone>,
}
impl Scheduler<RemoteTarget, NonClone, AtomicUsize> for FakeScheduler {
    async fn call(
        &self,
        _: &RemoteTarget,
        input: GraphInput,
        parent: &RunContext<AtomicUsize>,
        key: &NodeKey,
    ) -> Result<Arc<NonClone>, Error> {
        let child = parent.child(key)?;
        assert_eq!(child.depth(), 1);
        assert_eq!(*input.entry(&NodeId::new("entry"))?.entry::<usize>()?, 9);
        Ok(self.output.clone())
    }
}
#[tokio::test]
async fn injected_non_graph_scheduler_forwards_the_original_arc() {
    let output = Arc::new(NonClone(9));
    let graph = Graph::<Data, NonClone>::build(
        vec![Node::new(
            NodeId::new("entry"),
            Forward {
                scheduler: Arc::new(FakeScheduler {
                    output: output.clone(),
                }),
                target: Arc::new(RemoteTarget),
                resources: Arc::new(AtomicUsize::new(0)),
                retry: false,
            },
        )],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = scheduler(1)
        .run(
            &graph,
            input(vec![Arc::new(9_usize)]),
            context(Arc::new(())),
        )
        .await
        .unwrap();
    assert!(Arc::ptr_eq(&output, &run.into_result().unwrap()));
}

struct Fanout;
impl NodeInstance<Data> for Fanout {
    type Output = ();
    async fn run(&self, _: &Input, _: NodeContext<Data>) -> Result<Outcome<Data, ()>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: Some(Directive::Deliver(
                (1..=3)
                    .map(|i| DeliverTarget {
                        template: NodeId::new("worker"),
                        key: i.to_string(),
                        payload: Arc::new(i as usize),
                    })
                    .collect(),
            )),
        })
    }
}
struct Aggregate;
impl NodeInstance<Data> for Aggregate {
    type Output = usize;
    async fn run(
        &self,
        input: &Input,
        _: NodeContext<Data>,
    ) -> Result<Outcome<Data, usize>, Error> {
        let values = input.many::<NonClone>(&NodeId::new("worker"))?;
        assert_eq!(values.iter().map(|v| v.0).collect::<Vec<_>>(), [1, 2, 3]);
        Ok(Outcome {
            value: Some(Arc::new(values.iter().map(|v| v.0).sum())),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
#[tokio::test]
async fn template_calls_reuse_child_ids_without_sharing_run_records() {
    let seen = Arc::new(Mutex::new(Vec::new()));
    let recorded = seen.clone();
    let child = Arc::new(
        Graph::<Initialized, NonClone, AtomicUsize>::build_with_initializer(
            vec![
                Node::new(NodeId::new("entry"), ChildPlan),
                Node::new(NodeId::new("worker"), Read).template(true),
                Node::new(NodeId::new("aggregate"), ChildReturn),
            ],
            vec![Edge {
                source: NodeId::new("worker"),
                target: NodeId::new("aggregate"),
                when: None,
            }],
            vec![NodeId::new("entry")],
            NodeId::new("aggregate"),
            move |input, ctx| {
                recorded
                    .lock()
                    .unwrap()
                    .push((ctx.run_id().to_owned(), ctx.parent_node().cloned()));
                async move {
                    Ok(Initialized {
                        value: *input.entry(&NodeId::new("entry"))?.entry::<usize>()?,
                    })
                }
            },
        )
        .unwrap(),
    );
    let local = Arc::new(scheduler(2));
    let graph = Graph::<Data, usize>::build(
        vec![
            Node::new(NodeId::new("entry"), Fanout),
            Node::new(
                NodeId::new("worker"),
                Forward {
                    scheduler: local.clone(),
                    target: child,
                    resources: Arc::new(AtomicUsize::new(0)),
                    retry: false,
                },
            )
            .template(true),
            Node::new(NodeId::new("aggregate"), Aggregate),
        ],
        vec![Edge {
            source: NodeId::new("worker"),
            target: NodeId::new("aggregate"),
            when: None,
        }],
        vec![NodeId::new("entry")],
        NodeId::new("aggregate"),
    )
    .unwrap();
    for _ in 0..2 {
        let run = local
            .run(&graph, input(vec![]), context(Arc::new(())))
            .await
            .unwrap();
        assert_eq!(run.state().total, 6);
        assert_eq!(run.instances(&NodeId::new("worker")).len(), 3);
        assert_eq!(*run.into_result().unwrap(), 6);
    }
    let seen = seen.lock().unwrap();
    assert_eq!(
        seen.iter()
            .map(|(id, _)| id)
            .collect::<std::collections::HashSet<_>>()
            .len(),
        6
    );
    assert!(seen.iter().all(|(_, key)| matches!(key, Some(NodeKey::Instance { template, .. }) if template == &NodeId::new("worker"))));
}

struct HandleFailure {
    scheduler: Arc<LocalScheduler>,
    child: Graph<Data, usize>,
}
impl NodeInstance<Data> for HandleFailure {
    type Output = usize;
    async fn run(&self, _: &Input, ctx: NodeContext<Data>) -> Result<Outcome<Data, usize>, Error> {
        assert!(matches!(
            self.scheduler
                .call(&self.child, input(vec![]), &ctx.run, &ctx.key)
                .await,
            Err(Error::Call(CallError::Execution { .. }))
        ));
        Ok(Outcome {
            value: Some(Arc::new(42)),
            state_delta: DataDelta { total: Some(42) },
            directive: Some(Directive::Transition {
                target: NodeId::new("return"),
                payload: None,
                immediate: true,
            }),
        })
    }
}
#[tokio::test]
async fn handled_failure_commits_parent_delta_and_directive() {
    let local = Arc::new(scheduler(1));
    let child = Graph::<Data, usize>::build(
        vec![Node::new(NodeId::new("entry"), Fail)],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let graph = Graph::<Data, usize>::build(
        vec![
            Node::new(
                NodeId::new("entry"),
                HandleFailure {
                    scheduler: local.clone(),
                    child,
                },
            ),
            value("return", 9_usize),
        ],
        vec![],
        vec![NodeId::new("entry")],
        NodeId::new("return"),
    )
    .unwrap();
    let run = local
        .run(&graph, input(vec![]), context(Arc::new(())))
        .await
        .unwrap();
    assert_eq!(run.state().total, 43);
    assert_eq!(
        run.node(&NodeKey::Static(NodeId::new("entry")))
            .unwrap()
            .status(),
        NodeStatus::Completed
    );
    assert_eq!(*run.into_result().unwrap(), 9);
}

struct Concurrency {
    starts: tokio::sync::mpsc::UnboundedSender<(String, usize)>,
    permits: tokio::sync::Semaphore,
    counts: Mutex<HashMap<String, (usize, usize)>>,
}
struct ConcurrentNode {
    child: Option<Arc<Graph<Data, usize, Concurrency>>>,
    local: Arc<LocalScheduler>,
}
impl NodeInstance<Data, Concurrency> for ConcurrentNode {
    type Output = usize;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data, Concurrency>,
    ) -> Result<Outcome<Data, usize>, Error> {
        let resources = ctx.run.resources();
        {
            let mut counts = resources.counts.lock().unwrap();
            let (active, max) = counts.entry(ctx.run.run_id().into()).or_default();
            *active += 1;
            *max = (*max).max(*active);
        }
        resources
            .starts
            .send((ctx.run.run_id().into(), ctx.run.depth()))
            .unwrap();
        if let Some(child) = &self.child {
            let input = GraphInput::new(
                ["one", "two", "three"]
                    .into_iter()
                    .map(|name| (NodeId::new(name), Input::new(vec![])))
                    .collect(),
            );
            self.local
                .call(child.as_ref(), input, &ctx.run, &ctx.key)
                .await?;
        } else {
            resources.permits.acquire().await.unwrap().forget();
        }
        resources
            .counts
            .lock()
            .unwrap()
            .get_mut(ctx.run.run_id())
            .unwrap()
            .0 -= 1;
        Ok(Outcome {
            value: Some(Arc::new(1)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
#[tokio::test]
async fn per_run_concurrency_refills_slots_while_waiting_parents_keep_theirs() {
    let local = Arc::new(scheduler(2));
    let child = Arc::new(
        Graph::<Data, usize, Concurrency>::build(
            ["one", "two", "three"]
                .into_iter()
                .map(|id| {
                    Node::new(
                        NodeId::new(id),
                        ConcurrentNode {
                            child: None,
                            local: local.clone(),
                        },
                    )
                })
                .collect(),
            vec![],
            vec![],
            NodeId::new("three"),
        )
        .unwrap(),
    );
    let parent = Graph::<Data, usize, Concurrency>::build(
        ["one", "two", "three"]
            .into_iter()
            .map(|id| {
                Node::new(
                    NodeId::new(id),
                    ConcurrentNode {
                        child: Some(child.clone()),
                        local: local.clone(),
                    },
                )
            })
            .collect(),
        vec![],
        vec![],
        NodeId::new("three"),
    )
    .unwrap();
    let (starts, mut events) = tokio::sync::mpsc::unbounded_channel();
    let resources = Arc::new(Concurrency {
        starts,
        permits: tokio::sync::Semaphore::new(0),
        counts: Mutex::new(HashMap::new()),
    });
    let input = GraphInput::new(
        ["one", "two", "three"]
            .into_iter()
            .map(|id| (NodeId::new(id), Input::new(vec![])))
            .collect(),
    );
    let future = local.run(&parent, input, context(resources.clone()));
    tokio::pin!(future);
    let mut observed = Vec::new();
    while observed.len() < 6 {
        tokio::select! { biased; _ = &mut future => panic!("blocked children completed"), event = events.recv() => observed.push(event.unwrap()) }
    }
    assert_eq!(observed.iter().filter(|(_, depth)| *depth == 0).count(), 2);
    assert_eq!(observed.iter().filter(|(_, depth)| *depth == 1).count(), 4);
    assert_eq!(resources.counts.lock().unwrap()["root"], (2, 2));
    assert_eq!(resources.counts.lock().unwrap().len(), 3);
    resources.permits.add_permits(9);
    future.await.unwrap().into_result().unwrap();
    let counts = resources.counts.lock().unwrap();
    assert_eq!(counts.len(), 4);
    assert!(
        counts
            .values()
            .all(|(active, max)| *active == 0 && *max <= 2)
    );
}

struct ChildPlan;
impl NodeInstance<Initialized, AtomicUsize> for ChildPlan {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Initialized, AtomicUsize>,
    ) -> Result<Outcome<Initialized, ()>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: Some(Directive::Deliver(vec![DeliverTarget {
                template: NodeId::new("worker"),
                key: "same".into(),
                payload: Arc::new(()),
            }])),
        })
    }
}
struct ChildReturn;
impl NodeInstance<Initialized, AtomicUsize> for ChildReturn {
    type Output = NonClone;
    async fn run(
        &self,
        input: &Input,
        _: NodeContext<Initialized, AtomicUsize>,
    ) -> Result<Outcome<Initialized, NonClone>, Error> {
        assert!(
            matches!(&input.origins(&NodeId::new("worker"))[0].origin, Origin::Node(NodeKey::Instance { key, .. }) if key == "same")
        );
        Ok(Outcome {
            value: Some(Arc::new(NonClone(
                input.one::<NonClone>(&NodeId::new("worker"))?.0,
            ))),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

struct RearmWithoutOutput;
impl NodeInstance<Data> for RearmWithoutOutput {
    type Output = usize;
    async fn run(&self, _: &Input, ctx: NodeContext<Data>) -> Result<Outcome<Data, usize>, Error> {
        let first = ctx.state.total == 0;
        Ok(Outcome {
            value: first.then(|| Arc::new(7)),
            state_delta: DataDelta { total: Some(1) },
            directive: first.then(|| Directive::Transition {
                target: NodeId::new("entry"),
                payload: None,
                immediate: true,
            }),
        })
    }
}
#[tokio::test]
async fn reactivation_cannot_deliver_the_previous_return_value() {
    let graph = Graph::<Data, usize>::build(
        vec![Node::new(NodeId::new("entry"), RearmWithoutOutput)],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = scheduler(1)
        .run(&graph, input(vec![]), context(Arc::new(())))
        .await
        .unwrap();
    assert_eq!(run.state().total, 2);
    let node = run.node(&NodeKey::Static(NodeId::new("entry"))).unwrap();
    assert_eq!(node.attempts(), 2);
    assert!(node.output().is_none());
    assert!(run.final_output().is_none());
    assert!(matches!(
        run.into_result(),
        Err(Error::Call(CallError::MissingOutput))
    ));
}
