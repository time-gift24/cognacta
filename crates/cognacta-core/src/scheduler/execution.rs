use super::{Execution, Scheduler, SchedulerConfig};
use crate::{
    Directive, DirectiveError, Error, Graph, GraphInput, Input, Join, NodeId, NodeKey, NodeRun,
    NodeStatus, Origin, Run, RunContext, RunError, SharedValue, State, graph::ErasedOutcome,
    input::InputBuilder,
};
use std::{
    collections::{HashMap, HashSet},
    future::Future,
    pin::Pin,
    sync::{Arc, Mutex},
};
use tracing::{Instrument, instrument::WithSubscriber};

#[derive(Debug, thiserror::Error)]
#[error("{0}")]
struct ProtocolError(&'static str);

fn protocol_error(message: &'static str) -> Error {
    Error::scheduling(ProtocolError(message))
}

struct TransitionPlan {
    writer: NodeKey,
    payload: Option<SharedValue>,
    immediate: bool,
}

struct Slot<S: State> {
    key: NodeKey,
    output: Arc<Mutex<Option<ErasedOutcome<S>>>>,
    result: Option<Result<ErasedOutcome<S>, Error>>,
}

pub(super) struct RunExecution<'a, S: State, O, R> {
    graph: &'a Graph<S, O, R>,
    run: Run<S, O>,
    input: Arc<GraphInput>,
    context: RunContext<R>,
    scheduler: Arc<dyn Scheduler>,
    config: SchedulerConfig,
    wave: Vec<Slot<S>>,
    finished: bool,
    transitions: HashMap<NodeId, TransitionPlan>,
    instance_inputs: HashMap<NodeKey, (NodeKey, SharedValue)>,
    instance_order: Vec<NodeKey>,
}

impl<'a, S: State, O: Send + Sync + 'static, R: Send + Sync + 'static> RunExecution<'a, S, O, R> {
    pub(super) fn new(
        graph: &'a Graph<S, O, R>,
        input: Arc<GraphInput>,
        context: RunContext<R>,
        scheduler: Arc<dyn Scheduler>,
        state: S,
    ) -> Self {
        Self {
            graph,
            run: Run::new(graph, &context, state),
            input,
            context,
            config: scheduler.config(),
            scheduler,
            wave: Vec::new(),
            finished: false,
            transitions: HashMap::new(),
            instance_inputs: HashMap::new(),
            instance_order: Vec::new(),
        }
    }

    pub(super) fn finish(mut self, result: Result<(), Error>) -> Run<S, O> {
        let failure = result.err().or_else(|| {
            (!self.finished)
                .then(|| protocol_error("drive returned before advance reached the end"))
        });
        self.settle_wave(failure.is_some());
        if let Some(source) = failure {
            self.run.errors.push(RunError::Scheduling { source });
        }
        self.run.finish(&self.graph.return_node);
        self.run
    }

    fn settle_wave(&mut self, prevent_routing: bool) {
        if self.wave.is_empty() {
            return;
        }
        let mut deltas = Vec::new();
        let mut directives = Vec::new();
        for slot in std::mem::take(&mut self.wave) {
            let key = &slot.key;
            let result = slot.result;
            let node = self
                .run
                .nodes
                .get_mut(key)
                .expect("settled node has a run record");
            let Some(result) = result else {
                if node.status() == NodeStatus::Running {
                    node.fail();
                }
                continue;
            };
            match result {
                Ok(outcome) => {
                    node.complete(outcome.value);
                    deltas.push(outcome.state_delta);
                    if let Some(directive) = outcome.directive {
                        directives.push((key.clone(), directive));
                    }
                }
                Err(error) => {
                    node.fail();
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
        if prevent_routing || !self.run.errors.is_empty() {
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
                    node.rearm();
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
            if self.run.nodes[&key].status() != NodeStatus::Pending {
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
            if self.run.nodes[key].status() == NodeStatus::Pending {
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
                    || self.run.nodes[&key].status() != NodeStatus::Pending
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
                    self.run.nodes[key].status(),
                    NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
                )
            })
        } else {
            matches!(
                self.run.nodes[&NodeKey::Static(source.clone())].status(),
                NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
            )
        }
    }
    fn predecessor_done(&self, source: &NodeId, empty_fanout: bool) -> bool {
        let key = NodeKey::Static(source.clone());
        if let Some(node) = self.run.nodes.get(&key) {
            return node.status() == NodeStatus::Completed;
        }
        let instances = self.run.instances(source);
        if instances.is_empty() {
            empty_fanout
        } else {
            instances
                .iter()
                .all(|key| self.run.nodes[key].status() == NodeStatus::Completed)
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
                    if node.status() == NodeStatus::Completed
                        && let Some(output) = &node.output
                    {
                        input.push(Origin::Node(instance.clone()), output.clone());
                    }
                }
            } else {
                let source_key = NodeKey::Static(source.id.clone());
                let node = &self.run.nodes[&source_key];
                if node.status() == NodeStatus::Completed
                    && let Some(output) = &node.output
                {
                    input.push(Origin::Node(source_key), output.clone());
                }
            }
        }
        input.freeze()
    }
}

impl<S: State, O: Send + Sync + 'static, R: Send + Sync + 'static> Execution
    for RunExecution<'_, S, O, R>
{
    fn advance(&mut self) -> Result<Option<Vec<NodeKey>>, Error> {
        if self.wave.iter().any(|slot| slot.result.is_none()) {
            return Err(protocol_error("advance called before the wave completed"));
        }
        self.settle_wave(false);
        if self.finished || !self.run.errors.is_empty() {
            self.finished = true;
            return Ok(None);
        }
        loop {
            let mut ready = self.ready(false);
            if ready.is_empty() {
                let skipped = self.sweep();
                if !skipped.is_empty() {
                    for key in skipped {
                        self.run
                            .nodes
                            .get_mut(&key)
                            .expect("sweep candidate exists")
                            .skip();
                    }
                    continue;
                }
                ready = self.ready(true);
            }
            if ready.is_empty() {
                self.finished = true;
                return Ok(None);
            }
            if self.run.waves >= self.config.max_waves() {
                self.run.errors.push(RunError::MaxWaves);
                self.finished = true;
                return Ok(None);
            }
            self.run.waves += 1;
            self.wave = ready
                .iter()
                .map(|key| Slot {
                    key: key.clone(),
                    output: Arc::new(Mutex::new(None)),
                    result: None,
                })
                .collect();
            return Ok(Some(ready));
        }
    }

    fn dispatch(
        &mut self,
        key: &NodeKey,
    ) -> Result<Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'static>>, Error> {
        let slot = self
            .wave
            .iter()
            .find(|slot| &slot.key == key)
            .ok_or_else(|| protocol_error("dispatch key is not in the current wave"))?;
        if self.run.nodes[key].status() != NodeStatus::Pending {
            return Err(protocol_error(
                "dispatch called more than once for a wave member",
            ));
        }
        let output = slot.output.clone();
        let input = Arc::new(self.assemble_input(key));
        if let NodeKey::Static(id) = key {
            self.transitions.remove(id);
        }
        self.run
            .nodes
            .get_mut(key)
            .expect("wave member exists")
            .start(input.clone());
        let instance = self.graph.key_node(key).instance.clone();
        let ctx = crate::NodeContext {
            state: self.run.state.clone(),
            run: self.context.clone(),
            key: key.clone(),
        };
        let scheduler = self.scheduler.clone();
        Ok(Box::pin(
            async move {
                let outcome = instance.run(&input, ctx, scheduler).await?;
                *output.lock().expect("outcome slot contains no user code") = Some(outcome);
                Ok(())
            }
            .in_current_span()
            .with_current_subscriber(),
        ))
    }

    fn complete(&mut self, key: NodeKey, result: Result<(), Error>) -> Result<(), Error> {
        let slot = self
            .wave
            .iter_mut()
            .find(|slot| slot.key == key)
            .ok_or_else(|| protocol_error("complete key is not in the current wave"))?;
        if self.run.nodes[&key].status() != NodeStatus::Running || slot.result.is_some() {
            return Err(protocol_error(
                "complete requires one dispatched, unreported task",
            ));
        }
        slot.result = Some(match result {
            Ok(()) => Ok(slot
                .output
                .lock()
                .expect("outcome slot contains no user code")
                .take()
                .ok_or_else(|| protocol_error("complete reported success without an outcome"))?),
            Err(error) => Err(error),
        });
        Ok(())
    }
}
