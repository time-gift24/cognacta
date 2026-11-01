use std::sync::Arc;
use cognacta_core::*;
#[derive(State)]
struct Data { #[reducer(Override)] value: usize }
struct NonClone;
struct Task;
impl NodeInstance<Data> for Task {
    type Output = NonClone;
    async fn run(&self, _: &Input, _: NodeContext<Data>) -> Result<Outcome<Data, NonClone>, Error> {
        Ok(Outcome { value: Some(Arc::new(NonClone)), state_delta: Default::default(), directive: None })
    }
}
fn main() {
    let _ = Graph::<Data, NonClone>::builder_with_initializer().nodes(vec![Node::new(NodeId::new("entry"), Task)]).edges(vec![]).entries(vec![]).return_node(NodeId::new("entry")).state_initializer(|_, _| async { Ok(Data { value: 1 }) }).build().unwrap();
}
