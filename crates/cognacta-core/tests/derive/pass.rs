use std::cell::Cell;

use cognacta_core::{Error, Override, Reducer, State, WritePolicy};

#[derive(serde::Serialize, serde::Deserialize)]
struct NotClone(String);

#[derive(Default)]
struct CellDelta;

impl Reducer<u32> for CellDelta {
    type Delta = Cell<u32>;
    const POLICY: WritePolicy = WritePolicy::SingleWriter;

    fn reduce(&mut self, _current: &u32, delta: Cell<u32>) -> Result<u32, Error> {
        Ok(delta.get())
    }

    fn finish(self, value: u32) -> Result<u32, Error> {
        Ok(value)
    }
}

#[derive(serde::Serialize, State, serde::Deserialize)]
pub struct GenericState<T>
where
    T: Send + Sync + 'static,
{
    #[reducer(Override)]
    pub value: T,
    #[reducer(CellDelta)]
    pub count: u32,
}

fn main() {
    let mut state = GenericState {
        value: NotClone("ok".into()),
        count: 0,
    };
    state
        .merge_batch(vec![GenericStateDelta {
            value: Some(NotClone("next".into())),
            count: Some(Cell::new(2)),
        }])
        .unwrap();
    assert_eq!(state.value.0, "next");
    assert_eq!(state.count, 2);
    assert_eq!(GenericStateField::Count.name(), "Count");
}

trait FieldName {
    fn name(&self) -> &'static str;
}

impl FieldName for GenericStateField {
    fn name(&self) -> &'static str {
        match self {
            Self::Value => "Value",
            Self::Count => "Count",
        }
    }
}
