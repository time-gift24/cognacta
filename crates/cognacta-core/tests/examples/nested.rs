use cognacta_core::*;
use std::{collections::HashMap, sync::Arc};

#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct ChildState {
    #[reducer(Override)]
    length: usize,
}
#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct ParentState {
    #[reducer(Override)]
    last_length: usize,
}

struct CounterResources {
    offset: usize,
}
struct ParentResources {
    counter: Arc<CounterResources>,
}

struct Count;
impl NodeInstance<ChildState, CounterResources> for Count {
    type Output = usize;
    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<ChildState, CounterResources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<ChildState, usize>, Error> {
        let length = (serde_json::from_value::<String>(input.entry()?.clone())
            .map_err(|source| cognacta_core::InputError::Decode { source })?)
        .chars()
        .count()
            + ctx.run.resources().offset;
        Ok(Outcome {
            value: Some(Arc::new(length)),
            state_delta: ChildStateDelta {
                length: Some(length),
            },
            directive: None,
        })
    }
}
struct Prepare;
impl NodeInstance<ParentState, ParentResources> for Prepare {
    type Output = GraphInput;
    async fn run(
        &self,
        input: &Input,
        _: NodeContext<ParentState, ParentResources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<ParentState, GraphInput>, Error> {
        let value = input.entry_shared()?;
        let input = GraphInput::new(HashMap::from([(
            NodeId::new("count"),
            Input::new(vec![value]),
        )]));
        Ok(Outcome {
            value: Some(Arc::new(input)),
            state_delta: Default::default(),
            directive: None,
        })
    }
}
struct Report;
impl NodeInstance<ParentState, ParentResources> for Report {
    type Output = usize;
    async fn run(
        &self,
        input: &Input,
        _: NodeContext<ParentState, ParentResources>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<ParentState, usize>, Error> {
        let value: usize = serde_json::from_value(input.one(&NodeId::new("child"))?.clone())
            .map_err(|source| InputError::Decode { source })?;
        Ok(Outcome {
            state_delta: ParentStateDelta {
                last_length: Some(value),
            },
            value: Some(Arc::new(value)),
            directive: None,
        })
    }
}

#[tokio::test]
async fn public_example() -> Result<(), Error> {
    let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let child = Graph::<ChildState, usize, CounterResources>::builder()
        .nodes(vec![
            Node::new(NodeId::new("count"), Count).writes(vec![ChildStateField::Length]),
        ])
        .edges(vec![])
        .entries(vec![])
        .return_node(NodeId::new("count"))
        .build()?;
    let parent = Graph::<ParentState, usize, ParentResources>::builder()
        .nodes(vec![
            Node::new(NodeId::new("prepare"), Prepare),
            Node::new(NodeId::new("child"), child)
                .with_resources(|parent: &ParentResources| Ok(parent.counter.clone())),
            Node::new(NodeId::new("report"), Report).writes(vec![ParentStateField::LastLength]),
        ])
        .edges(vec![
            Edge {
                source: NodeId::new("prepare"),
                target: NodeId::new("child"),
                when: None,
            },
            Edge {
                source: NodeId::new("child"),
                target: NodeId::new("report"),
                when: None,
            },
        ])
        .entries(vec![])
        .return_node(NodeId::new("report"))
        .build()?;
    let input = GraphInput::new(HashMap::from([(
        NodeId::new("prepare"),
        Input::new(vec![Arc::new(serde_json::json!("hello"))]),
    )]));
    let run = scheduler
        .run_builder()
        .graph(&parent)
        .input(input)
        .context(RunContext::root(
            "example-root".into(),
            4,
            Arc::new(ParentResources {
                counter: Arc::new(CounterResources { offset: 1 }),
            }),
        ))
        .call()
        .await?;
    assert_eq!(run.state().last_length, 6);
    assert_eq!(*run.into_result()?, 6);
    Ok(())
}
