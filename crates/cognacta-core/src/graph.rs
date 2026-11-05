use std::{
    any::{TypeId, type_name},
    collections::{HashMap, HashSet},
    future::Future,
    marker::PhantomData,
    pin::Pin,
    sync::Arc,
};

use bon::bon;

use crate::{
    Directive, Error, GraphError, GraphInput, Input, NodeId, NodeInstance, NodeKey, RunContext,
    Scheduler, SharedValue, State, WritePolicy,
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

/// Node result; `None` means no value, while `Some(Arc::new(()))` is a unit result.
pub struct Outcome<S: State, O> {
    pub value: Option<Arc<O>>,
    pub state_delta: S::Delta,
    pub directive: Option<Directive>,
}

/// The current wave snapshot, node identity and explicit invocation context.
pub struct NodeContext<S: State, R = ()> {
    pub state: Arc<S>,
    pub run: RunContext<R>,
    pub key: NodeKey,
}

#[bon]
impl<P: State, R: Send + Sync + 'static> NodeContext<P, R> {
    /// Names a Graph-as-Node call made by a generic node wrapper without creating a Run.
    pub fn with_call_key(&self, key: impl Into<String>) -> Result<Self, Error> {
        let key = key.into();
        if key.is_empty() || key.starts_with('@') {
            return Err(self
                .run
                .gate
                .fail(crate::HistoryError::InvalidCallKey { key }.into()));
        }
        let mut run = self.run.clone();
        run.call_key = Some(key);
        Ok(Self {
            state: self.state.clone(),
            run,
            key: self.key.clone(),
        })
    }

    /// Calls a reusable Graph using a stable key within this logical node attempt.
    #[builder(start_fn = call_builder, finish_fn = call, builder_type = NodeCallBuilder, state_mod(vis = "pub"))]
    pub fn call<'a, C, O, T>(
        &'a self,
        key: impl Into<String> + Send + 'a,
        graph: &'a Graph<C, O, T>,
        input: impl Into<Arc<GraphInput>> + Send + 'a,
        resources: Arc<T>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Pin<Box<dyn Future<Output = Result<Arc<O>, Error>> + Send + 'a>>
    where
        C: State,
        O: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
        T: Send + Sync + 'static,
    {
        Box::pin(async move {
            let key = key.into();
            if key.is_empty() || key.starts_with('@') {
                return Err(self
                    .run
                    .gate
                    .fail(crate::HistoryError::InvalidCallKey { key }.into()));
            }
            self.call_inner(key, graph, input.into(), resources, scheduler)
                .await
        })
    }

    fn call_inner<'a, C, O, T>(
        &'a self,
        key: String,
        graph: &'a Graph<C, O, T>,
        input: Arc<GraphInput>,
        resources: Arc<T>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Pin<Box<dyn Future<Output = Result<Arc<O>, Error>> + Send + 'a>>
    where
        C: State,
        O: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
        T: Send + Sync + 'static,
    {
        Box::pin(async move {
            self.run.gate.check()?;
            if self.run.depth() >= self.run.max_depth() {
                crate::scheduler::observation::depth_rejected(&self.run, &self.key);
                return Err(crate::CallError::DepthExceeded {
                    parent_depth: self.run.depth(),
                    max_depth: self.run.max_depth(),
                }
                .into());
            }
            let host = self
                .run
                .node_calls
                .as_ref()
                .ok_or(crate::HistoryError::CallContext)?;
            let (call, input) = host.link(key, input).await?;
            let child = self.run.with_resources(resources).for_child(&call);
            scheduler
                .child(graph, input, child, call)
                .await?
                .into_result()
        })
    }
}

type ErasedFuture<'a, S> =
    Pin<Box<dyn Future<Output = Result<ErasedOutcome<S>, Error>> + Send + 'a>>;

pub(crate) trait ErasedNode<S: State, R>: Send + Sync {
    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> ErasedFuture<'a, S>;
}

struct Adapter<N>(N);

impl<S, N, R> ErasedNode<S, R> for Adapter<N>
where
    S: State,
    N: crate::NodeInstance<S, R>,
    R: Send + Sync + 'static,
{
    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> ErasedFuture<'a, S> {
        Box::pin(async move {
            let outcome = self.0.run(input, ctx, scheduler).await?;
            Ok(ErasedOutcome {
                value: outcome
                    .value
                    .map(|value| {
                        serde_json::to_value(value.as_ref())
                            .map(Arc::new)
                            .map_err(|source| crate::EventLogError::Encode {
                                source: Box::new(source),
                            })
                    })
                    .transpose()?,
                state_delta: outcome.state_delta,
                directive: outcome.directive,
            })
        })
    }
}

struct ResourceAdapter<S: State, R, F> {
    instance: Arc<dyn ErasedNode<S, R>>,
    project: F,
}

impl<S, R, T, F> ErasedNode<S, T> for ResourceAdapter<S, R, F>
where
    S: State,
    R: Send + Sync + 'static,
    T: Send + Sync + 'static,
    F: Fn(&T) -> Result<Arc<R>, Error> + Send + Sync + 'static,
{
    fn run<'a>(
        &'a self,
        input: &'a Input,
        ctx: NodeContext<S, T>,
        scheduler: Arc<dyn Scheduler>,
    ) -> ErasedFuture<'a, S> {
        Box::pin(async move {
            let resources = (self.project)(ctx.run.resources())?;
            let context = NodeContext {
                state: ctx.state,
                run: ctx.run.with_resources(resources),
                key: ctx.key,
            };
            self.instance.run(input, context, scheduler).await
        })
    }
}

pub struct Node<S: State, R = ()> {
    pub(crate) id: NodeId,
    pub(crate) instance: Arc<dyn ErasedNode<S, R>>,
    pub(crate) join: Join,
    pub(crate) template: bool,
    pub(crate) output_type: TypeId,
    pub(crate) output_name: &'static str,
    pub(crate) writes: Vec<S::Field>,
    pub(crate) declared_targets: Vec<DirectiveTarget>,
}

impl<S: State, R: Send + Sync + 'static> Node<S, R> {
    pub fn new<N: crate::NodeInstance<S, R>>(id: NodeId, instance: N) -> Self {
        Self {
            id,
            instance: Arc::new(Adapter(instance)),
            join: Join::All,
            template: false,
            output_type: TypeId::of::<N::Output>(),
            output_name: type_name::<N::Output>(),
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

    pub fn writes(mut self, fields: Vec<S::Field>) -> Self {
        self.writes = fields;
        self
    }

    pub fn declared_targets(mut self, targets: Vec<DirectiveTarget>) -> Self {
        self.declared_targets = targets;
        self
    }

    /// Projects explicit resources at execution time, preserving identity and node policies.
    pub fn with_resources<T, F>(self, project: F) -> Node<S, T>
    where
        T: Send + Sync + 'static,
        F: Fn(&T) -> Result<Arc<R>, Error> + Send + Sync + 'static,
    {
        Node {
            instance: Arc::new(ResourceAdapter {
                instance: self.instance,
                project,
            }),
            id: self.id,
            join: self.join,
            template: self.template,
            output_type: self.output_type,
            output_name: self.output_name,
            writes: self.writes,
            declared_targets: self.declared_targets,
        }
    }
}

impl<P, C, O, R> NodeInstance<P, R> for Graph<C, O, R>
where
    P: State,
    C: State,
    O: serde::Serialize + serde::de::DeserializeOwned + Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    type Output = O;

    async fn run(
        &self,
        input: &Input,
        ctx: NodeContext<P, R>,
        scheduler: Arc<dyn Scheduler>,
    ) -> Result<Outcome<P, O>, Error> {
        if input.values().len() != 1 {
            return Err(crate::InputError::Cardinality {
                operation: "single",
                source_node: None,
                actual: input.values().len(),
            }
            .into());
        }
        let input = Arc::new(
            serde_json::from_value(input.values()[0].value.as_ref().clone())
                .map_err(|source| crate::InputError::Decode { source })?,
        );
        let key = ctx.run.call_key.clone().unwrap_or_else(|| "@graph".into());
        let value = ctx
            .call_inner(key, self, input, ctx.run.resources().clone(), scheduler)
            .await?;
        Ok(Outcome {
            value: Some(value),
            state_delta: Default::default(),
            directive: None,
        })
    }
}

/// Reusable graph definition with a single typed return and per-invocation initializer.
pub struct Graph<S: State, O, R = ()> {
    pub(crate) nodes: Vec<Node<S, R>>,
    pub(crate) edges: Vec<Edge<S>>,
    pub(crate) entries: HashSet<NodeId>,
    indices: HashMap<NodeId, usize>,
    pub(crate) return_node: NodeId,
    pub(crate) initializer: Box<Initializer<S, R>>,
    output: PhantomData<O>,
}

type Initializer<S, R> = dyn Fn(Arc<GraphInput>, RunContext<R>) -> Pin<Box<dyn Future<Output = Result<S, Error>> + Send>>
    + Send
    + Sync;

#[bon]
impl<S: State + Default, O: Send + Sync + 'static, R: Send + Sync + 'static> Graph<S, O, R> {
    /// Builds a static graph using a fresh `S::default()` for each invocation.
    #[builder(start_fn = builder, finish_fn = build, builder_type = GraphBuilder, state_mod(vis = "pub"))]
    pub fn build(
        nodes: Vec<Node<S, R>>,
        edges: Vec<Edge<S>>,
        entries: Vec<NodeId>,
        return_node: NodeId,
    ) -> Result<Self, Error> {
        Self::build_with_initializer(nodes, edges, entries, return_node, |_, _| async {
            Ok(S::default())
        })
    }
}

#[bon]
impl<S: State, O: Send + Sync + 'static, R: Send + Sync + 'static> Graph<S, O, R> {
    /// Validates the graph without invoking its asynchronous State initializer.
    /// Returns `Error::Graph` for invalid topology, writes, or return declarations.
    #[builder(start_fn = builder_with_initializer, finish_fn = build, builder_type = GraphWithInitializerBuilder, state_mod(vis = "pub"))]
    pub fn build_with_initializer<F, Fut>(
        nodes: Vec<Node<S, R>>,
        edges: Vec<Edge<S>>,
        entries: Vec<NodeId>,
        return_node: NodeId,
        state_initializer: F,
    ) -> Result<Self, Error>
    where
        F: Fn(Arc<GraphInput>, RunContext<R>) -> Fut + Send + Sync + 'static,
        Fut: Future<Output = Result<S, Error>> + Send + 'static,
    {
        let mut indices = HashMap::new();
        for (index, node) in nodes.iter().enumerate() {
            if indices.insert(node.id.clone(), index).is_some() {
                return Err(GraphError::DuplicateNode {
                    node: node.id.clone(),
                }
                .into());
            }
        }
        let index = *indices
            .get(&return_node)
            .ok_or_else(|| GraphError::UnknownReturnNode {
                node: return_node.clone(),
            })?;
        let node = &nodes[index];
        if node.template {
            return Err(GraphError::InvalidReturnNode { node: return_node }.into());
        }
        if node.output_type != TypeId::of::<O>() {
            return Err(GraphError::ReturnTypeMismatch {
                node: return_node,
                expected_type: type_name::<O>(),
                actual_type: node.output_name,
            }
            .into());
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
            return_node,
            initializer: Box::new(move |input, context| {
                Box::pin(state_initializer(input, context))
            }),
            output: PhantomData,
        };
        graph.check_static_writers()?;
        Ok(graph)
    }
}

impl<S: State, O, R> Graph<S, O, R> {
    pub(crate) fn node(&self, id: &NodeId) -> &Node<S, R> {
        &self.nodes[self.indices[id]]
    }

    pub(crate) fn key_node(&self, key: &NodeKey) -> &Node<S, R> {
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

pub(crate) struct ErasedOutcome<S: State> {
    pub(crate) value: Option<SharedValue>,
    pub(crate) state_delta: S::Delta,
    pub(crate) directive: Option<Directive>,
}
