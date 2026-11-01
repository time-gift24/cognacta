use cognacta_core::{
    CallError, Error, Graph, GraphInput, Input, LocalScheduler, Node, NodeContext, NodeId,
    NodeInstance, Outcome, Override, RunContext, Scheduler, SchedulerConfig, State,
};
use std::{
    collections::HashMap,
    sync::{Arc, Mutex, OnceLock},
};

#[derive(Default, State)]
struct DemoState {
    #[reducer(Override)]
    value: usize,
}

type DemoGraph = Graph<DemoState, (), Resources>;

#[derive(Default)]
struct Resources {
    a: OnceLock<Arc<DemoGraph>>,
    b: OnceLock<Arc<DemoGraph>>,
    initialized: Mutex<Vec<usize>>,
    started: Mutex<Vec<(&'static str, usize)>>,
    rejected: Mutex<Vec<(usize, usize)>>,
}

#[derive(Clone, Copy)]
enum Next {
    A,
    B,
}

struct Recur {
    scheduler: Arc<LocalScheduler>,
    name: &'static str,
    next: Next,
}

impl NodeInstance<DemoState, Resources> for Recur {
    type Output = ();

    async fn run(
        &self,
        _input: &Input,
        ctx: NodeContext<DemoState, Resources>,
    ) -> Result<Outcome<DemoState, ()>, Error> {
        let resources = ctx.run.resources();
        resources
            .started
            .lock()
            .expect("fixture lock not poisoned")
            .push((self.name, ctx.run.depth()));
        let target = match self.next {
            Next::A => resources.a.get(),
            Next::B => resources.b.get(),
        }
        .expect("both graph targets are bound before starting a run");
        let input = GraphInput::new(HashMap::from([(NodeId::new("invoke"), Input::new(vec![]))]));
        let result = self
            .scheduler
            .call(target.as_ref(), input, &ctx.run, &ctx.key)
            .await;
        if let Err(Error::Call(CallError::DepthExceeded {
            parent_depth,
            max_depth,
        })) = &result
        {
            resources
                .rejected
                .lock()
                .expect("fixture lock not poisoned")
                .push((*parent_depth, *max_depth));
        }
        Ok(Outcome {
            value: Some(result?),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

async fn verify_recursion(next_from_a: Next) -> Result<(), Error> {
    let scheduler = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let resources = Arc::new(Resources::default());
    let entry = NodeId::new("invoke");
    let a = Arc::new(
        DemoGraph::builder_with_initializer()
            .nodes(vec![Node::new(
                entry.clone(),
                Recur {
                    scheduler: Arc::clone(&scheduler),
                    name: "A",
                    next: next_from_a,
                },
            )])
            .edges(vec![])
            .entries(vec![entry.clone()])
            .return_node(entry.clone())
            .state_initializer(|_, ctx| async move {
                ctx.resources()
                    .initialized
                    .lock()
                    .unwrap()
                    .push(ctx.depth());
                Ok(DemoState::default())
            })
            .build()?,
    );
    let b = Arc::new(
        DemoGraph::builder_with_initializer()
            .nodes(vec![Node::new(
                entry.clone(),
                Recur {
                    scheduler: Arc::clone(&scheduler),
                    name: "B",
                    next: Next::A,
                },
            )])
            .edges(vec![])
            .entries(vec![entry.clone()])
            .return_node(entry.clone())
            .state_initializer(|_, ctx| async move {
                ctx.resources()
                    .initialized
                    .lock()
                    .unwrap()
                    .push(ctx.depth());
                Ok(DemoState::default())
            })
            .build()?,
    );
    let weak_a = Arc::downgrade(&a);
    let weak_b = Arc::downgrade(&b);
    assert!(resources.a.set(a).is_ok());
    assert!(resources.b.set(b).is_ok());

    let input = GraphInput::new(HashMap::from([(entry, Input::new(vec![]))]));
    let context = RunContext::root_builder()
        .run_id(String::from(match next_from_a {
            Next::A => "self-recursion-example",
            Next::B => "mutual-recursion-example",
        }))
        .max_depth(2)
        .resources(Arc::clone(&resources))
        .build();
    let run = scheduler
        .run(
            resources.a.get().expect("A is bound").as_ref(),
            input,
            context,
        )
        .await?;
    assert!(matches!(
        run.into_result(),
        Err(Error::Call(CallError::Execution { .. })),
    ));
    let expected = match next_from_a {
        Next::A => vec![("A", 0), ("A", 1), ("A", 2)],
        Next::B => vec![("A", 0), ("B", 1), ("A", 2)],
    };
    assert_eq!(
        *resources.started.lock().expect("fixture lock not poisoned"),
        expected,
    );
    assert_eq!(
        *resources
            .rejected
            .lock()
            .expect("fixture lock not poisoned"),
        vec![(2, 2)],
    );
    assert_eq!(*resources.initialized.lock().unwrap(), [0, 1, 2]);
    drop(resources);
    assert!(weak_a.upgrade().is_none());
    assert!(weak_b.upgrade().is_none());
    Ok(())
}

#[tokio::test]
async fn public_example() -> Result<(), Error> {
    verify_recursion(Next::A).await?;
    verify_recursion(Next::B).await?;
    Ok(())
}
