use cognacta_core::State;

#[derive(State)]
struct Invalid {
    #[reducer(cognacta_core::Add, typo = cognacta_core::Add)]
    count: u32,
}

fn main() {}
