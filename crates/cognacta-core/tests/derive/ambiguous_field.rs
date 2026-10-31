use cognacta_core::{Add, State};
#[derive(State)]
struct Bad {
    #[reducer(Add)]
    foo_bar: u32,
    #[reducer(Add)]
    fooBar: u32,
}
fn main() {}
