use cognacta_core::*;
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Data { #[reducer(Override)] value: usize }
fn main() { let _ = Graph::<Data, ()>::builder(); }
