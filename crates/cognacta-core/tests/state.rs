use std::{
    cmp::Ordering,
    collections::HashMap,
    sync::atomic::{AtomicUsize, Ordering as AtomicOrdering},
};

use cognacta_core::{
    Add, Append, Error, Merge, MergeError, Override, Reducer, Sort, State, WritePolicy,
};

#[derive(State)]
struct BatchState {
    #[reducer(Override)]
    title: Option<String>,
    #[reducer(Append)]
    items: Vec<String>,
    #[reducer(Add)]
    count: u8,
    #[reducer(Sort<Append, fn(&String, &String) -> Ordering>, init = Sort::new(Append, compare))]
    sorted: Vec<String>,
}

fn compare(left: &String, right: &String) -> Ordering {
    COMPARES.fetch_add(1, AtomicOrdering::Relaxed);
    left.cmp(right)
}

static COMPARES: AtomicUsize = AtomicUsize::new(0);

#[test]
fn merge_is_atomic_and_supports_explicit_none() {
    let mut state = BatchState {
        title: Some("old".into()),
        items: vec!["old".into()],
        count: 255,
        sorted: vec!["b".into(), "a".into()],
    };
    let error = state
        .merge_batch(vec![BatchStateDelta {
            title: None,
            items: Some(vec!["new".into()]),
            count: Some(1),
            sorted: None,
        }])
        .unwrap_err();
    assert!(matches!(
        error,
        Error::Merge(MergeError::Overflow {
            field: Some("count")
        })
    ));
    assert_eq!(state.items, ["old"]);
    assert_eq!(state.count, 255);

    state
        .merge_batch(vec![BatchStateDelta {
            title: Some(None),
            items: Some(vec![]),
            count: Some(0),
            sorted: Some(vec!["aa".into(), "a".into(), "c".into()]),
        }])
        .unwrap();
    assert_eq!(state.title, None);
    assert_eq!(state.items, ["old"]);
    assert_eq!(state.count, 255);
    assert_eq!(state.sorted, ["a", "a", "aa", "b", "c"]);
    assert!(COMPARES.load(AtomicOrdering::Relaxed) > 0);
}

#[test]
fn single_writer_preflight_lists_all_conflicts() {
    let mut state = BatchState {
        title: None,
        items: vec![],
        count: 0,
        sorted: vec![],
    };
    let error = state
        .merge_batch(vec![
            BatchStateDelta {
                title: Some(Some("a".into())),
                ..BatchStateDelta::default()
            },
            BatchStateDelta {
                title: Some(Some("b".into())),
                ..BatchStateDelta::default()
            },
        ])
        .unwrap_err();
    assert!(matches!(
        error,
        Error::Merge(MergeError::SingleWriterConflicts { fields }) if fields == ["title"]
    ));
}

#[derive(Default)]
struct FinishFails;

impl Reducer<Vec<String>> for FinishFails {
    type Delta = Vec<String>;
    const POLICY: WritePolicy = WritePolicy::MultiWriter;

    fn reduce(&mut self, current: &Vec<String>, delta: Vec<String>) -> Result<Vec<String>, Error> {
        let mut value = current.clone();
        value.extend(delta);
        Ok(value)
    }

    fn finish(self, _value: Vec<String>) -> Result<Vec<String>, Error> {
        Err(Error::execution(std::io::Error::other("finish")))
    }
}

#[derive(State)]
struct FinishState {
    #[reducer(Append)]
    first: Vec<String>,
    #[reducer(FinishFails)]
    last: Vec<String>,
}

#[test]
fn late_finish_failure_does_not_commit_earlier_fields() {
    let mut state = FinishState {
        first: vec!["old".into()],
        last: vec!["old".into()],
    };
    let error = state
        .merge_batch(vec![FinishStateDelta {
            first: Some(vec!["new".into()]),
            last: Some(vec!["new".into()]),
        }])
        .unwrap_err();
    assert!(matches!(
        error,
        Error::Merge(MergeError::Finish {
            field: Some("last"),
            ..
        })
    ));
    assert_eq!(state.first, ["old"]);
    assert_eq!(state.last, ["old"]);
}

#[test]
fn reducers_preserve_order_and_checked_intermediate_steps() {
    let mut merge = Merge;
    let current = HashMap::from([("a", 1)]);
    let value = merge
        .reduce(&current, HashMap::from([("a", 2), ("b", 3)]))
        .unwrap();
    let value = merge.reduce(&value, HashMap::from([("a", 4)])).unwrap();
    assert_eq!(value, HashMap::from([("a", 4), ("b", 3)]));

    let mut add = Add;
    assert!(matches!(
        add.reduce(&120_i8, 10),
        Err(Error::Merge(MergeError::Overflow { field: None }))
    ));
}

#[test]
fn untouched_fields_do_not_finish_and_sequential_override_is_valid() {
    let mut finish = FinishState {
        first: vec!["old".into()],
        last: vec!["old".into()],
    };
    finish
        .merge_batch(vec![FinishStateDelta::default()])
        .unwrap();
    assert_eq!(finish.first, ["old"]);

    let mut state = BatchState {
        title: None,
        items: vec![],
        count: 0,
        sorted: vec![],
    };
    for title in ["first", "second"] {
        state
            .merge_batch(vec![BatchStateDelta {
                title: Some(Some(title.into())),
                ..BatchStateDelta::default()
            }])
            .unwrap();
    }
    assert_eq!(state.title.as_deref(), Some("second"));
}
