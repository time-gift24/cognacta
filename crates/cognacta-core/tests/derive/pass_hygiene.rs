use cognacta_core::{Add, Override, State};

struct Option;
struct Vec;
struct Box;
struct Some;
struct None;
struct Ok;
struct Err;

#[derive(serde::Serialize, State, serde::Deserialize)]
struct Tree {
    #[reducer(Override)]
    next: std::option::Option<std::boxed::Box<Self>>,
    #[reducer(Add)]
    r#type: u8,
    #[reducer(Add)]
    _1: u8,
}

trait Value {
    type Item: Send + Sync + 'static;
}

#[derive(serde::Serialize, State, serde::Deserialize)]
struct Generic<Vec: Send + Sync + 'static>
where
    Self: Value<Item = Vec>,
{
    #[reducer(Override)]
    value: <Self as Value>::Item,
}

impl<T: Send + Sync + 'static> Value for Generic<T> {
    type Item = T;
}

#[derive(serde::Serialize, State, serde::Deserialize)]
struct LocalScope {
    #[reducer(Override)]
    value: [u8; {
        struct Local;
        impl Local {
            const COUNT: usize = 1;
            const SIZE: usize = Self::COUNT;
        }
        Local::SIZE
    }],
}

fn main() {
    let _ = (Option, Vec, Box, Some, None, Ok, Err);
    let mut tree = Tree {
        next: std::option::Option::None,
        r#type: 0,
        _1: 0,
    };
    tree.merge_batch(vec![TreeDelta {
        next: std::option::Option::Some(std::option::Option::Some(std::boxed::Box::new(Tree {
            next: std::option::Option::None,
            r#type: 3,
            _1: 4,
        }))),
        r#type: std::option::Option::Some(1),
        _1: std::option::Option::Some(2),
    }])
    .unwrap();
    assert_eq!((tree.r#type, tree._1), (1, 2));
    let next = tree.next.unwrap();
    assert_eq!((next.r#type, next._1), (3, 4));
    let _ = [TreeField::Type, TreeField::_1];

    let mut generic = Generic { value: 0u8 };
    generic
        .merge_batch(vec![GenericDelta {
            value: std::option::Option::Some(1),
        }])
        .unwrap();
    assert_eq!(generic.value, 1);

    assert_eq!(LocalScope { value: [1] }.value, [1]);
}
