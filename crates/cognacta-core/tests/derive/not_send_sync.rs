use std::rc::Rc;
use cognacta_core::{Override, State};
#[derive(State)]
struct Bad {
    #[reducer(Override)]
    value: Rc<String>,
}
fn main() {}
