use std::{
    any::{Any, TypeId, type_name},
    collections::HashMap,
};

use crate::{Error, InputError, NodeId, NodeKey};

pub type SharedValue = std::sync::Arc<dyn Any + Send + Sync>;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Origin {
    Run,
    Node(NodeKey),
}

#[derive(Clone, Debug)]
pub struct SourceRef {
    pub origin: Origin,
    pub value_type: TypeId,
    pub index: usize,
}

#[derive(Debug)]
pub struct Input {
    values: HashMap<TypeId, Vec<SharedValue>>,
    by_source: HashMap<NodeId, Vec<SourceRef>>,
    entry: Vec<SourceRef>,
    ordered: Vec<SourceRef>,
}

impl Input {
    /// Creates explicit entry values, preserving order and sharing their allocations.
    pub fn new(values: Vec<SharedValue>) -> Self {
        let mut builder = InputBuilder::new();
        for value in values {
            builder.push(Origin::Run, value);
        }
        builder.freeze()
    }

    pub(crate) fn values(&self) -> impl Iterator<Item = &SharedValue> {
        self.ordered
            .iter()
            .map(|source| &self.values[&source.value_type][source.index])
    }

    pub fn entry<T: Any + Send + Sync>(&self) -> Result<&T, Error> {
        self.value(self.one_from::<T>(&self.entry, "entry", None)?)
    }

    pub fn one<T: Any + Send + Sync>(&self, source: &NodeId) -> Result<&T, Error> {
        self.value(self.one_from::<T>(self.origins(source), "one", Some(source.clone()))?)
    }

    /// Shares the single entry value without cloning `T` or wrapping it in another Arc.
    ///
    /// # Errors
    /// Returns `Error::Input` with the same type and cardinality rules as [`Self::entry`].
    pub fn entry_shared<T: Any + Send + Sync>(&self) -> Result<std::sync::Arc<T>, Error> {
        self.shared_value(self.one_from::<T>(&self.entry, "entry", None)?)
    }

    /// Shares the single value from `source`, preserving its allocation.
    ///
    /// # Errors
    /// Returns `Error::Input` with the same missing-source, type and cardinality rules as
    /// [`Self::one`]. The returned handle can be passed directly to [`Input::new`].
    pub fn one_shared<T: Any + Send + Sync>(
        &self,
        source: &NodeId,
    ) -> Result<std::sync::Arc<T>, Error> {
        self.shared_value(self.one_from::<T>(self.origins(source), "one", Some(source.clone()))?)
    }

    pub fn many<T: Any + Send + Sync>(&self, source: &NodeId) -> Result<Vec<&T>, Error> {
        self.origins(source)
            .iter()
            .filter(|source_ref| source_ref.value_type == TypeId::of::<T>())
            .map(|source_ref| self.value(source_ref))
            .collect()
    }

    pub fn all<T: Any + Send + Sync>(&self) -> Result<Vec<&T>, Error> {
        self.ordered
            .iter()
            .filter(|source_ref| source_ref.value_type == TypeId::of::<T>())
            .map(|source_ref| self.value(source_ref))
            .collect()
    }

    pub fn origins(&self, source: &NodeId) -> &[SourceRef] {
        self.by_source.get(source).map_or(&[], Vec::as_slice)
    }

    pub fn entry_origins(&self) -> &[SourceRef] {
        &self.entry
    }

    fn one_from<'a, T: Any + Send + Sync>(
        &self,
        origins: &'a [SourceRef],
        operation: &'static str,
        source_node: Option<NodeId>,
    ) -> Result<&'a SourceRef, Error> {
        if origins.is_empty()
            && let Some(source_node) = source_node
        {
            return Err(InputError::MissingSource { source_node }.into());
        }
        let matches = origins
            .iter()
            .filter(|source_ref| source_ref.value_type == TypeId::of::<T>())
            .collect::<Vec<_>>();
        match matches.as_slice() {
            [source_ref] => Ok(source_ref),
            [] if !origins.is_empty() => Err(InputError::TypeMismatch {
                expected_type: type_name::<T>(),
            }
            .into()),
            _ => Err(InputError::Cardinality {
                operation,
                source_node,
                expected_type: type_name::<T>(),
                actual: matches.len(),
            }
            .into()),
        }
    }

    fn shared_value<T: Any + Send + Sync>(
        &self,
        source_ref: &SourceRef,
    ) -> Result<std::sync::Arc<T>, Error> {
        self.values[&source_ref.value_type][source_ref.index]
            .clone()
            .downcast::<T>()
            .map_err(|_| {
                InputError::TypeMismatch {
                    expected_type: type_name::<T>(),
                }
                .into()
            })
    }

    fn value<T: Any + Send + Sync>(&self, source_ref: &SourceRef) -> Result<&T, Error> {
        self.values
            .get(&source_ref.value_type)
            .and_then(|values| values.get(source_ref.index))
            .and_then(|value| value.downcast_ref::<T>())
            .ok_or_else(|| {
                InputError::TypeMismatch {
                    expected_type: type_name::<T>(),
                }
                .into()
            })
    }
}

pub(crate) struct InputBuilder {
    input: Input,
}

impl InputBuilder {
    pub(crate) fn new() -> Self {
        Self {
            input: Input {
                values: HashMap::new(),
                by_source: HashMap::new(),
                entry: Vec::new(),
                ordered: Vec::new(),
            },
        }
    }

    pub(crate) fn push(&mut self, origin: Origin, value: SharedValue) {
        let value_type = value.as_ref().type_id();
        let values = self.input.values.entry(value_type).or_default();
        let source_ref = SourceRef {
            origin: origin.clone(),
            value_type,
            index: values.len(),
        };
        values.push(value);
        match origin {
            Origin::Run => self.input.entry.push(source_ref.clone()),
            Origin::Node(key) => {
                let source = match key {
                    NodeKey::Static(node) => node,
                    NodeKey::Instance { template, .. } => template,
                };
                self.input
                    .by_source
                    .entry(source)
                    .or_default()
                    .push(source_ref.clone());
            }
        }
        self.input.ordered.push(source_ref);
    }

    pub(crate) fn freeze(self) -> Input {
        self.input
    }
}

/// Explicit inputs for each entry of a graph invocation.
#[derive(Debug)]
pub struct GraphInput {
    pub(crate) entries: HashMap<NodeId, Input>,
}

impl GraphInput {
    /// Rebuilds entry origins without carrying provenance across graph boundaries.
    pub fn new(entries: HashMap<NodeId, Input>) -> Self {
        Self {
            entries: entries
                .into_iter()
                .map(|(id, input)| (id, Input::new(input.values().cloned().collect())))
                .collect(),
        }
    }

    /// Reads an entry, returning `Error::Input` when the key is absent.
    pub fn entry(&self, node: &NodeId) -> Result<&Input, Error> {
        self.entries
            .get(node)
            .ok_or_else(|| InputError::MissingEntry { node: node.clone() }.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn call_input_rebuilds_origins_and_shares_values_in_order() {
        let id = NodeId::new("parent");
        let value = Arc::new(String::from("shared"));
        let mut builder = InputBuilder::new();
        builder.push(Origin::Node(NodeKey::Static(id.clone())), value.clone());
        builder.push(Origin::Run, Arc::new(7_u32));
        builder.push(
            Origin::Node(NodeKey::Static(id.clone())),
            Arc::new(String::from("second")),
        );
        let original = builder.freeze();
        assert_eq!(original.many::<String>(&id).unwrap().len(), 2);
        assert!(matches!(
            original.one::<String>(&id),
            Err(Error::Input(InputError::Cardinality { actual: 2, .. }))
        ));
        let input = GraphInput::new(HashMap::from([(id.clone(), original)]));
        let entry = input.entry(&id).unwrap();
        assert!(entry.origins(&id).is_empty());
        assert!(
            entry
                .entry_origins()
                .iter()
                .all(|source| source.origin == Origin::Run)
        );
        assert_eq!(
            entry
                .entry_origins()
                .iter()
                .map(|source| source.value_type)
                .collect::<Vec<_>>(),
            [
                TypeId::of::<String>(),
                TypeId::of::<u32>(),
                TypeId::of::<String>()
            ]
        );
        let strings = entry.all::<String>().unwrap();
        assert_eq!(strings, [&*value, "second"]);
        assert!(std::ptr::eq(strings[0], &*value));
        assert_eq!(entry.entry::<u32>().unwrap(), &7);
        assert!(matches!(
            input.entry(&NodeId::new("absent")),
            Err(Error::Input(InputError::MissingEntry { .. }))
        ));
        let empty = Input::new(vec![]);
        assert!(empty.all::<String>().unwrap().is_empty());
        assert!(matches!(
            empty.entry::<String>(),
            Err(Error::Input(InputError::Cardinality { actual: 0, .. }))
        ));
    }

    #[test]
    fn shared_reads_preserve_missing_type_and_cardinality_errors() {
        let source = NodeId::new("source");
        let empty = Input::new(vec![]);
        for error in [
            empty.entry::<u32>().unwrap_err(),
            empty.entry_shared::<u32>().unwrap_err(),
        ] {
            assert!(matches!(
                error,
                Error::Input(InputError::Cardinality {
                    operation: "entry",
                    source_node: None,
                    actual: 0,
                    ..
                })
            ));
        }
        for error in [
            empty.one::<u32>(&source).unwrap_err(),
            empty.one_shared::<u32>(&source).unwrap_err(),
        ] {
            assert!(matches!(error, Error::Input(InputError::MissingSource {
                source_node
            }) if source_node == source));
        }

        for values in [
            vec![Arc::new("wrong type") as SharedValue],
            vec![Arc::new(1_u32) as SharedValue, Arc::new(2_u32)],
        ] {
            let count = values.len();
            let entry = Input::new(values.clone());
            let mut builder = InputBuilder::new();
            for (index, value) in values.into_iter().enumerate() {
                builder.push(
                    Origin::Node(NodeKey::Instance {
                        template: source.clone(),
                        key: index.to_string(),
                    }),
                    value,
                );
            }
            let upstream = builder.freeze();
            for (operation, source_node, errors) in [
                (
                    "entry",
                    None,
                    [
                        entry.entry::<u32>().unwrap_err(),
                        entry.entry_shared::<u32>().unwrap_err(),
                    ],
                ),
                (
                    "one",
                    Some(source.clone()),
                    [
                        upstream.one::<u32>(&source).unwrap_err(),
                        upstream.one_shared::<u32>(&source).unwrap_err(),
                    ],
                ),
            ] {
                for error in errors {
                    if count == 1 {
                        assert!(matches!(error, Error::Input(InputError::TypeMismatch {
                            expected_type
                        }) if expected_type == type_name::<u32>()));
                    } else {
                        assert!(matches!(error, Error::Input(InputError::Cardinality {
                            operation: actual_operation, source_node: actual_source,
                            expected_type, actual: 2,
                        }) if actual_operation == operation && actual_source == source_node
                            && expected_type == type_name::<u32>()));
                    }
                }
            }
        }
    }
}
