use cognacta_core::*;
#[derive(State)]
struct Data { #[reducer(Override)] value: usize }
fn main() {
    let _ = Graph::<Data, ()>::build_with_initializer(vec![], vec![], vec![], NodeId::new("entry"), |_, _| async {
        let value = std::rc::Rc::new(1);
        std::future::pending::<()>().await;
        Ok(Data { value: *value })
    });
}
