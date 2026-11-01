use super::SchedulerConfig;
use crate::{
    Directive, DirectiveError, Error, Graph, GraphInput, Input, Join, NodeError, NodeId, NodeKey,
    NodeRun, NodeStatus, Origin, Run, RunContext, RunError, RunStatus, SharedValue, State,
    input::InputBuilder,
};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};
use tokio::task::{Id, JoinSet};
use tracing::{Instrument, instrument::WithSubscriber};
struct TransitionPlan {
    writer: NodeKey,
    payload: Option<SharedValue>,
    immediate: bool,
}

pub(super) struct Execution<'a, S: State, O, R> {
    graph: &'a Graph<S, O, R>,
    run: Run<S, O>,
    input: Arc<GraphInput>,
    context: RunContext<R>,
    config: SchedulerConfig,
    transitions: HashMap<NodeId, TransitionPlan>,
    instance_inputs: HashMap<NodeKey, (NodeKey, SharedValue)>,
    instance_order: Vec<NodeKey>,
}
impl<'a, S: State, O: Send + Sync + 'static, R: Send + Sync + 'static> Execution<'a, S, O, R> {
    pub(super) fn new(
        graph: &'a Graph<S, O, R>,
        input: Arc<GraphInput>,
        context: RunContext<R>,
        config: SchedulerConfig,
        state: S,
    ) -> Self {
        let run = Run {
            state: Arc::new(state),
            status: RunStatus::Running,
            nodes: graph
                .nodes
                .iter()
                .filter(|node| !node.template)
                .map(|node| (NodeKey::Static(node.id.clone()), NodeRun::pending()))
                .collect(),
            instances: HashMap::new(),
            errors: Vec::new(),
            final_output: None,
            waves: 0,
            run_id: context.run_id().to_owned(),
            parent_run_id: context.parent_run_id().map(str::to_owned),
            parent_node: context.parent_node().cloned(),
            depth: context.depth(),
            max_depth: context.max_depth(),
        };
        Self {
            graph,
            run,
            input,
            context,
            config,
            transitions: HashMap::new(),
            instance_inputs: HashMap::new(),
            instance_order: Vec::new(),
        }
    }
    pub(super) async fn execute(mut self) -> Run<S, O> {
        loop {
            let mut ready = self.ready(false);
            if ready.is_empty() {
                let skipped = self.sweep();
                if !skipped.is_empty() {
                    for key in skipped {
                        if let Some(node) = self.run.nodes.get_mut(&key) {
                            node.status = NodeStatus::Skipped;
                        }
                    }
                    continue;
                }
                ready = self.ready(true);
            }
            if ready.is_empty() {
                let complete = self.run.nodes.values().all(|node| {
                    matches!(
                        node.status,
                        NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
                    )
                });
                if complete {
                    self.run.status = RunStatus::Completed;
                    let key = NodeKey::Static(self.graph.return_node.clone());
                    self.run.final_output = self.run.nodes[&key].output.clone().map(|value| {
                        value
                            .downcast::<O>()
                            .expect("return type validated at construction")
                    });
                    if self.run.final_output.is_none() {
                        self.run.status = RunStatus::Failed;
                        self.run.errors.push(RunError::MissingOutput {
                            node: self.graph.return_node.clone(),
                        });
                    }
                } else {
                    self.run.status = RunStatus::Failed;
                    self.run.errors.push(RunError::Stalled);
                }
                break;
            }
            if self.run.waves >= self.config.max_waves {
                self.run.status = RunStatus::Failed;
                self.run.errors.push(RunError::MaxWaves);
                break;
            }
            self.run.waves += 1;
            self.execute_wave(ready).await;
            if self.run.status == RunStatus::Failed {
                break;
            }
        }
        self.run
    }
    async fn execute_wave(&mut self, ready: Vec<NodeKey>) {
        let state = self.run.state.clone();
        let mut tasks = JoinSet::new();
        let mut task_slots = HashMap::<Id, usize>::new();
        let mut results = (0..ready.len()).map(|_| None).collect::<Vec<_>>();
        let mut next = 0;
        while next < ready.len() || !tasks.is_empty() {
            while next < ready.len() && tasks.len() < self.config.max_concurrency.get() {
                let key = ready[next].clone();
                let input = Arc::new(self.assemble_input(&key));
                if let NodeKey::Static(id) = &key {
                    self.transitions.remove(id);
                }
                let node = self
                    .run
                    .nodes
                    .get_mut(&key)
                    .expect("ready node has a run record");
                node.input = Some(input.clone());
                node.status = NodeStatus::Running;
                node.attempts += 1;
                let instance = self.graph.key_node(&key).instance.clone();
                let ctx = crate::NodeContext {
                    state: state.clone(),
                    run: self.context.clone(),
                    key: key.clone(),
                };
                let handle = tasks.spawn(
                    async move {
                        let result = instance.run(&input, ctx).await;
                        (next, result)
                    }
                    .in_current_span()
                    .with_current_subscriber(),
                );
                task_slots.insert(handle.id(), next);
                next += 1;
            }
            if let Some(joined) = tasks.join_next().await {
                match joined {
                    Ok((slot, result)) => {
                        results[slot] = Some(result);
                    }
                    Err(error) => {
                        let slot = task_slots[&error.id()];
                        results[slot] = Some(Err(Error::Node(NodeError::Task(Box::new(error)))));
                    }
                }
            }
        }
        drop(state);

        let mut deltas = Vec::new();
        let mut directives = Vec::new();
        for (key, result) in ready.iter().zip(results) {
            let node = self
                .run
                .nodes
                .get_mut(key)
                .expect("settled node has a run record");
            match result.expect("every task has a settled result") {
                Ok(outcome) => {
                    node.status = NodeStatus::Completed;
                    node.output = outcome.value;
                    deltas.push(outcome.state_delta);
                    if let Some(directive) = outcome.directive {
                        directives.push((key.clone(), directive));
                    }
                }
                Err(error) => {
                    node.status = NodeStatus::Failed;
                    node.output = None;
                    self.run.errors.push(RunError::Node {
                        key: key.clone(),
                        source: error,
                    });
                }
            }
        }

        if let Some(state) = Arc::get_mut(&mut self.run.state) {
            if let Err(error) = state.merge_batch(deltas) {
                self.run.errors.push(RunError::Merge(error));
            }
        } else {
            self.run
                .errors
                .push(RunError::Invariant("state ownership escaped a node"));
        }

        let mut routed_instances = HashSet::new();
        for (writer, directive) in &directives {
            match directive {
                Directive::Transition { target, .. } => {
                    match self.graph.nodes.iter().find(|node| &node.id == target) {
                        Some(node) if !node.template => {}
                        Some(_) => self.run.errors.push(RunError::InvalidDirective {
                            writer: writer.clone(),
                            source: DirectiveError::WrongTargetKind {
                                target: target.clone(),
                            },
                        }),
                        None => self.run.errors.push(RunError::InvalidDirective {
                            writer: writer.clone(),
                            source: DirectiveError::UnknownTarget {
                                target: target.clone(),
                            },
                        }),
                    }
                }
                Directive::Deliver(targets) => {
                    for target in targets {
                        match self
                            .graph
                            .nodes
                            .iter()
                            .find(|node| node.id == target.template)
                        {
                            None => self.run.errors.push(RunError::InvalidDirective {
                                writer: writer.clone(),
                                source: DirectiveError::UnknownTarget {
                                    target: target.template.clone(),
                                },
                            }),
                            Some(node) if !node.template => {
                                self.run.errors.push(RunError::InvalidDirective {
                                    writer: writer.clone(),
                                    source: DirectiveError::WrongTargetKind {
                                        target: target.template.clone(),
                                    },
                                })
                            }
                            Some(_) => {
                                let identity = (target.template.clone(), target.key.clone());
                                let exists = self.run.instances(&target.template).iter().any(|key| {
                                matches!(key, NodeKey::Instance { key, .. } if key == &target.key)
                            });
                                if exists || !routed_instances.insert(identity) {
                                    self.run.errors.push(RunError::InvalidDirective {
                                        writer: writer.clone(),
                                        source: DirectiveError::DuplicateInstanceKey {
                                            template: target.template.clone(),
                                            key: target.key.clone(),
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        if !self.run.errors.is_empty() {
            self.run.status = RunStatus::Failed;
            return;
        }

        for (writer, directive) in directives {
            match directive {
                Directive::Transition {
                    target,
                    payload,
                    immediate,
                } => {
                    let key = NodeKey::Static(target.clone());
                    let node = self
                        .run
                        .nodes
                        .get_mut(&key)
                        .expect("transition target has a run record");
                    node.status = NodeStatus::Pending;
                    node.input = None;
                    node.output = None;
                    self.transitions.insert(
                        target,
                        TransitionPlan {
                            writer,
                            payload,
                            immediate,
                        },
                    );
                }
                Directive::Deliver(targets) => {
                    for target in targets {
                        let key = NodeKey::Instance {
                            template: target.template.clone(),
                            key: target.key,
                        };
                        self.instance_inputs
                            .insert(key.clone(), (writer.clone(), target.payload));
                        self.run.nodes.insert(key.clone(), NodeRun::pending());
                        self.instance_order.push(key.clone());
                        self.run
                            .instances
                            .entry(target.template)
                            .or_default()
                            .push(key);
                    }
                }
            }
        }
    }
    fn ready(&self, empty_fanout: bool) -> Vec<NodeKey> {
        let mut ready = Vec::new();
        for node in &self.graph.nodes {
            if node.template {
                continue;
            }
            let key = NodeKey::Static(node.id.clone());
            if self.run.nodes[&key].status != NodeStatus::Pending {
                continue;
            }
            if self.graph.entries.contains(&node.id)
                || self
                    .transitions
                    .get(&node.id)
                    .is_some_and(|plan| plan.immediate)
            {
                ready.push(key);
                continue;
            }
            let incoming = self
                .graph
                .edges
                .iter()
                .filter(|edge| edge.target == node.id)
                .collect::<Vec<_>>();
            if incoming.is_empty() {
                continue;
            }
            if !incoming
                .iter()
                .all(|edge| self.predecessor_terminal(&edge.source, empty_fanout))
            {
                continue;
            }
            let live = incoming
                .iter()
                .filter(|edge| edge.when.as_ref().is_none_or(|when| when(self.run.state())))
                .collect::<Vec<_>>();
            let done = live
                .iter()
                .filter(|edge| self.predecessor_done(&edge.source, empty_fanout))
                .count();
            if live.is_empty() || done == 0 {
                continue;
            }
            let joined = match &node.join {
                Join::All => done >= live.len(),
                Join::Any => done >= 1,
                Join::Custom(join) => join(done, live.len()),
            };
            if joined {
                ready.push(key);
            }
        }
        for key in &self.instance_order {
            if self.run.nodes[key].status == NodeStatus::Pending {
                ready.push(key.clone());
            }
        }
        ready
    }
    fn sweep(&self) -> Vec<NodeKey> {
        let mut candidates = HashSet::new();
        self.graph
            .nodes
            .iter()
            .filter(|node| {
                let key = NodeKey::Static(node.id.clone());
                if node.template
                    || self.graph.entries.contains(&node.id)
                    || self.run.nodes[&key].status != NodeStatus::Pending
                {
                    return false;
                }
                let incoming = self
                    .graph
                    .edges
                    .iter()
                    .filter(|edge| edge.target == node.id)
                    .collect::<Vec<_>>();
                let skip = !incoming.is_empty()
                    && incoming.iter().all(|edge| {
                        candidates.contains(&edge.source)
                            || self.predecessor_terminal(&edge.source, false)
                    })
                    && !incoming.iter().any(|edge| {
                        edge.when.as_ref().is_none_or(|when| when(self.run.state()))
                            && (candidates.contains(&edge.source)
                                || self.predecessor_done(&edge.source, false))
                    });
                if skip {
                    candidates.insert(node.id.clone());
                }
                skip
            })
            .map(|node| NodeKey::Static(node.id.clone()))
            .collect()
    }
    fn predecessor_terminal(&self, source: &NodeId, empty_fanout: bool) -> bool {
        if self.graph.node(source).template {
            let instances = self.run.instances(source);
            if instances.is_empty() {
                return empty_fanout;
            }
            instances.iter().all(|key| {
                matches!(
                    self.run.nodes[key].status,
                    NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
                )
            })
        } else {
            matches!(
                self.run.nodes[&NodeKey::Static(source.clone())].status,
                NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
            )
        }
    }
    fn predecessor_done(&self, source: &NodeId, empty_fanout: bool) -> bool {
        let key = NodeKey::Static(source.clone());
        if let Some(node) = self.run.nodes.get(&key) {
            return node.status == NodeStatus::Completed;
        }
        let instances = self.run.instances(source);
        if instances.is_empty() {
            empty_fanout
        } else {
            instances
                .iter()
                .all(|key| self.run.nodes[key].status == NodeStatus::Completed)
        }
    }
    fn assemble_input(&self, key: &NodeKey) -> Input {
        let mut input = InputBuilder::new();
        if let Some((writer, payload)) = self.instance_inputs.get(key) {
            input.push(Origin::Node(writer.clone()), payload.clone());
            return input.freeze();
        }
        let NodeKey::Static(target) = key else {
            return input.freeze();
        };
        if let Some(plan) = self.transitions.get(target)
            && let Some(payload) = &plan.payload
        {
            input.push(Origin::Node(plan.writer.clone()), payload.clone());
            return input.freeze();
        }
        if self.graph.entries.contains(target) {
            for value in self.input.entries[target].values() {
                input.push(Origin::Run, value.clone());
            }
        }
        for source in &self.graph.nodes {
            let eligible = self.graph.edges.iter().any(|edge| {
                edge.source == source.id
                    && &edge.target == target
                    && edge.when.as_ref().is_none_or(|when| when(self.run.state()))
            });
            if !eligible {
                continue;
            }
            if source.template {
                for instance in self.run.instances(&source.id) {
                    let node = &self.run.nodes[instance];
                    if node.status == NodeStatus::Completed
                        && let Some(output) = &node.output
                    {
                        input.push(Origin::Node(instance.clone()), output.clone());
                    }
                }
            } else {
                let source_key = NodeKey::Static(source.id.clone());
                let node = &self.run.nodes[&source_key];
                if node.status == NodeStatus::Completed
                    && let Some(output) = &node.output
                {
                    input.push(Origin::Node(source_key), output.clone());
                }
            }
        }
        input.freeze()
    }
}
