use std::rc::Rc;
use cognacta_core::{Override, State};
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Bad {
    #[reducer(Override)]
    value: Rc<String>,
}
fn main() {}
