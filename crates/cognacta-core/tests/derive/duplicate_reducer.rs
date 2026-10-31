use cognacta_core::{Add, State};
#[derive(State)]
struct Bad {
    #[reducer(Add)]
    #[reducer(Add)]
    value: u32,
}
fn main() {}
