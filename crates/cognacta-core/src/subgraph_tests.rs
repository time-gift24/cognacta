use crate::*;
use std::{
    collections::HashMap,
    sync::{
        Arc, Mutex,
        atomic::{AtomicUsize, Ordering},
    },
};

#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct Data {
    #[reducer(Add)]
    total: usize,
}

// Deliberately neither Default nor Clone.
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Initialized {
    #[reducer(Override)]
    value: usize,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct NonClone(usize);
struct Read;
impl NodeInstance<Initialized, AtomicUsize> for Read {
    type Output = NonClone;
    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<Initialized, AtomicUsize>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Initialized, NonClone>, Error> {
        ctx.run.resources().fetch_add(1, Ordering::SeqCst);
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
fn json(value: impl serde::Serialize) -> SharedValue {
    Arc::new(serde_json::to_value(value).unwrap())
}
fn decode<T: serde::de::DeserializeOwned>(value: &JsonValue) -> Result<T, Error> {
    serde_json::from_value(value.clone()).map_err(|source| InputError::Decode { source }.into())
}
fn scheduler(k: usize) -> Arc<dyn Scheduler> {
    Arc::new(LocalScheduler::new(SchedulerConfig::new(k, 8).unwrap()))
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
                    value: decode::<usize>(input.entry(&NodeId::new("entry"))?.entry()?)?
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
        .clone()
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
    let future = local.clone().run(
        &graph,
        input(vec![json(5_usize)]),
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
        .clone();
    assert_eq!(node_output.as_ref(), &serde_json::json!(15));
    let weak = Arc::downgrade(&resources);
    drop(resources);
    assert!(weak.upgrade().is_none());
    assert!(Arc::ptr_eq(&returned, &run.into_result().unwrap()));
}

struct Value<O> {
    value: Arc<O>,
}
impl<O: serde::Serialize + Send + Sync + 'static, R: Send + Sync + 'static> NodeInstance<Data, R>
    for Value<O>
{
    type Output = O;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data, R>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, O>, Error> {
        Ok(Outcome {
            value: Some(self.value.clone()),
            state_delta: DataDelta { total: Some(1) },
            directive: None,
        })
    }
}
fn value<O: serde::Serialize + Send + Sync + 'static>(id: &str, output: O) -> Node<Data> {
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
            _scheduler: Arc<dyn Scheduler>,
        ) -> Result<Outcome<Data, usize>, Error> {
            let value = match ctx.key {
                NodeKey::Static(ref id) if id.as_str() == "text" => {
                    (serde_json::from_value::<String>(input.entry()?.clone())
                        .map_err(|source| cognacta_core::InputError::Decode { source })?)
                    .len()
                }
                _ => serde_json::from_value::<usize>(input.entry()?.clone())
                    .map_err(|source| cognacta_core::InputError::Decode { source })?,
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
            (NodeId::new("number"), Input::new(vec![json(8_usize)])),
            (NodeId::new("text"), Input::new(vec![json("abc")])),
        ]))
    };
    let local = scheduler(2);
    let (first, second) = tokio::join!(
        local
            .clone()
            .run(&graph, make_input(), context(Arc::new(()))),
        local
            .clone()
            .run(&graph, make_input(), context(Arc::new(())))
    );
    for run in [first.unwrap(), second.unwrap()] {
        assert_eq!(run.state().total, 11);
        assert_eq!(*run.into_result().unwrap(), 8);
    }
}

struct Fail;
impl NodeInstance<Data> for Fail {
    type Output = usize;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, usize>, Error> {
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
    let run = local
        .clone()
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
    async fn child_error(
        graph: Arc<Graph<Data, usize>>,
        child_input: GraphInput,
        max_depth: usize,
    ) -> Error {
        let parent = Graph::<Data, usize>::build(
            vec![Node::new(NodeId::new("entry"), graph)],
            vec![],
            vec![],
            NodeId::new("entry"),
        )
        .unwrap();
        let mut ctx = context(Arc::new(()));
        ctx.max_depth = max_depth;
        let mut run = scheduler(1)
            .run(&parent, input(vec![json(child_input)]), ctx)
            .await
            .unwrap();
        match run.errors.remove(0) {
            RunError::Node { source, .. } => source,
            other => panic!("wrong error {other:?}"),
        }
    }
    let graph = Arc::new(graph);
    assert!(matches!(
        child_error(graph.clone(), input(vec![]), 3).await,
        Error::Call(CallError::Execution { .. })
    ));
    assert!(matches!(
        child_error(graph.clone(), GraphInput::new(HashMap::new()), 3).await,
        Error::Call(CallError::Input { .. })
    ));
    assert!(matches!(
        child_error(graph, input(vec![]), 0).await,
        Error::Call(CallError::DepthExceeded { .. })
    ));
    let graph = Graph::<Data, usize>::build_with_initializer(
        vec![value("entry", 1_usize)],
        vec![],
        vec![],
        NodeId::new("entry"),
        |_, _| async { Err(Error::execution(std::io::Error::other("private-init"))) },
    )
    .unwrap();
    let error = child_error(Arc::new(graph), input(vec![]), 3).await;
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
        child_error(Arc::new(graph), input(vec![]), 3).await,
        Error::Call(CallError::MissingOutput)
    ));
}

struct Retry<N> {
    target: Arc<N>,
}
impl<N: NodeInstance<Data, AtomicUsize, Output = NonClone>> NodeInstance<Data, AtomicUsize>
    for Retry<N>
{
    type Output = NonClone;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Data, AtomicUsize>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, NonClone>, Error> {
        let outcome = match self
            .target
            .run(input, ctx.with_call_key("try/1")?, scheduler.clone())
            .await
        {
            Ok(outcome) => outcome,
            Err(_) => {
                self.target
                    .run(input, ctx.with_call_key("try/2")?, scheduler)
                    .await?
            }
        };
        let value = outcome.value.unwrap();
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
                    assert_eq!(input.entry(&NodeId::new("entry"))?.values().len(), 1);
                    let attempt = ctx.resources().fetch_add(1, Ordering::SeqCst);
                    if attempt == 0 {
                        return Err(Error::execution(std::io::Error::other("first attempt")));
                    }
                    Ok(Initialized {
                        value: decode::<usize>(input.entry(&NodeId::new("entry"))?.entry()?)?,
                    })
                }
            },
        )
        .unwrap(),
    );
    let resources = Arc::new(AtomicUsize::new(0));
    let local = scheduler(1);
    let graph = Graph::<Data, NonClone>::build(
        vec![
            Node::new(NodeId::new("entry"), Retry { target: child }).with_resources({
                let resources = resources.clone();
                move |_: &()| Ok(resources.clone())
            }),
        ],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = local
        .clone()
        .run(
            &graph,
            input(vec![json(input(vec![json(7_usize)]))]),
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

struct RemoteValue {
    output: Arc<NonClone>,
}
impl NodeInstance<Data, AtomicUsize> for RemoteValue {
    type Output = NonClone;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<Data, AtomicUsize>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, NonClone>, Error> {
        assert_eq!(ctx.run.depth(), 0);
        assert_eq!(
            (serde_json::from_value::<usize>(input.entry()?.clone())
                .map_err(|source| cognacta_core::InputError::Decode { source })?),
            9
        );
        assert_eq!(ctx.run.resources().load(Ordering::SeqCst), 7);
        Ok(Outcome {
            value: Some(self.output.clone()),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
#[tokio::test]
async fn non_graph_instance_uses_resource_projection_and_decodes_json_return() {
    let output = Arc::new(NonClone(9));
    let graph = Graph::<Data, NonClone>::build(
        vec![
            Node::new(
                NodeId::new("entry"),
                RemoteValue {
                    output: output.clone(),
                },
            )
            .with_resources(|_: &()| Ok(Arc::new(AtomicUsize::new(7)))),
        ],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = scheduler(1)
        .run(&graph, input(vec![json(9_usize)]), context(Arc::new(())))
        .await
        .unwrap();
    assert_eq!(run.into_result().unwrap().0, output.0);
}

struct Fanout;
impl NodeInstance<Data> for Fanout {
    type Output = ();
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: Some(Directive::Deliver(
                (1..=3)
                    .map(|i| DeliverTarget {
                        template: NodeId::new("worker"),
                        key: i.to_string(),
                        payload: json(input(vec![json(i as usize)])),
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
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, usize>, Error> {
        let values = input
            .many(&NodeId::new("worker"))
            .into_iter()
            .map(decode::<NonClone>)
            .collect::<Result<Vec<_>, _>>()?;
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
                        value: decode::<usize>(input.entry(&NodeId::new("entry"))?.entry()?)?,
                    })
                }
            },
        )
        .unwrap(),
    );
    let local = scheduler(2);
    let graph = Graph::<Data, usize>::build(
        vec![
            Node::new(NodeId::new("entry"), Fanout),
            Node::new(NodeId::new("worker"), child)
                .with_resources(|_: &()| Ok(Arc::new(AtomicUsize::new(0))))
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
            .clone()
            .run(&graph, input(vec![]), context(Arc::new(())))
            .await
            .unwrap();
        assert_eq!(run.state().total, 0);
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
    child: Graph<Data, usize>,
}
impl NodeInstance<Data> for HandleFailure {
    type Output = usize;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, usize>, Error> {
        assert!(matches!(
            self.child
                .run(&Input::new(vec![json(input(vec![]))]), ctx, _scheduler)
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
    let local = scheduler(1);
    let child = Graph::<Data, usize>::build(
        vec![Node::new(NodeId::new("entry"), Fail)],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let graph = Graph::<Data, usize>::build(
        vec![
            Node::new(NodeId::new("entry"), HandleFailure { child }),
            value("return", 9_usize),
        ],
        vec![],
        vec![NodeId::new("entry")],
        NodeId::new("return"),
    )
    .unwrap();
    let run = local
        .clone()
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
}
impl NodeInstance<Data, Concurrency> for ConcurrentNode {
    type Output = usize;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data, Concurrency>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, usize>, Error> {
        let resources = ctx.run.resources().clone();
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
        let run_id = ctx.run.run_id().to_owned();
        if let Some(child) = &self.child {
            let input = GraphInput::new(
                ["one", "two", "three"]
                    .into_iter()
                    .map(|name| (NodeId::new(name), Input::new(vec![])))
                    .collect(),
            );
            child
                .run(&Input::new(vec![json(input)]), ctx, _scheduler)
                .await?;
        } else {
            resources.permits.acquire().await.unwrap().forget();
        }
        resources.counts.lock().unwrap().get_mut(&run_id).unwrap().0 -= 1;
        Ok(Outcome {
            value: Some(Arc::new(1)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
#[tokio::test]
async fn per_run_concurrency_refills_slots_while_waiting_parents_keep_theirs() {
    let local = scheduler(2);
    let child = Arc::new(
        Graph::<Data, usize, Concurrency>::build(
            ["one", "two", "three"]
                .into_iter()
                .map(|id| Node::new(NodeId::new(id), ConcurrentNode { child: None }))
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
    let future = local
        .clone()
        .run(&parent, input, context(resources.clone()));
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
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Initialized, ()>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: Some(Directive::Deliver(vec![DeliverTarget {
                template: NodeId::new("worker"),
                key: "same".into(),
                payload: json(()),
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
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Initialized, NonClone>, Error> {
        assert!(
            matches!(&input.values()[0].origin, Origin::Node(NodeKey::Instance { key, .. }) if key == "same")
        );
        Ok(Outcome {
            value: Some(Arc::new(NonClone(
                decode::<NonClone>(input.one(&NodeId::new("worker"))?)?.0,
            ))),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

struct RearmWithoutOutput;
impl NodeInstance<Data> for RearmWithoutOutput {
    type Output = usize;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data>,
        _scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, usize>, Error> {
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

#[tokio::test]
async fn graph_node_validates_input_before_initializing_and_decodes_selected_json() {
    let selected = Arc::new(input(vec![]));
    let seen = Arc::new(AtomicUsize::new(0));
    let child = Arc::new(
        Graph::<Data, usize>::build_with_initializer(
            vec![value("entry", 17_usize)],
            vec![],
            vec![],
            NodeId::new("entry"),
            {
                let (selected, seen) = (selected.clone(), seen.clone());
                move |input, _| {
                    assert_eq!(input.as_ref(), selected.as_ref());
                    seen.fetch_add(1, Ordering::SeqCst);
                    async { Ok(Data::default()) }
                }
            },
        )
        .unwrap(),
    );
    let parent = Graph::<Data, usize>::build(
        vec![Node::new(NodeId::new("entry"), child)],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    for values in [
        vec![],
        vec![json("wrong type")],
        vec![json(selected.as_ref()), json(selected.as_ref())],
    ] {
        let run = scheduler(1)
            .run(&parent, input(values), context(Arc::new(())))
            .await
            .unwrap();
        assert!(matches!(
            run.errors(),
            [RunError::Node {
                source: Error::Input(_),
                ..
            }]
        ));
        assert_eq!(seen.load(Ordering::SeqCst), 0);
    }
    let run = scheduler(1)
        .run(
            &parent,
            input(vec![json(GraphInput::new(HashMap::new()))]),
            context(Arc::new(())),
        )
        .await
        .unwrap();
    assert!(matches!(
        run.errors(),
        [RunError::Node {
            source: Error::Call(CallError::Input { .. }),
            ..
        }]
    ));
    assert_eq!(seen.load(Ordering::SeqCst), 0);
    let run = scheduler(1)
        .run(
            &parent,
            input(vec![json(selected.as_ref())]),
            context(Arc::new(())),
        )
        .await
        .unwrap();
    assert_eq!(*run.into_result().unwrap(), 17);
    assert_eq!(seen.load(Ordering::SeqCst), 1);
}

#[tokio::test]
async fn ordinary_bindings_fail_without_waiting_or_starting_a_child() {
    use std::sync::{OnceLock, Weak};
    type Target = Graph<Data, usize>;
    let binding = Arc::new(OnceLock::<Weak<Target>>::new());
    let parent = Graph::<Data, usize>::build(
        vec![Node::new(NodeId::new("entry"), binding.clone())],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let local = scheduler(1);
    let weak_scheduler = Arc::downgrade(&local);
    let first = local
        .clone()
        .run(&parent, input(vec![]), context(Arc::new(())))
        .await
        .unwrap();
    assert!(matches!(
        first.errors(),
        [RunError::Node {
            source: Error::Node(NodeError::UnboundInstance),
            ..
        }]
    ));
    let target = Arc::new(
        Target::build(
            vec![value("entry", 1_usize)],
            vec![],
            vec![],
            NodeId::new("entry"),
        )
        .unwrap(),
    );
    assert!(binding.set(Arc::downgrade(&target)).is_ok());
    drop(target);
    let second = local
        .run(&parent, input(vec![]), context(Arc::new(())))
        .await
        .unwrap();
    assert!(matches!(
        second.errors(),
        [RunError::Node {
            source: Error::Node(NodeError::DroppedInstance),
            ..
        }]
    ));
    assert!(weak_scheduler.upgrade().is_none()); // Retaining both diagnostic Runs owns no driver.
    assert_eq!(
        second
            .node(&NodeKey::Static(NodeId::new("entry")))
            .unwrap()
            .status(),
        NodeStatus::Failed
    );
}

struct ResourceA {
    value: Arc<NonClone>,
    started: Arc<Mutex<Vec<(usize, String)>>>,
}
struct ResourceB {
    value: Arc<NonClone>,
    started: Arc<Mutex<Vec<(usize, String)>>>,
}
struct ReadA;
impl NodeInstance<Data, ResourceA> for ReadA {
    type Output = NonClone;
    async fn run(
        &self,
        _: &Input,
        ctx: NodeContext<Data, ResourceA>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, NonClone>, Error> {
        assert_eq!(ctx.run.depth(), 2);
        assert_eq!(ctx.run.max_depth(), 3);
        assert_eq!(ctx.state.total, 100);
        Ok(Outcome {
            value: Some(ctx.run.resources().value.clone()),
            state_delta: DataDelta { total: Some(5) },
            directive: None,
        })
    }
}

#[tokio::test]
async fn resources_project_a_to_b_to_a_across_different_states_and_fail_at_the_node() {
    let leaf = Graph::<Data, NonClone, ResourceA>::build_with_initializer(
        vec![Node::new(NodeId::new("entry"), ReadA)],
        vec![],
        vec![],
        NodeId::new("entry"),
        |_, ctx| async move {
            ctx.resources()
                .started
                .lock()
                .unwrap()
                .push((ctx.depth(), ctx.run_id().into()));
            Ok(Data { total: 100 })
        },
    )
    .unwrap();
    let middle = Graph::<Initialized, NonClone, ResourceB>::build_with_initializer(
        vec![
            Node::new(NodeId::new("entry"), leaf).with_resources(|b: &ResourceB| {
                Ok(Arc::new(ResourceA {
                    value: b.value.clone(),
                    started: b.started.clone(),
                }))
            }),
        ],
        vec![],
        vec![],
        NodeId::new("entry"),
        |_, ctx| async move {
            ctx.resources()
                .started
                .lock()
                .unwrap()
                .push((ctx.depth(), ctx.run_id().into()));
            Ok(Initialized { value: 44 })
        },
    )
    .unwrap();
    let middle = Arc::new(middle);
    let root = Graph::<Data, NonClone, ResourceA>::build(
        vec![
            Node::new(NodeId::new("entry"), middle.clone()).with_resources(|a: &ResourceA| {
                Ok(Arc::new(ResourceB {
                    value: a.value.clone(),
                    started: a.started.clone(),
                }))
            }),
        ],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let output = Arc::new(NonClone(23));
    let started = Arc::new(Mutex::new(vec![]));
    let resources = Arc::new(ResourceA {
        value: output.clone(),
        started: started.clone(),
    });
    let weak_resources = Arc::downgrade(&resources);
    let run = scheduler(1)
        .run(
            &root,
            input(vec![json(input(vec![json(input(vec![]))]))]),
            context(resources),
        )
        .await
        .unwrap();
    assert_eq!(run.state().total, 0);
    assert_eq!(run.final_output().unwrap().0, output.0);
    assert!(weak_resources.upgrade().is_none());
    assert_eq!(
        started
            .lock()
            .unwrap()
            .iter()
            .map(|(depth, _)| *depth)
            .collect::<Vec<_>>(),
        [1, 2]
    );
    let failed = Graph::<Data, NonClone>::build(
        vec![Node::new(NodeId::new("entry"), middle).with_resources(
            |_: &()| -> Result<Arc<ResourceB>, Error> {
                Err(Error::execution(std::io::Error::other("projection failed")))
            },
        )],
        vec![],
        vec![],
        NodeId::new("entry"),
    )
    .unwrap();
    let run = scheduler(1)
        .run(
            &failed,
            input(vec![json(input(vec![]))]),
            context(Arc::new(())),
        )
        .await
        .unwrap();
    let [
        RunError::Node {
            source: Error::Node(NodeError::Execution(source)),
            ..
        },
    ] = run.errors()
    else {
        panic!("wrong projection boundary")
    };
    assert_eq!(
        source.downcast_ref::<std::io::Error>().unwrap().to_string(),
        "projection failed"
    );
    assert_eq!(started.lock().unwrap().len(), 2); // Failed projection never initializes middle.
}

#[test]
fn resource_projection_preserves_ordinary_node_policies_and_return_declaration() {
    let predicate: Arc<dyn Fn(usize, usize) -> bool + Send + Sync> =
        Arc::new(|done, live| done == live);
    let node = Node::<Data, ResourceA>::new(NodeId::new("mapped"), ReadA)
        .join(Join::Custom(predicate.clone()))
        .template(true)
        .writes(vec![DataField::Total])
        .declared_targets(vec![DirectiveTarget::Deliver(NodeId::new("target"))])
        .with_resources(|_: &()| -> Result<Arc<ResourceA>, Error> {
            unreachable!("construction never projects resources")
        });
    assert!(node.template);
    assert_eq!(node.id, NodeId::new("mapped"));
    assert!(matches!(&node.join, Join::Custom(actual) if Arc::ptr_eq(actual, &predicate)));
    assert!(node.writes == [DataField::Total]);
    assert!(
        matches!(&node.declared_targets[..], [DirectiveTarget::Deliver(target)] if target == &NodeId::new("target"))
    );
    // Building a non-template return uses the preserved NonClone output declaration.
    Graph::<Data, NonClone>::build(
        vec![node.template(false).declared_targets(vec![])],
        vec![],
        vec![],
        NodeId::new("mapped"),
    )
    .unwrap();
}
