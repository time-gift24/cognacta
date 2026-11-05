use cognacta_core::State;

#[derive(serde::Serialize, State, serde::Deserialize)]
struct Invalid {
    #[reducer(cognacta_core::Add, typo = cognacta_core::Add)]
    count: u32,
}

fn main() {}
