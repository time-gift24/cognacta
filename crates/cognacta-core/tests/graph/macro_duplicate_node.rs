use cognacta_core::*;
use std::sync::Arc;

#[derive(serde::Serialize, Default, State, serde::Deserialize)]
struct Data {}
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
    let _ = graph! {
        state: Data,
        output: (),
        nodes {
            entry: Task,
            entry: Task,
        }
        return entry;
    };
}
