use std::{collections::HashMap, sync::Arc};

use serde::{Deserialize, Serialize};

use crate::{Error, InputError, NodeId, NodeKey};

pub type SharedValue = Arc<serde_json::Value>;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum Origin {
    Run,
    Node(NodeKey),
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct InputEntry {
    pub origin: Origin,
    pub value: SharedValue,
}

/// Ordered JSON values with their actual source in this Run.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Input {
    values: Vec<InputEntry>,
}

impl Input {
    pub fn new(values: Vec<SharedValue>) -> Self {
        Self {
            values: values
                .into_iter()
                .map(|value| InputEntry {
                    origin: Origin::Run,
                    value,
                })
                .collect(),
        }
    }

    pub fn values(&self) -> &[InputEntry] {
        &self.values
    }

    pub fn entry(&self) -> Result<&serde_json::Value, Error> {
        Ok(self
            .single("entry", None, |origin| matches!(origin, Origin::Run))?
            .as_ref())
    }

    pub fn entry_shared(&self) -> Result<SharedValue, Error> {
        self.single("entry", None, |origin| matches!(origin, Origin::Run))
            .cloned()
    }

    pub fn one(&self, source: &NodeId) -> Result<&serde_json::Value, Error> {
        Ok(self
            .single("one", Some(source), |origin| {
                origin.source() == Some(source)
            })?
            .as_ref())
    }

    pub fn one_shared(&self, source: &NodeId) -> Result<SharedValue, Error> {
        self.single("one", Some(source), |origin| {
            origin.source() == Some(source)
        })
        .cloned()
    }

    pub fn many(&self, source: &NodeId) -> Vec<&serde_json::Value> {
        self.values
            .iter()
            .filter(|entry| entry.origin.source() == Some(source))
            .map(|entry| entry.value.as_ref())
            .collect()
    }

    fn single(
        &self,
        operation: &'static str,
        source: Option<&NodeId>,
        matches: impl Fn(&Origin) -> bool,
    ) -> Result<&SharedValue, Error> {
        let mut values = self.values.iter().filter(|entry| matches(&entry.origin));
        let first = values.next();
        let second = values.next();
        if let Some(source_node) = source
            && first.is_none()
        {
            return Err(InputError::MissingSource {
                source_node: source_node.clone(),
            }
            .into());
        }
        if first.is_none() || second.is_some() {
            return Err(InputError::Cardinality {
                operation,
                source_node: source.cloned(),
                actual: self
                    .values
                    .iter()
                    .filter(|entry| matches(&entry.origin))
                    .count(),
            }
            .into());
        }
        Ok(&first.expect("single value").value)
    }
}

impl Origin {
    fn source(&self) -> Option<&NodeId> {
        match self {
            Self::Run => None,
            Self::Node(NodeKey::Static(id) | NodeKey::Instance { template: id, .. }) => Some(id),
        }
    }
}

pub(crate) struct InputBuilder {
    values: Vec<InputEntry>,
}

impl InputBuilder {
    pub(crate) fn new() -> Self {
        Self { values: Vec::new() }
    }

    pub(crate) fn push(&mut self, origin: Origin, value: SharedValue) {
        self.values.push(InputEntry { origin, value });
    }

    pub(crate) fn freeze(self) -> Input {
        Input {
            values: self.values,
        }
    }
}

/// Explicit inputs for each entry of a graph invocation.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct GraphInput {
    pub(crate) entries: HashMap<NodeId, Input>,
}

impl GraphInput {
    pub fn new(entries: HashMap<NodeId, Input>) -> Self {
        Self {
            entries: entries
                .into_iter()
                .map(|(id, input)| {
                    (
                        id,
                        Input::new(input.values.into_iter().map(|entry| entry.value).collect()),
                    )
                })
                .collect(),
        }
    }

    pub fn entry(&self, node: &NodeId) -> Result<&Input, Error> {
        self.entries
            .get(node)
            .ok_or_else(|| InputError::MissingEntry { node: node.clone() }.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn values_keep_order_and_origin_without_type_filtering() {
        let source = NodeId::new("source");
        let mut builder = InputBuilder::new();
        builder.push(Origin::Run, Arc::new(json!("same")));
        for key in ["first", "second"] {
            builder.push(
                Origin::Node(NodeKey::Instance {
                    template: source.clone(),
                    key: key.into(),
                }),
                Arc::new(json!("same")),
            );
        }
        let input = builder.freeze();
        assert_eq!(input.entry().unwrap(), &json!("same"));
        assert_eq!(input.many(&source), vec![&json!("same"), &json!("same")]);
        assert!(matches!(
            input.one(&source),
            Err(Error::Input(InputError::Cardinality { actual: 2, .. }))
        ));
        assert_eq!(input.values()[0].origin, Origin::Run);
        assert_eq!(
            serde_json::from_value::<Input>(serde_json::to_value(&input).unwrap()).unwrap(),
            input
        );
    }

    #[test]
    fn graph_entry_resets_origins_and_preserves_shared_values() {
        let id = NodeId::new("entry");
        let value = Arc::new(json!({"amount": 7}));
        let mut builder = InputBuilder::new();
        builder.push(Origin::Node(NodeKey::Static(id.clone())), value.clone());
        let input = GraphInput::new(HashMap::from([(id.clone(), builder.freeze())]));
        let entry = input.entry(&id).unwrap();
        assert_eq!(entry.values()[0].origin, Origin::Run);
        assert!(Arc::ptr_eq(&entry.values()[0].value, &value));
        assert_eq!(entry.entry().unwrap(), value.as_ref());
    }
}
