use cognacta_core::{Add, State};
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Bad {
    #[reducer(Add)]
    foo_bar: u32,
    #[reducer(Add)]
    fooBar: u32,
}
fn main() {}
