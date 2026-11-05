use cognacta_core::State;
#[derive(serde::Serialize, State, serde::Deserialize)]
struct Bad { value: u32 }
fn main() {}
