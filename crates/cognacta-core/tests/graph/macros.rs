use cognacta_core::*;
use std::sync::Arc;

#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct Data {
    #[reducer(Override)]
    value: usize,
}

struct Task;
impl NodeInstance<Data> for Task {
    type Output = ();

    async fn run(
        &self,
        _: &Input,
        _: NodeContext<Data>,
        _: Arc<dyn Scheduler>,
    ) -> Result<Outcome<Data, ()>, Error> {
        Ok(Outcome {
            value: Some(Arc::new(())),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

fn main() {
    let conditional = graph! {
        state: Data,
        output: (),
        nodes {
            first: Task,
            second: Task,
        }
        edges {
            first -> second when |state| state.value > 0,
        }
        entries [first],
        return second;
    }
    .unwrap();
    let deliver = graph! {
        state: Data,
        output: (),
        nodes {
            first: Task => .declared_targets(vec![DirectiveTarget::Deliver(NodeId::new("worker"))]),
            worker: Task => .template(true),
        }
        return first;
    }
    .unwrap();
    let initialized = graph! {
        state: Data,
        output: (),
        nodes {
            entry: Task => .writes(vec![DataField::Value]).join(Join::All),
        }
        init: |_, _| async { Ok(Data { value: 1 }) },
        return entry;
    }
    .unwrap();
    let shared = Arc::new(serde_json::json!(1_usize));
    let input = graph_input! {
        entry: shared(shared),
        empty: [],
        many: [serde_json::json!(1_usize), serde_json::json!(2_usize)],
    };
    drop((conditional, deliver, initialized, input));
}
