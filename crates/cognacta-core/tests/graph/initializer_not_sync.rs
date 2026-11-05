use cognacta_core::*;
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Data { #[reducer(Override)] value: usize }
fn main() {
    let value = std::cell::Cell::new(1);
    let _ = Graph::<Data, ()>::build_with_initializer(vec![], vec![], vec![], NodeId::new("entry"), move |_, _| {
        let value = value.get();
        async move { Ok(Data { value }) }
    });
}
