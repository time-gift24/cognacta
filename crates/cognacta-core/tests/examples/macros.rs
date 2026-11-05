use cognacta_core::*;
use std::sync::Arc;

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
        let text = input.entry_shared()?;
        Ok(Outcome {
            value: Some(Arc::new(graph_input! {
                count: shared(text),
            })),
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
            value: Some(Arc::new(value)),
            state_delta: ParentStateDelta {
                last_length: Some(value),
            },
            directive: None,
        })
    }
}

#[tokio::test]
async fn macros_build_an_ordinary_statically_scheduled_child_node() -> Result<(), Error> {
    let child = graph! {
        state: ChildState,
        output: usize,
        resources: CounterResources,
        nodes {
            count: Count => .writes(vec![ChildStateField::Length]),
        }
        return count;
    }?;
    let parent = graph! {
        state: ParentState,
        output: usize,
        resources: ParentResources,
        nodes {
            prepare: Prepare,
            child: child => .with_resources(|r: &ParentResources| Ok(r.counter.clone())),
            report: Report => .writes(vec![ParentStateField::LastLength]),
        }
        edges {
            prepare -> child,
            child -> report,
        }
        return report;
    }?;
    let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4)?));
    let run = scheduler
        .run(
            &parent,
            graph_input! { prepare: serde_json::json!("hello"), },
            RunContext::root(
                "macro-root".into(),
                4,
                Arc::new(ParentResources {
                    counter: Arc::new(CounterResources { offset: 1 }),
                }),
            ),
        )
        .await?;
    assert_eq!(run.status(), RunStatus::Completed);
    assert_eq!(run.waves(), 3);
    assert_eq!(run.state().last_length, 6);
    assert_eq!(*run.into_result()?, 6);
    Ok(())
}

#[test]
fn graph_input_macro_preserves_shared_values_and_entry_origins() {
    let selected = Arc::new(serde_json::json!(7_usize));
    let input = graph_input! {
        text: serde_json::json!("hello"),
        selected: shared(selected.clone()),
        empty: [],
        many: [serde_json::json!(1_usize), serde_json::json!(2_usize)],
    };
    for name in ["text", "selected", "empty", "many"] {
        let entry = input.entry(&NodeId::new(name)).unwrap();
        assert!(
            entry
                .values()
                .iter()
                .all(|origin| origin.origin == Origin::Run)
        );
    }
    assert_eq!(
        input.entry(&NodeId::new("text")).unwrap().entry().unwrap(),
        &serde_json::json!("hello")
    );
    assert!(Arc::ptr_eq(
        &input
            .entry(&NodeId::new("selected"))
            .unwrap()
            .entry_shared()
            .unwrap(),
        &selected,
    ));
    assert!(
        input
            .entry(&NodeId::new("empty"))
            .unwrap()
            .values()
            .is_empty()
    );
    assert_eq!(
        input
            .entry(&NodeId::new("many"))
            .unwrap()
            .values()
            .iter()
            .map(|entry| entry.value.as_u64().unwrap())
            .collect::<Vec<_>>(),
        [1_u64, 2]
    );
}
