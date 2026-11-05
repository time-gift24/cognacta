use cognacta_core::{Add, State};
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Bad {
    #[reducer(Add)]
    #[reducer(Add)]
    value: u32,
}
fn main() {}
