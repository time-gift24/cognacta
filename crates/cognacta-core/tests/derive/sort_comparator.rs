use cognacta_core::{Append, Sort, State};
fn compare(_left: &u32, _right: &u32) -> std::cmp::Ordering { std::cmp::Ordering::Equal }
#[derive(State)]
struct Bad {
    #[reducer(Sort<Append, fn(&String, &String) -> std::cmp::Ordering>, init = Sort::new(Append, compare))]
    values: Vec<String>,
}
fn main() {}
