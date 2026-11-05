use std::{cmp::Ordering, collections::HashMap, hash::Hash};

use crate::{Error, MergeError};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WritePolicy {
    SingleWriter,
    MultiWriter,
}

#[derive(Debug)]
pub struct StateField<F> {
    pub id: F,
    pub name: &'static str,
    pub policy: WritePolicy,
}

pub trait State: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static {
    type Delta: serde::Serialize + serde::de::DeserializeOwned + Default + Send + 'static;
    type Field: Copy + Eq + Hash + Send + Sync + 'static;

    fn fields() -> &'static [StateField<Self::Field>];
    fn merge_batch(&mut self, deltas: Vec<Self::Delta>) -> Result<(), Error>;
}

pub trait Reducer<T> {
    type Delta: serde::Serialize + serde::de::DeserializeOwned + Send + 'static;
    const POLICY: WritePolicy;

    fn reduce(&mut self, current: &T, delta: Self::Delta) -> Result<T, Error>;
    fn finish(self, value: T) -> Result<T, Error>;
}

#[derive(Default)]
pub struct Override;

impl<T: serde::Serialize + serde::de::DeserializeOwned + Send + 'static> Reducer<T> for Override {
    type Delta = T;
    const POLICY: WritePolicy = WritePolicy::SingleWriter;

    fn reduce(&mut self, _current: &T, delta: T) -> Result<T, Error> {
        Ok(delta)
    }

    fn finish(self, value: T) -> Result<T, Error> {
        Ok(value)
    }
}

#[derive(Default)]
pub struct Append;

impl<T: serde::Serialize + serde::de::DeserializeOwned + Clone + Send + 'static> Reducer<Vec<T>>
    for Append
{
    type Delta = Vec<T>;
    const POLICY: WritePolicy = WritePolicy::MultiWriter;

    fn reduce(&mut self, current: &Vec<T>, delta: Vec<T>) -> Result<Vec<T>, Error> {
        let mut value = current.clone();
        value.extend(delta);
        Ok(value)
    }

    fn finish(self, value: Vec<T>) -> Result<Vec<T>, Error> {
        Ok(value)
    }
}

#[derive(Default)]
pub struct Merge;

impl<K, V> Reducer<HashMap<K, V>> for Merge
where
    K: serde::Serialize + serde::de::DeserializeOwned + Eq + Hash + Clone + Send + 'static,
    V: serde::Serialize + serde::de::DeserializeOwned + Clone + Send + 'static,
{
    type Delta = HashMap<K, V>;
    const POLICY: WritePolicy = WritePolicy::MultiWriter;

    fn reduce(
        &mut self,
        current: &HashMap<K, V>,
        delta: HashMap<K, V>,
    ) -> Result<HashMap<K, V>, Error> {
        let mut value = current.clone();
        value.extend(delta);
        Ok(value)
    }

    fn finish(self, value: HashMap<K, V>) -> Result<HashMap<K, V>, Error> {
        Ok(value)
    }
}

macro_rules! add_reducer {
    ($($type:ty),+ $(,)?) => {$ (
        impl Reducer<$type> for Add {
            type Delta = $type;
            const POLICY: WritePolicy = WritePolicy::MultiWriter;

            fn reduce(&mut self, current: &$type, delta: $type) -> Result<$type, Error> {
                current.checked_add(delta).ok_or_else(|| {
                    MergeError::Overflow { field: None }.into()
                })
            }

            fn finish(self, value: $type) -> Result<$type, Error> {
                Ok(value)
            }
        }
    )+ };
}

#[derive(Default)]
pub struct Add;
add_reducer!(
    u8, u16, u32, u64, u128, usize, i8, i16, i32, i64, i128, isize
);

pub struct Sort<R, F> {
    reducer: R,
    compare: F,
}

impl<R, F> Sort<R, F> {
    pub fn new(reducer: R, compare: F) -> Self {
        Self { reducer, compare }
    }
}

impl<T, R, F> Reducer<Vec<T>> for Sort<R, F>
where
    R: Reducer<Vec<T>>,
    F: Fn(&T, &T) -> Ordering,
{
    type Delta = R::Delta;
    const POLICY: WritePolicy = R::POLICY;

    fn reduce(&mut self, current: &Vec<T>, delta: Self::Delta) -> Result<Vec<T>, Error> {
        self.reducer.reduce(current, delta)
    }

    fn finish(self, value: Vec<T>) -> Result<Vec<T>, Error> {
        let mut value = self.reducer.finish(value)?;
        value.sort_by(&self.compare);
        Ok(value)
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::*;

    static EVENTS: Mutex<Vec<(&str, &str, u8)>> = Mutex::new(Vec::new());

    struct Record(&'static str);

    impl Record {
        fn new(field: &'static str) -> Self {
            EVENTS.lock().unwrap().push((field, "init", 0));
            Self(field)
        }
    }

    impl Reducer<u8> for Record {
        type Delta = u8;
        const POLICY: WritePolicy = WritePolicy::MultiWriter;

        fn reduce(&mut self, current: &u8, delta: u8) -> Result<u8, Error> {
            EVENTS.lock().unwrap().push((self.0, "reduce", delta));
            Add.reduce(current, delta)
        }

        fn finish(self, value: u8) -> Result<u8, Error> {
            EVENTS.lock().unwrap().push((self.0, "finish", value));
            Ok(value)
        }
    }

    #[derive(serde::Serialize, crate::State, serde::Deserialize)]
    struct OrderedState {
        #[reducer(Record, init = Record::new("first"))]
        first: u8,
        #[reducer(Record, init = Record::new("last"))]
        last: u8,
    }

    #[test]
    fn batch_reduces_in_delta_order_before_finishing_any_field() {
        let mut state = OrderedState { first: 0, last: 0 };
        state
            .merge_batch(vec![
                OrderedStateDelta {
                    first: Some(1),
                    last: Some(2),
                },
                OrderedStateDelta {
                    first: Some(3),
                    last: Some(4),
                },
            ])
            .unwrap();
        assert_eq!((state.first, state.last), (4, 6));
        assert_eq!(
            std::mem::take(&mut *EVENTS.lock().unwrap()),
            [
                ("first", "init", 0),
                ("last", "init", 0),
                ("first", "reduce", 1),
                ("last", "reduce", 2),
                ("first", "reduce", 3),
                ("last", "reduce", 4),
                ("first", "finish", 4),
                ("last", "finish", 6),
            ]
        );

        state.first = 255;
        state.last = 255;
        let error = state
            .merge_batch(vec![
                OrderedStateDelta {
                    first: Some(0),
                    last: Some(1),
                },
                OrderedStateDelta {
                    first: Some(1),
                    last: Some(0),
                },
            ])
            .unwrap_err();
        assert!(matches!(
            error,
            Error::Merge(MergeError::Overflow {
                field: Some("last")
            })
        ));
        assert_eq!((state.first, state.last), (255, 255));
        assert_eq!(
            std::mem::take(&mut *EVENTS.lock().unwrap()),
            [
                ("first", "init", 0),
                ("last", "init", 0),
                ("first", "reduce", 0),
                ("last", "reduce", 1),
            ]
        );

        state
            .merge_batch(vec![OrderedStateDelta::default()])
            .unwrap();
        state.merge_batch(vec![]).unwrap();
        assert!(EVENTS.lock().unwrap().is_empty());
    }
}

#[cfg(test)]
#[path = "state_tests.rs"]
mod state_tests;
