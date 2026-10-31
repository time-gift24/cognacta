use std::{
    collections::{HashMap, HashSet},
    num::NonZeroUsize,
    sync::Arc,
};

use bon::bon;
use tokio::task::{Id, JoinSet};

use crate::{
    ConfigError, Directive, DirectiveError, Error, Graph, Input, Join, NodeError, NodeId, NodeKey,
    NodeRun, NodeStatus, Origin, Run, RunError, RunOutput, RunStatus, SharedValue, State,
    input::InputBuilder,
};

#[derive(Clone, Copy, Debug)]
pub struct SchedulerConfig {
    max_concurrency: NonZeroUsize,
    max_waves: usize,
}

#[bon]
impl SchedulerConfig {
    #[builder(
        start_fn = builder,
        finish_fn = build,
        builder_type = SchedulerConfigBuilder,
        state_mod(vis = "pub")
    )]
    pub fn new(max_concurrency: usize, max_waves: usize) -> Result<Self, Error> {
        let max_concurrency =
            NonZeroUsize::new(max_concurrency).ok_or(ConfigError::ZeroConcurrency)?;
        Ok(Self {
            max_concurrency,
            max_waves,
        })
    }

    pub fn max_concurrency(&self) -> NonZeroUsize {
        self.max_concurrency
    }

    pub fn max_waves(&self) -> usize {
        self.max_waves
    }
}

pub struct Scheduler {
    config: SchedulerConfig,
}

struct TransitionPlan {
    writer: NodeKey,
    payload: Option<SharedValue>,
    immediate: bool,
}

#[bon]
impl Scheduler {
    pub fn new(config: SchedulerConfig) -> Self {
        Self { config }
    }

    #[builder(
        start_fn = run_builder,
        finish_fn = call,
        builder_type = SchedulerRunBuilder,
        state_mod(vis = "pub")
    )]
    pub async fn run<S: State>(
        &self,
        graph: &Graph<S>,
        run_id: String,
        initial_state: S,
        entry_values: Vec<SharedValue>,
    ) -> Run<S> {
        let mut nodes = graph
            .nodes
            .iter()
            .filter(|node| !node.template)
            .map(|node| (NodeKey::Static(node.id.clone()), NodeRun::pending()))
            .collect::<HashMap<_, _>>();
        let mut run = Run {
            state: Arc::new(initial_state),
            status: RunStatus::Running,
            nodes: HashMap::new(),
            instances: HashMap::new(),
            errors: Vec::new(),
            final_output: None,
            waves: 0,
        };
        std::mem::swap(&mut run.nodes, &mut nodes);
        let mut transitions = HashMap::<NodeId, TransitionPlan>::new();
        let mut instance_inputs = HashMap::<NodeKey, (NodeKey, SharedValue)>::new();

        loop {
            let mut ready = ready(graph, &run, &transitions, false);
            if ready.is_empty() {
                let skipped = sweep(graph, &run);
                if !skipped.is_empty() {
                    for key in skipped {
                        if let Some(node) = run.nodes.get_mut(&key) {
                            node.status = NodeStatus::Skipped;
                        }
                    }
                    continue;
                }
                ready = self::ready(graph, &run, &transitions, true);
            }
            if ready.is_empty() {
                let complete = run.nodes.values().all(|node| {
                    matches!(
                        node.status,
                        NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
                    )
                });
                if complete {
                    run.status = RunStatus::Completed;
                    run.final_output = Some(final_output(graph, &run));
                } else {
                    run.status = RunStatus::Failed;
                    run.errors.push(RunError::Stalled);
                }
                break;
            }
            if run.waves >= self.config.max_waves {
                run.status = RunStatus::Failed;
                run.errors.push(RunError::MaxWaves);
                break;
            }
            run.waves += 1;
            execute_wave(
                graph,
                &run_id,
                &entry_values,
                run.state.clone(),
                &mut run,
                ready,
                &mut transitions,
                &mut instance_inputs,
                self.config.max_concurrency,
            )
            .await;
            if run.status == RunStatus::Failed {
                break;
            }
        }
        run
    }
}

#[allow(clippy::too_many_arguments)]
async fn execute_wave<S: State>(
    graph: &Graph<S>,
    run_id: &str,
    entry_values: &[SharedValue],
    state: Arc<S>,
    run: &mut Run<S>,
    ready: Vec<NodeKey>,
    transitions: &mut HashMap<NodeId, TransitionPlan>,
    instance_inputs: &mut HashMap<NodeKey, (NodeKey, SharedValue)>,
    max_concurrency: NonZeroUsize,
) {
    let mut tasks = JoinSet::new();
    let mut task_slots = HashMap::<Id, usize>::new();
    let mut results = (0..ready.len()).map(|_| None).collect::<Vec<_>>();
    let mut next = 0;
    while next < ready.len() || !tasks.is_empty() {
        while next < ready.len() && tasks.len() < max_concurrency.get() {
            let key = ready[next].clone();
            let input = Arc::new(assemble_input(
                graph,
                &key,
                run,
                entry_values,
                transitions,
                instance_inputs,
            ));
            if let NodeKey::Static(id) = &key {
                transitions.remove(id);
            }
            let node = run
                .nodes
                .get_mut(&key)
                .expect("ready node has a run record");
            node.input = Some(input.clone());
            node.status = NodeStatus::Running;
            node.attempts += 1;
            let instance = graph.key_node(&key).instance.clone();
            let ctx = crate::NodeContext {
                state: state.clone(),
                run_id: run_id.to_owned(),
                key: key.clone(),
            };
            let handle = tasks.spawn(async move {
                let result = instance.run(&input, ctx).await;
                (next, result)
            });
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
        let node = run
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
                run.errors.push(RunError::Node {
                    key: key.clone(),
                    source: error,
                });
            }
        }
    }

    if let Some(state) = Arc::get_mut(&mut run.state) {
        if let Err(error) = state.merge_batch(deltas) {
            run.errors.push(RunError::Merge(error));
        }
    } else {
        run.errors
            .push(RunError::Invariant("state ownership escaped a node"));
    }

    let mut routed_instances = HashSet::new();
    for (writer, directive) in &directives {
        match directive {
            Directive::Transition { target, .. } => {
                match graph.nodes.iter().find(|node| &node.id == target) {
                    Some(node) if !node.template => {}
                    Some(_) => run.errors.push(RunError::InvalidDirective {
                        writer: writer.clone(),
                        source: DirectiveError::WrongTargetKind {
                            target: target.clone(),
                        },
                    }),
                    None => run.errors.push(RunError::InvalidDirective {
                        writer: writer.clone(),
                        source: DirectiveError::UnknownTarget {
                            target: target.clone(),
                        },
                    }),
                }
            }
            Directive::Deliver(targets) => {
                for target in targets {
                    match graph.nodes.iter().find(|node| node.id == target.template) {
                        None => run.errors.push(RunError::InvalidDirective {
                            writer: writer.clone(),
                            source: DirectiveError::UnknownTarget {
                                target: target.template.clone(),
                            },
                        }),
                        Some(node) if !node.template => {
                            run.errors.push(RunError::InvalidDirective {
                                writer: writer.clone(),
                                source: DirectiveError::WrongTargetKind {
                                    target: target.template.clone(),
                                },
                            })
                        }
                        Some(_) => {
                            let identity = (target.template.clone(), target.key.clone());
                            let exists = run.instances(&target.template).iter().any(|key| {
                                matches!(key, NodeKey::Instance { key, .. } if key == &target.key)
                            });
                            if exists || !routed_instances.insert(identity) {
                                run.errors.push(RunError::InvalidDirective {
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
    if !run.errors.is_empty() {
        run.status = RunStatus::Failed;
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
                let node = run
                    .nodes
                    .get_mut(&key)
                    .expect("transition target has a run record");
                node.status = NodeStatus::Pending;
                node.input = None;
                node.output = None;
                transitions.insert(
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
                    instance_inputs.insert(key.clone(), (writer.clone(), target.payload));
                    run.nodes.insert(key.clone(), NodeRun::pending());
                    run.instances.entry(target.template).or_default().push(key);
                }
            }
        }
    }
}

fn ready<S: State>(
    graph: &Graph<S>,
    run: &Run<S>,
    transitions: &HashMap<NodeId, TransitionPlan>,
    empty_fanout: bool,
) -> Vec<NodeKey> {
    let mut ready = Vec::new();
    for node in &graph.nodes {
        if node.template {
            continue;
        }
        let key = NodeKey::Static(node.id.clone());
        if run.nodes[&key].status != NodeStatus::Pending {
            continue;
        }
        if graph.entries.contains(&node.id)
            || transitions.get(&node.id).is_some_and(|plan| plan.immediate)
        {
            ready.push(key);
            continue;
        }
        let incoming = graph
            .edges
            .iter()
            .filter(|edge| edge.target == node.id)
            .collect::<Vec<_>>();
        if incoming.is_empty() {
            continue;
        }
        if !incoming
            .iter()
            .all(|edge| predecessor_terminal(graph, run, &edge.source, empty_fanout))
        {
            continue;
        }
        let live = incoming
            .iter()
            .filter(|edge| edge.when.as_ref().is_none_or(|when| when(run.state())))
            .collect::<Vec<_>>();
        let done = live
            .iter()
            .filter(|edge| predecessor_done(run, &edge.source, empty_fanout))
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
    for node in graph.nodes.iter().filter(|node| node.template) {
        for key in run.instances(&node.id) {
            if run.nodes[key].status == NodeStatus::Pending {
                ready.push(key.clone());
            }
        }
    }
    ready
}

fn sweep<S: State>(graph: &Graph<S>, run: &Run<S>) -> Vec<NodeKey> {
    graph
        .nodes
        .iter()
        .filter(|node| {
            let key = NodeKey::Static(node.id.clone());
            if node.template
                || graph.entries.contains(&node.id)
                || run.nodes[&key].status != NodeStatus::Pending
            {
                return false;
            }
            let incoming = graph
                .edges
                .iter()
                .filter(|edge| edge.target == node.id)
                .collect::<Vec<_>>();
            !incoming.is_empty()
                && incoming
                    .iter()
                    .all(|edge| predecessor_terminal(graph, run, &edge.source, false))
                && !incoming.iter().any(|edge| {
                    edge.when.as_ref().is_none_or(|when| when(run.state()))
                        && predecessor_done(run, &edge.source, false)
                })
        })
        .map(|node| NodeKey::Static(node.id.clone()))
        .collect()
}

fn predecessor_terminal<S: State>(
    graph: &Graph<S>,
    run: &Run<S>,
    source: &NodeId,
    empty_fanout: bool,
) -> bool {
    if graph.node(source).template {
        let instances = run.instances(source);
        if instances.is_empty() {
            return empty_fanout;
        }
        instances.iter().all(|key| {
            matches!(
                run.nodes[key].status,
                NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
            )
        })
    } else {
        matches!(
            run.nodes[&NodeKey::Static(source.clone())].status,
            NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
        )
    }
}

fn predecessor_done<S: State>(run: &Run<S>, source: &NodeId, empty_fanout: bool) -> bool {
    let key = NodeKey::Static(source.clone());
    if let Some(node) = run.nodes.get(&key) {
        return node.status == NodeStatus::Completed;
    }
    let instances = run.instances(source);
    if instances.is_empty() {
        empty_fanout
    } else {
        instances
            .iter()
            .all(|key| run.nodes[key].status == NodeStatus::Completed)
    }
}

fn assemble_input<S: State>(
    graph: &Graph<S>,
    key: &NodeKey,
    run: &Run<S>,
    entry_values: &[SharedValue],
    transitions: &HashMap<NodeId, TransitionPlan>,
    instance_inputs: &HashMap<NodeKey, (NodeKey, SharedValue)>,
) -> Input {
    let mut input = InputBuilder::new();
    if let Some((writer, payload)) = instance_inputs.get(key) {
        input.push(Origin::Node(writer.clone()), payload.clone());
        return input.freeze();
    }
    let NodeKey::Static(target) = key else {
        return input.freeze();
    };
    if let Some(plan) = transitions.get(target)
        && let Some(payload) = &plan.payload
    {
        input.push(Origin::Node(plan.writer.clone()), payload.clone());
        return input.freeze();
    }
    if graph.entries.contains(target) {
        for value in entry_values {
            input.push(Origin::Run, value.clone());
        }
    }
    for source in &graph.nodes {
        let eligible = graph.edges.iter().any(|edge| {
            edge.source == source.id
                && &edge.target == target
                && edge.when.as_ref().is_none_or(|when| when(run.state()))
        });
        if !eligible {
            continue;
        }
        if source.template {
            for instance in run.instances(&source.id) {
                let node = &run.nodes[instance];
                if node.status == NodeStatus::Completed
                    && let Some(output) = &node.output
                {
                    input.push(Origin::Node(instance.clone()), output.clone());
                }
            }
        } else {
            let source_key = NodeKey::Static(source.id.clone());
            let node = &run.nodes[&source_key];
            if node.status == NodeStatus::Completed
                && let Some(output) = &node.output
            {
                input.push(Origin::Node(source_key), output.clone());
            }
        }
    }
    input.freeze()
}

fn final_output<S: State>(graph: &Graph<S>, run: &Run<S>) -> RunOutput {
    let explicit = graph.nodes.iter().any(|node| node.terminal);
    let values = graph
        .nodes
        .iter()
        .filter(|node| {
            !node.template
                && if explicit {
                    node.terminal
                } else {
                    !graph.edges.iter().any(|edge| edge.source == node.id)
                }
        })
        .filter_map(|node| {
            let key = NodeKey::Static(node.id.clone());
            let node_run = &run.nodes[&key];
            (node_run.status == NodeStatus::Completed)
                .then(|| node_run.output.clone())
                .flatten()
                .map(|output| (node.id.clone(), output))
        })
        .collect();
    RunOutput { values }
}
