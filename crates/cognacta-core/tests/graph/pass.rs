use std::sync::Arc;
use cognacta_core::*;
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Data { #[reducer(Override)] value: usize }
#[derive(serde::Serialize, serde::Deserialize)]
struct NonClone;
struct Task;
impl NodeInstance<Data> for Task {
    type Output = NonClone;
    async fn run(&self, _: &Input, _: NodeContext<Data>, _scheduler: Arc<dyn Scheduler>) -> Result<Outcome<Data, NonClone>, Error> {
        Ok(Outcome { value: Some(Arc::new(NonClone)), state_delta: Default::default(), directive: None })
    }
}
fn main() {
    let graph = Graph::<Data, NonClone>::builder_with_initializer().nodes(vec![Node::new(NodeId::new("entry"), Task)]).edges(vec![]).entries(vec![]).return_node(NodeId::new("entry")).state_initializer(|_, _| async { Ok(Data { value: 1 }) }).build().unwrap();
    let scheduler: Arc<dyn Scheduler> = Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 2).unwrap()));
    let builder: SchedulerRunBuilder<_, _, _, _, scheduler_run_builder::Empty> = scheduler.run_builder();
    let future = builder.graph(&graph).input(GraphInput::new(std::collections::HashMap::from([(NodeId::new("entry"), Input::new(vec![]))]))).context(RunContext::root("compile".into(), 1, Arc::new(()))).call();
    drop(future);
}
