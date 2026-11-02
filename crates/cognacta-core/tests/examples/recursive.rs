use cognacta_core::*;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex, OnceLock, Weak},
};

#[derive(Default, State)]
struct Data {}
type RecursiveGraph = Graph<Data, (), Resources>;
#[derive(Default)]
struct Resources {
    started: Mutex<Vec<(&'static str, usize)>>,
}

struct Prepare;
impl NodeInstance<Data, Resources> for Prepare {
    type Output = GraphInput;
    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data, Resources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, GraphInput>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(GraphInput::new(HashMap::from([(
                NodeId::new("prepare"),
                Input::new(vec![]),
            )])))),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

async fn verify_recursion(mutual: bool) -> Result<(), Error> {
    let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let weak_scheduler = Arc::downgrade(&scheduler);
    let a_slot = Arc::new(OnceLock::<Weak<RecursiveGraph>>::new());
    let b_slot = Arc::new(OnceLock::<Weak<RecursiveGraph>>::new());
    let build = |name, target| {
        RecursiveGraph::builder_with_initializer()
            .nodes(vec![
                Node::new(NodeId::new("prepare"), Prepare),
                Node::new(NodeId::new("invoke"), target),
            ])
            .edges(vec![Edge {
                source: NodeId::new("prepare"),
                target: NodeId::new("invoke"),
                when: None,
            }])
            .entries(vec![])
            .return_node(NodeId::new("invoke"))
            .state_initializer(move |_, ctx| async move {
                ctx.resources()
                    .started
                    .lock()
                    .unwrap()
                    .push((name, ctx.depth()));
                Ok(Data {})
            })
            .build()
    };
    let a = Arc::new(build(
        "A",
        if mutual {
            b_slot.clone()
        } else {
            a_slot.clone()
        },
    )?);
    let b = Arc::new(build("B", a_slot.clone())?);
    assert!(a_slot.set(Arc::downgrade(&a)).is_ok());
    assert!(b_slot.set(Arc::downgrade(&b)).is_ok());
    let resources = Arc::new(Resources::default());
    let weak_resources = Arc::downgrade(&resources);
    let weak_a = Arc::downgrade(&a);
    let weak_b = Arc::downgrade(&b);
    let run = scheduler
        .run(
            &a,
            GraphInput::new(HashMap::from([(
                NodeId::new("prepare"),
                Input::new(vec![]),
            )])),
            RunContext::root("recursive-root".into(), 2, resources.clone()),
        )
        .await?;
    let expected = if mutual {
        vec![("A", 0), ("B", 1), ("A", 2)]
    } else {
        vec![("A", 0), ("A", 1), ("A", 2)]
    };
    assert_eq!(*resources.started.lock().unwrap(), expected);
    assert_eq!(run.status(), RunStatus::Failed);
    drop((a, b, resources));
    assert!(weak_a.upgrade().is_none());
    assert!(weak_b.upgrade().is_none());
    assert!(weak_resources.upgrade().is_none());
    assert!(weak_scheduler.upgrade().is_none());
    assert!(matches!(
        run.into_result(),
        Err(Error::Call(CallError::Execution { .. }))
    ));
    Ok(())
}

#[tokio::test]
async fn public_example() -> Result<(), Error> {
    verify_recursion(false).await?;
    verify_recursion(true).await
}
