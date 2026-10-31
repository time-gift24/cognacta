use std::sync::Arc;

use cognacta_core::{
    Edge, Error, Graph, Input, Node, NodeContext, NodeId, NodeInstance, Outcome, RunStatus,
    Scheduler, SchedulerConfig, SharedValue, State,
};

#[derive(State)]
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
            value: Some(length),
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
            value: Some(format!("len={count}")),
            state_delta: LengthStateDelta::default(),
            directive: None,
        })
    }
}

#[tokio::test]
async fn downstream_executes_and_reuses_a_graph() {
    let count = NodeId::new("count");
    let render = NodeId::new("render");
    let graph = Graph::<LengthState>::builder()
        .nodes(vec![
            Node::new(count.clone(), Count).writes(vec![LengthStateField::Length]),
            Node::new(render.clone(), Render).terminal(true),
        ])
        .edges(vec![Edge {
            source: count.clone(),
            target: render.clone(),
            when: None,
        }])
        .entries(vec![count])
        .build()
        .unwrap();
    let scheduler = Scheduler::new(
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
            .run_id(run_id.into())
            .initial_state(LengthState { length: 0 })
            .entry_values(vec![Arc::new(String::from("hello")) as SharedValue])
            .call()
            .await;
        assert_eq!(run.status(), RunStatus::Completed, "{:?}", run.errors());
        assert_eq!(run.state().length, 5);
        assert_eq!(run.waves(), 2);
        assert!(run.errors().is_empty());
        let text = run
            .final_output()
            .and_then(|output| output.values.get(&render))
            .and_then(|value| value.downcast_ref::<String>());
        assert_eq!(text.map(String::as_str), Some("len=5"));
    }
}
