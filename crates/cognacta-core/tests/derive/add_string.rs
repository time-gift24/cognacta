use cognacta_core::{Add, State};
#[derive(State)]
struct Bad {
    #[reducer(Add)]
    value: String,
}
fn main() {}
