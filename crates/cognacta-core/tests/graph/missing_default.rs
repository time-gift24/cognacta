use cognacta_core::*;
#[derive(State)]
struct Data { #[reducer(Override)] value: usize }
fn main() { let _ = Graph::<Data, ()>::builder(); }
