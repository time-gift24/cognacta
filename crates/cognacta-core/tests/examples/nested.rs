use cognacta_core::{
    Error, Graph, GraphInput, Input, LocalScheduler, Node, NodeContext, NodeId, NodeInstance,
    Outcome, Override, RunContext, Scheduler, SchedulerConfig, SharedValue, State,
};
use std::{collections::HashMap, sync::Arc};

#[derive(Default, State)]
struct ChildState {
    #[reducer(Override)]
    length: usize,
}

#[derive(Default, State)]
struct ParentState {
    #[reducer(Override)]
    last_length: usize,
}

struct Count;
impl NodeInstance<ChildState> for Count {
    type Output = usize;

    async fn run(
        &self,
        input: &Input,
        _ctx: NodeContext<ChildState>,
    ) -> Result<Outcome<ChildState, usize>, Error> {
        let length = input.entry::<String>()?.chars().count();
        Ok(Outcome {
            value: Some(Arc::new(length)),
            state_delta: ChildStateDelta {
                length: Some(length),
            },
            directive: None,
        })
    }
}

struct Report<E, T> {
    scheduler: Arc<E>,
    target: Arc<T>,
    child_entry: NodeId,
}

impl<E, T> Report<E, T> {
    fn new(scheduler: Arc<E>, target: Arc<T>, child_entry: NodeId) -> Self {
        Self {
            scheduler,
            target,
            child_entry,
        }
    }
}

impl<E, T> NodeInstance<ParentState> for Report<E, T>
where
    E: Scheduler<T, usize> + 'static,
    T: Send + Sync + 'static,
{
    type Output = usize;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<ParentState>,
    ) -> Result<Outcome<ParentState, usize>, Error> {
        let text = input.entry_shared::<String>()?;
        let child_input = GraphInput::new(HashMap::from([(
            self.child_entry.clone(),
            Input::new(vec![text as SharedValue]),
        )]));
        let output = self
            .scheduler
            .call(self.target.as_ref(), child_input, &ctx.run, &ctx.key)
            .await?;
        Ok(Outcome {
            state_delta: ParentStateDelta {
                last_length: Some(*output),
            },
            value: Some(output),
            directive: None,
        })
    }
}

#[tokio::test]
async fn public_example() -> Result<(), Error> {
    let scheduler = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let child_entry = NodeId::new("count");
    let child = Arc::new(
        Graph::<ChildState, usize>::builder()
            .nodes(vec![
                Node::new(child_entry.clone(), Count).writes(vec![ChildStateField::Length]),
            ])
            .edges(vec![])
            .entries(vec![child_entry.clone()])
            .return_node(child_entry.clone())
            .build()?,
    );

    let parent_entry = NodeId::new("report");
    let parent = Graph::<ParentState, usize>::builder()
        .nodes(vec![
            Node::new(
                parent_entry.clone(),
                Report::new(Arc::clone(&scheduler), child, child_entry),
            )
            .writes(vec![ParentStateField::LastLength]),
        ])
        .edges(vec![])
        .entries(vec![parent_entry.clone()])
        .return_node(parent_entry.clone())
        .build()?;

    let input = GraphInput::new(HashMap::from([(
        parent_entry,
        Input::new(vec![Arc::new(String::from("hello")) as SharedValue]),
    )]));
    let context = RunContext::root_builder()
        .run_id(String::from("example-root"))
        .max_depth(4)
        .resources(Arc::new(()))
        .build();
    let run = scheduler.run(&parent, input, context).await?;
    assert_eq!(run.state().last_length, 5);
    let output: Arc<usize> = run.into_result()?;
    assert_eq!(*output, 5);
    Ok(())
}
