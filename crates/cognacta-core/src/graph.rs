use std::{
    collections::{HashMap, HashSet},
    future::Future,
    pin::Pin,
    sync::Arc,
};

use bon::bon;

use crate::{
    Directive, Error, GraphError, Input, NodeId, NodeKey, SharedValue, State, WritePolicy,
};

#[derive(Clone)]
pub enum Join {
    All,
    Any,
    Custom(Arc<dyn Fn(usize, usize) -> bool + Send + Sync>),
}

#[derive(Clone)]
pub struct Edge<S: State> {
    pub source: NodeId,
    pub target: NodeId,
    #[allow(clippy::type_complexity)]
    pub when: Option<Arc<dyn Fn(&S) -> bool + Send + Sync>>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DirectiveTarget {
    Transition(NodeId),
    Deliver(NodeId),
}

pub struct Outcome<S: State, O = SharedValue> {
    pub value: Option<O>,
    pub state_delta: S::Delta,
    pub directive: Option<Directive>,
}

pub struct NodeContext<S: State> {
    pub state: Arc<S>,
    pub run_id: String,
    pub key: NodeKey,
}

type ErasedFuture<'a, S> =
    Pin<Box<dyn Future<Output = Result<Outcome<S, SharedValue>, Error>> + Send + 'a>>;

pub(crate) trait ErasedNode<S: State>: Send + Sync {
    fn run<'a>(&'a self, input: &'a Input, ctx: NodeContext<S>) -> ErasedFuture<'a, S>;
}

struct Adapter<N>(N);

impl<S, N> ErasedNode<S> for Adapter<N>
where
    S: State,
    N: crate::NodeInstance<S>,
{
    fn run<'a>(&'a self, input: &'a Input, ctx: NodeContext<S>) -> ErasedFuture<'a, S> {
        Box::pin(async move {
            let outcome = self.0.run(input, ctx).await?;
            Ok(Outcome {
                value: outcome.value.map(|value| Arc::new(value) as SharedValue),
                state_delta: outcome.state_delta,
                directive: outcome.directive,
            })
        })
    }
}

pub struct Node<S: State> {
    pub(crate) id: NodeId,
    pub(crate) instance: Arc<dyn ErasedNode<S>>,
    pub(crate) join: Join,
    pub(crate) template: bool,
    pub(crate) terminal: bool,
    pub(crate) writes: Vec<S::Field>,
    pub(crate) declared_targets: Vec<DirectiveTarget>,
}

impl<S: State> Node<S> {
    pub fn new<N: crate::NodeInstance<S>>(id: NodeId, instance: N) -> Self {
        Self {
            id,
            instance: Arc::new(Adapter(instance)),
            join: Join::All,
            template: false,
            terminal: false,
            writes: Vec::new(),
            declared_targets: Vec::new(),
        }
    }

    pub fn join(mut self, join: Join) -> Self {
        self.join = join;
        self
    }

    pub fn template(mut self, enabled: bool) -> Self {
        self.template = enabled;
        self
    }

    pub fn terminal(mut self, enabled: bool) -> Self {
        self.terminal = enabled;
        self
    }

    pub fn writes(mut self, fields: Vec<S::Field>) -> Self {
        self.writes = fields;
        self
    }

    pub fn declared_targets(mut self, targets: Vec<DirectiveTarget>) -> Self {
        self.declared_targets = targets;
        self
    }
}

pub struct Graph<S: State> {
    pub(crate) nodes: Vec<Node<S>>,
    pub(crate) edges: Vec<Edge<S>>,
    pub(crate) entries: HashSet<NodeId>,
    indices: HashMap<NodeId, usize>,
}

#[bon]
impl<S: State> Graph<S> {
    #[builder(
        start_fn = builder,
        finish_fn = build,
        builder_type = GraphBuilder,
        state_mod(vis = "pub")
    )]
    pub fn build(
        nodes: Vec<Node<S>>,
        edges: Vec<Edge<S>>,
        entries: Vec<NodeId>,
    ) -> Result<Self, Error> {
        let mut indices = HashMap::new();
        for (index, node) in nodes.iter().enumerate() {
            if indices.insert(node.id.clone(), index).is_some() {
                return Err(GraphError::DuplicateNode {
                    node: node.id.clone(),
                }
                .into());
            }
            if node.template && node.terminal {
                return Err(GraphError::InvalidTemplateRole {
                    node: node.id.clone(),
                }
                .into());
            }
        }
        for edge in &edges {
            for endpoint in [&edge.source, &edge.target] {
                if !indices.contains_key(endpoint) {
                    return Err(GraphError::UnknownEdgeEndpoint {
                        node: endpoint.clone(),
                    }
                    .into());
                }
            }
            if nodes[indices[&edge.target]].template {
                return Err(GraphError::InvalidTemplateRole {
                    node: edge.target.clone(),
                }
                .into());
            }
        }
        for node in &nodes {
            for target in &node.declared_targets {
                let (target_id, template) = match target {
                    DirectiveTarget::Transition(target) => (target, false),
                    DirectiveTarget::Deliver(target) => (target, true),
                };
                let valid = indices
                    .get(target_id)
                    .is_some_and(|index| nodes[*index].template == template);
                if !valid {
                    return Err(GraphError::InvalidDeclaredTarget {
                        writer: node.id.clone(),
                        target: target_id.clone(),
                    }
                    .into());
                }
            }
        }
        let entries = if entries.is_empty() {
            nodes
                .iter()
                .filter(|node| !node.template && !edges.iter().any(|edge| edge.target == node.id))
                .map(|node| node.id.clone())
                .collect::<HashSet<_>>()
        } else {
            entries.into_iter().collect::<HashSet<_>>()
        };
        if entries.is_empty() {
            return Err(GraphError::NoEntry.into());
        }
        for entry in &entries {
            let Some(index) = indices.get(entry) else {
                return Err(GraphError::UnknownEntry {
                    node: entry.clone(),
                }
                .into());
            };
            if nodes[*index].template {
                return Err(GraphError::InvalidTemplateRole {
                    node: entry.clone(),
                }
                .into());
            }
        }
        let graph = Self {
            nodes,
            edges,
            entries,
            indices,
        };
        graph.check_static_writers()?;
        Ok(graph)
    }
}

impl<S: State> Graph<S> {
    pub(crate) fn node(&self, id: &NodeId) -> &Node<S> {
        &self.nodes[self.indices[id]]
    }

    pub(crate) fn key_node(&self, key: &NodeKey) -> &Node<S> {
        match key {
            NodeKey::Static(id) => self.node(id),
            NodeKey::Instance { template, .. } => self.node(template),
        }
    }

    fn check_static_writers(&self) -> Result<(), Error> {
        if self
            .nodes
            .iter()
            .any(|node| node.template || !node.declared_targets.is_empty())
            || self.edges.iter().any(|edge| edge.when.is_some())
        {
            return Ok(());
        }
        let mut levels = HashMap::<NodeId, usize>::new();
        for entry in &self.entries {
            levels.insert(entry.clone(), 0);
        }
        let mut changed = true;
        let mut visits = 0;
        while changed && visits <= self.edges.len() {
            changed = false;
            visits += 1;
            for edge in &self.edges {
                if self.entries.contains(&edge.target) {
                    continue;
                }
                if let Some(source_level) = levels.get(&edge.source).copied() {
                    let level = source_level + 1;
                    let current = levels.get(&edge.target).copied();
                    if current.is_none_or(|current| current < level) {
                        levels.insert(edge.target.clone(), level);
                        changed = true;
                    }
                }
            }
        }
        if changed {
            return Ok(());
        }
        let metadata = S::fields()
            .iter()
            .map(|field| (field.id, field))
            .collect::<HashMap<_, _>>();
        for node in &self.nodes {
            if !levels.contains_key(&node.id) {
                continue;
            }
            for writer in &node.writes {
                let Some(field) = metadata.get(writer) else {
                    continue;
                };
                if field.policy != WritePolicy::SingleWriter {
                    continue;
                }
                let level = levels[&node.id];
                let mut writers = self
                    .nodes
                    .iter()
                    .filter(|candidate| {
                        levels.get(&candidate.id) == Some(&level)
                            && candidate.writes.contains(writer)
                    })
                    .map(|candidate| candidate.id.clone())
                    .collect::<Vec<_>>();
                if writers.len() > 1 {
                    writers.sort();
                    return Err(GraphError::ConcurrentSingleWriter {
                        field: field.name,
                        writers,
                    }
                    .into());
                }
            }
        }
        Ok(())
    }
}
