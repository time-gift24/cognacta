use std::{
    any::{Any, TypeId, type_name},
    collections::HashMap,
};

use crate::{Error, InputError, NodeId};

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
    pub fn entry<T: Any + Send + Sync>(&self) -> Result<&T, Error> {
        self.one_from(&self.entry, "entry", None)
    }

    pub fn one<T: Any + Send + Sync>(&self, source: &NodeId) -> Result<&T, Error> {
        let origins = self.origins(source);
        if origins.is_empty() {
            return Err(InputError::MissingSource {
                source_node: source.clone(),
            }
            .into());
        }
        self.one_from(origins, "one", Some(source.clone()))
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

    fn one_from<T: Any + Send + Sync>(
        &self,
        origins: &[SourceRef],
        operation: &'static str,
        source_node: Option<NodeId>,
    ) -> Result<&T, Error> {
        let matches = origins
            .iter()
            .filter(|source_ref| source_ref.value_type == TypeId::of::<T>())
            .collect::<Vec<_>>();
        match matches.as_slice() {
            [source_ref] => self.value(source_ref),
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

use crate::NodeKey;
