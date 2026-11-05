use cognacta_core::{Add, State};
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Bad {
    #[reducer(Add)]
    value: String,
}
fn main() {}
