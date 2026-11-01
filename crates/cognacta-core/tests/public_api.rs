use std::sync::Arc;

use cognacta_core::{
    Edge, Error, Graph, GraphInput, Input, LocalScheduler, Node, NodeContext, NodeId, NodeInstance,
    NodeKey, Origin, Outcome, RunContext, RunStatus, Scheduler, SchedulerConfig, SharedValue,
    State,
};

#[derive(Default, State)]
pub struct LengthState {
    #[reducer(cognacta_core::Override)]
    pub length: u32,
}

struct Count;

impl NodeInstance<LengthState> for Count {
    type Output = u32;

    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<LengthState>,
    ) -> Result<Outcome<LengthState, Self::Output>, Error> {
        let length = input.entry::<String>()?.len() as u32;
        Ok(Outcome {
            value: Some(Arc::new(length)),
            state_delta: LengthStateDelta {
                length: Some(length),
            },
            directive: None,
        })
    }
}

struct Render;

impl NodeInstance<LengthState> for Render {
    type Output = String;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<LengthState>,
    ) -> Result<Outcome<LengthState, Self::Output>, Error> {
        let count = input.one::<u32>(&NodeId::new("count"))?;
        assert_eq!((count, ctx.state.length), (&5, 5));
        Ok(Outcome {
            value: Some(Arc::new(format!("len={count}"))),
            state_delta: LengthStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn downstream_executes_and_reuses_a_graph() {
    let count = NodeId::new("count");
    let render = NodeId::new("render");
    let graph = Graph::<LengthState, String>::builder()
        .nodes(vec![
            Node::new(count.clone(), Count).writes(vec![LengthStateField::Length]),
            Node::new(render.clone(), Render),
        ])
        .edges(vec![Edge {
            source: count.clone(),
            target: render.clone(),
            when: None,
        }])
        .entries(vec![count.clone()])
        .return_node(render.clone())
        .build()
        .unwrap();
    let scheduler = LocalScheduler::new(
        SchedulerConfig::builder()
            .max_concurrency(2)
            .max_waves(2)
            .build()
            .unwrap(),
    );

    for run_id in ["first", "second"] {
        let run = scheduler
            .run_builder()
            .graph(&graph)
            .context(
                RunContext::root_builder()
                    .run_id(run_id.into())
                    .max_depth(2)
                    .resources(Arc::new(()))
                    .build(),
            )
            .input(GraphInput::new(std::collections::HashMap::from([(
                count.clone(),
                Input::new(vec![Arc::new(String::from("hello")) as SharedValue]),
            )])))
            .call()
            .await
            .unwrap();
        assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
        assert_eq!(run.state().length, 5);
        assert_eq!(run.waves(), 2);
        assert!(run.errors().is_empty());
        let text = run.final_output().map(|value| value.as_ref());
        assert_eq!(text.map(String::as_str), Some("len=5"));
    }
}

#[tokio::test]
async fn selected_non_clone_output_is_shared_through_a_child_call() -> Result<(), Error> {
    use std::collections::HashMap;

    struct NonClone(u32);
    struct Emit<T>(Arc<T>);
    impl<T: Send + Sync + 'static> NodeInstance<LengthState> for Emit<T> {
        type Output = T;
        async fn run(
            &self,
            _: &Input,
            _: NodeContext<LengthState>,
        ) -> Result<Outcome<LengthState, T>, Error> {
            Ok(Outcome {
                value: Some(self.0.clone()),
                state_delta: Default::default(),
                directive: None,
            })
        }
    }

    struct Receive;
    impl NodeInstance<LengthState> for Receive {
        type Output = NonClone;
        async fn run(
            &self,
            input: &Input,
            _: NodeContext<LengthState>,
        ) -> Result<Outcome<LengthState, NonClone>, Error> {
            assert_eq!(input.entry_origins().len(), 1);
            assert_eq!(input.entry_origins()[0].origin, Origin::Run);
            assert!(input.origins(&NodeId::new("source")).is_empty());
            assert!(input.all::<String>()?.is_empty());
            let value = input.entry_shared::<NonClone>()?;
            assert!(std::ptr::eq(input.entry::<NonClone>()?, value.as_ref()));
            Ok(Outcome {
                value: Some(value),
                state_delta: Default::default(),
                directive: None,
            })
        }
    }

    struct Forward {
        scheduler: Arc<LocalScheduler>,
        child: Graph<LengthState, NonClone>,
    }
    impl NodeInstance<LengthState> for Forward {
        type Output = NonClone;
        async fn run(
            &self,
            input: &Input,
            ctx: NodeContext<LengthState>,
        ) -> Result<Outcome<LengthState, NonClone>, Error> {
            assert_eq!(
                input.one::<String>(&NodeId::new("unselected"))?,
                "parent only"
            );
            let value = input.one_shared::<NonClone>(&NodeId::new("source"))?;
            assert!(std::ptr::eq(
                input.one::<NonClone>(&NodeId::new("source"))?,
                value.as_ref()
            ));
            let child_input = GraphInput::new(HashMap::from([(
                NodeId::new("receive"),
                Input::new(vec![value.clone() as SharedValue]),
            )]));
            let output = self
                .scheduler
                .call(&self.child, child_input, &ctx.run, &ctx.key)
                .await?;
            assert!(Arc::ptr_eq(&value, &output));
            Ok(Outcome {
                value: Some(output),
                state_delta: Default::default(),
                directive: None,
            })
        }
    }

    let scheduler = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let child = Graph::<LengthState, NonClone>::builder()
        .nodes(vec![Node::new(NodeId::new("receive"), Receive)])
        .edges(vec![])
        .entries(vec![])
        .return_node(NodeId::new("receive"))
        .build()?;
    let value = Arc::new(NonClone(7));
    let graph = Graph::<LengthState, NonClone>::builder()
        .nodes(vec![
            Node::new(NodeId::new("source"), Emit(value.clone())),
            Node::new(
                NodeId::new("unselected"),
                Emit(Arc::new(String::from("parent only"))),
            ),
            Node::new(
                NodeId::new("forward"),
                Forward {
                    scheduler: scheduler.clone(),
                    child,
                },
            ),
        ])
        .edges(
            ["source", "unselected"]
                .map(|source| Edge {
                    source: NodeId::new(source),
                    target: NodeId::new("forward"),
                    when: None,
                })
                .into(),
        )
        .entries(vec![])
        .return_node(NodeId::new("forward"))
        .build()?;
    let input = GraphInput::new(
        ["source", "unselected"]
            .map(|source| (NodeId::new(source), Input::new(vec![])))
            .into(),
    );
    let run = scheduler
        .run(
            &graph,
            input,
            RunContext::root("shared".into(), 1, Arc::new(())),
        )
        .await?;
    let source_output = run
        .node(&NodeKey::Static(NodeId::new("source")))
        .unwrap()
        .output()
        .unwrap()
        .clone()
        .downcast::<NonClone>()
        .ok()
        .unwrap();
    assert!(Arc::ptr_eq(&value, &source_output));
    let output = run.into_result()?;
    assert!(Arc::ptr_eq(&value, &output));
    assert_eq!(output.0, 7);
    Ok(())
}

#[path = "examples/nested.rs"]
mod nested;
#[path = "examples/recursive.rs"]
mod recursive;
