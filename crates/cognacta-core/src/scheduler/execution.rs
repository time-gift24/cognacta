use super::{Execution, ExecutionFuture, Scheduler};
use crate::{
    Edge, Error, FailureKind, FaultKind, Graph, Input, Join, NodeAttempt, NodeError, NodeId,
    NodeKey, NodeRun, NodeStatus, Origin, Run, RunContext, RunError, State, TerminalFailure,
    WaveStage,
    history::{
        projection::{Fact, Projection, Transition},
        session::{NodeCalls, Session},
    },
    input::InputBuilder,
};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
    time::SystemTime,
};
use tracing::{Instrument, instrument::WithSubscriber};

#[derive(Debug, thiserror::Error)]
#[error("{0}")]
struct ProtocolError(&'static str);
fn protocol_error(message: &'static str) -> Error {
    Error::scheduling(ProtocolError(message))
}

struct NodePolicy {
    id: NodeId,
    template: bool,
    join: Join,
}
struct Scheduling<S: State> {
    nodes: Vec<NodePolicy>,
    edges: Vec<Edge<S>>,
    entries: HashSet<NodeId>,
}
struct Slot {
    key: NodeKey,
    dispatched: bool,
    reported: bool,
}

pub(super) struct RunExecution<'a, S: State, O, R> {
    graph: &'a Graph<S, O, R>,
    plan: Arc<Scheduling<S>>,
    context: RunContext<R>,
    scheduler: Arc<dyn Scheduler>,
    session: Session<S, O>,
    slots: Vec<Slot>,
    finished: bool,
    stop: Option<TerminalFailure>,
}

impl<'a, S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static, R: Send + Sync + 'static>
    RunExecution<'a, S, O, R>
{
    pub(super) fn new(
        graph: &'a Graph<S, O, R>,
        context: RunContext<R>,
        scheduler: Arc<dyn Scheduler>,
        session: Session<S, O>,
    ) -> Self {
        let plan = Scheduling {
            nodes: graph
                .nodes
                .iter()
                .map(|node| NodePolicy {
                    id: node.id.clone(),
                    template: node.template,
                    join: node.join.clone(),
                })
                .collect(),
            edges: graph
                .edges
                .iter()
                .map(|edge| Edge {
                    source: edge.source.clone(),
                    target: edge.target.clone(),
                    when: edge.when.clone(),
                })
                .collect(),
            entries: graph.entries.clone(),
        };
        Self {
            graph,
            plan: Arc::new(plan),
            context,
            scheduler,
            session,
            slots: Vec::new(),
            finished: false,
            stop: None,
        }
    }

    async fn settle(&self) -> Result<(), Error> {
        let mut projection = self.session.projection.lock().await;
        let Some(active) = &projection.wave else {
            return Ok(());
        };
        let number = active.number;
        if active.stage == WaveStage::Collected {
            if Arc::strong_count(&projection.run.as_ref().expect("initialized").state) != 1 {
                self.session
                    .commit_locked(
                        &mut projection,
                        Fact::Fault {
                            wave: Some(number),
                            reason: FaultKind::StateOwnership,
                        },
                        Some(RunError::Invariant("state ownership escaped a node")),
                        SystemTime::now(),
                    )
                    .await?;
            }
            let outcomes = projection.wave.as_ref().expect("wave").outcomes(false);
            self.session
                .commit_locked(
                    &mut projection,
                    Fact::StateDelta {
                        wave: number,
                        outcomes,
                    },
                    None,
                    SystemTime::now(),
                )
                .await?;
        }
        if projection.wave.as_ref().is_some_and(|wave| {
            matches!(
                wave.stage,
                WaveStage::StateApplied | WaveStage::StateRejected
            )
        }) {
            let outcomes = projection.wave.as_ref().expect("wave").outcomes(true);
            self.session
                .commit_locked(
                    &mut projection,
                    Fact::Control {
                        wave: number,
                        outcomes,
                    },
                    None,
                    SystemTime::now(),
                )
                .await?;
        }
        Ok(())
    }

    pub(super) async fn finish(self, result: Result<(), Error>) -> Result<Run<S, O>, Error> {
        self.session.gate.check()?;
        let failure = match result {
            Err(error @ (Error::EventLog(_) | Error::History(_))) => {
                return Err(self.session.gate.fail(error));
            }
            Err(error) => Some((FaultKind::Driver, error)),
            Ok(()) if !self.finished => Some((
                FaultKind::Protocol,
                protocol_error("drive returned before advance reached the end"),
            )),
            Ok(()) => None,
        };
        if let Some((reason, source)) = failure {
            let mut projection = self.session.projection.lock().await;
            let wave = projection.wave.as_ref().map(|wave| wave.number);
            self.session
                .commit_locked(
                    &mut projection,
                    Fact::Fault { wave, reason },
                    Some(RunError::Scheduling { source }),
                    SystemTime::now(),
                )
                .await?;
        }
        self.settle().await?;
        let mut projection = self.session.projection.lock().await;
        if !projection.terminal() {
            let run = projection.run.as_ref().expect("initialized");
            let (fact, diagnostic) =
                if !run.failures().is_empty() {
                    (Fact::Failed(None), None)
                } else if let Some(reason) = self.stop {
                    (Fact::Failed(Some(reason)), Some(RunError::MaxWaves))
                } else if run.nodes.values().any(|node| {
                    !matches!(node.status(), NodeStatus::Completed | NodeStatus::Skipped)
                }) {
                    (
                        Fact::Failed(Some(TerminalFailure::Stalled)),
                        Some(RunError::Stalled),
                    )
                } else {
                    let key = NodeKey::Static(self.graph.return_node.clone());
                    let node = &run.nodes[&key];
                    if node.output.is_none() {
                        (
                            Fact::Failed(Some(TerminalFailure::MissingOutput {
                                node: self.graph.return_node.clone(),
                            })),
                            Some(RunError::MissingOutput {
                                node: self.graph.return_node.clone(),
                            }),
                        )
                    } else {
                        (
                            Fact::Completed(NodeAttempt {
                                key,
                                attempt: node.attempts().try_into().expect("completed"),
                            }),
                            None,
                        )
                    }
                };
            self.session
                .commit_locked(&mut projection, fact, diagnostic, SystemTime::now())
                .await?;
        }
        Ok(projection.run.take().expect("initialized"))
    }
}

impl<S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static, R: Send + Sync + 'static>
    Execution for RunExecution<'_, S, O, R>
{
    fn advance(&mut self) -> ExecutionFuture<'_, Option<Vec<NodeKey>>> {
        Box::pin(async move {
            self.session.gate.check()?;
            if self.slots.iter().any(|slot| !slot.reported) {
                return Err(protocol_error("advance called before task reports"));
            }
            self.settle().await?;
            let mut projection = self.session.projection.lock().await;
            if self.finished
                || projection.terminal()
                || (projection.wave.is_none() && !projection.failures().is_empty())
            {
                self.finished = true;
                return Ok(None);
            }
            let ready = if let Some(wave) = &projection.wave {
                wave.members
                    .iter()
                    .filter(|key| {
                        matches!(
                            projection.run.as_ref().expect("initialized").nodes[*key].status(),
                            NodeStatus::Pending | NodeStatus::Running
                        )
                    })
                    .cloned()
                    .collect()
            } else {
                loop {
                    let (ready, skipped) = {
                        let query = Query {
                            graph: &self.plan,
                            projection: &projection,
                        };
                        let mut ready = query.ready(false);
                        let skipped = if ready.is_empty() {
                            query.sweep()
                        } else {
                            Vec::new()
                        };
                        if ready.is_empty() && skipped.is_empty() {
                            ready = query.ready(true);
                        }
                        (ready, skipped)
                    };
                    if !skipped.is_empty() {
                        for key in skipped {
                            self.session
                                .commit_locked(
                                    &mut projection,
                                    Fact::NodeSkipped(key),
                                    None,
                                    SystemTime::now(),
                                )
                                .await?;
                        }
                        continue;
                    }
                    if ready.is_empty() {
                        self.finished = true;
                        return Ok(None);
                    }
                    if projection.run.as_ref().expect("initialized").waves >= projection.max_waves {
                        let limit = projection.max_waves;
                        self.stop = Some(TerminalFailure::MaxWaves { limit });
                        self.finished = true;
                        return Ok(None);
                    }
                    break ready;
                }
            };
            self.slots = ready
                .iter()
                .map(|key| Slot {
                    key: key.clone(),
                    dispatched: false,
                    reported: false,
                })
                .collect();
            Ok(Some(ready))
        })
    }

    fn dispatch(&mut self, key: &NodeKey) -> Result<ExecutionFuture<'static, ()>, Error> {
        self.session.gate.check()?;
        let slot = self
            .slots
            .iter_mut()
            .find(|slot| &slot.key == key)
            .ok_or_else(|| protocol_error("dispatch key is not a member"))?;
        if slot.dispatched {
            return Err(protocol_error("member dispatched twice"));
        }
        slot.dispatched = true;
        let members = self
            .slots
            .iter()
            .map(|slot| slot.key.clone())
            .collect::<Vec<_>>();
        let instance = self.graph.key_node(key).instance.clone();
        let key = key.clone();
        let plan = self.plan.clone();
        let mut context = self.context.clone();
        let scheduler = self.scheduler.clone();
        let session = self.session.clone();
        Ok(Box::pin(
            async move {
                let (input, state, attempt, wave) = {
                    let mut projection = session.projection.lock().await;
                    session.gate.check()?;
                    let node = &projection.run.as_ref().expect("initialized").nodes[&key];
                    let input = if node.status() == NodeStatus::Running {
                        node.input.clone().expect("started input")
                    } else {
                        let node = NodeAttempt {
                            key: key.clone(),
                            attempt: (node.attempts() + 1).try_into().expect("new attempt"),
                        };
                        let input = Arc::new(
                            Query {
                                graph: &plan,
                                projection: &projection,
                            }
                            .assemble_input(&key),
                        );
                        let wave = projection.wave.as_ref().map_or(
                            projection.run.as_ref().expect("initialized").waves + 1,
                            |wave| wave.number,
                        );
                        let members = projection.wave.is_none().then_some(members);
                        session
                            .commit_locked(
                                &mut projection,
                                Fact::NodeStarted {
                                    wave,
                                    node,
                                    input: input.clone(),
                                    members,
                                },
                                None,
                                SystemTime::now(),
                            )
                            .await?;
                        input
                    };
                    let run = projection.run.as_ref().expect("initialized");
                    let attempt = NodeAttempt {
                        key: key.clone(),
                        attempt: run.nodes[&key].attempts().try_into().expect("started"),
                    };
                    (input, run.state.clone(), attempt, run.waves)
                };
                context.node_calls =
                    Some(Arc::new(NodeCalls::new(session.clone(), attempt.clone())));
                let ctx = crate::NodeContext {
                    state,
                    run: context,
                    key: key.clone(),
                };
                let result = instance.run(&input, ctx, scheduler).await;
                let ts = SystemTime::now();
                match result {
                    Ok(outcome) => {
                        session
                            .commit(
                                Fact::NodeCompleted {
                                    wave,
                                    node: attempt,
                                    outcome,
                                },
                                None,
                                ts,
                            )
                            .await
                    }
                    Err(error @ (Error::EventLog(_) | Error::History(_))) => {
                        Err(session.gate.fail(error))
                    }
                    Err(source) => {
                        let reason = FailureKind::node(&source);
                        session
                            .commit(
                                Fact::NodeFailed {
                                    wave,
                                    node: attempt,
                                    reason,
                                },
                                Some(RunError::Node { key, source }),
                                ts,
                            )
                            .await
                    }
                }
            }
            .in_current_span()
            .with_current_subscriber(),
        ))
    }

    fn complete(&mut self, key: NodeKey, result: Result<(), Error>) -> ExecutionFuture<'_, ()> {
        Box::pin(async move {
            self.session.gate.check()?;
            let slot = self
                .slots
                .iter_mut()
                .find(|slot| slot.key == key)
                .ok_or_else(|| protocol_error("complete key is not a member"))?;
            if !slot.dispatched || slot.reported {
                return Err(protocol_error("complete requires one unreported dispatch"));
            }
            let mut projection = self.session.projection.lock().await;
            let node = &projection.run.as_ref().expect("initialized").nodes[&key];
            let reported = match result {
                Err(error @ (Error::EventLog(_) | Error::History(_))) => {
                    Err(self.session.gate.fail(error))
                }
                Err(error @ Error::Scheduling { .. }) => Err(error),
                Err(source @ Error::Node(NodeError::Task(_)))
                    if node.status() == NodeStatus::Running =>
                {
                    let attempt = NodeAttempt {
                        key: key.clone(),
                        attempt: node.attempts().try_into().expect("started"),
                    };
                    let wave = projection.wave.as_ref().expect("wave").number;
                    self.session
                        .commit_locked(
                            &mut projection,
                            Fact::NodeFailed {
                                wave,
                                node: attempt,
                                reason: FailureKind::Task,
                            },
                            Some(RunError::Node { key, source }),
                            SystemTime::now(),
                        )
                        .await
                }
                Ok(()) if matches!(node.status(), NodeStatus::Completed | NodeStatus::Failed) => {
                    Ok(())
                }
                _ => Err(protocol_error("task report has no corresponding result")),
            };
            if reported.is_ok() {
                slot.reported = true;
            }
            reported
        })
    }
}

struct Query<'a, S: State, O> {
    graph: &'a Scheduling<S>,
    projection: &'a Projection<S, O>,
}
impl<S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static> Query<'_, S, O> {
    fn nodes(&self) -> &HashMap<NodeKey, NodeRun> {
        self.projection.wave.as_ref().map_or(
            &self.projection.run.as_ref().expect("initialized").nodes,
            |wave| &wave.baseline,
        )
    }
    fn transitions(&self) -> &HashMap<NodeId, Transition> {
        self.projection
            .wave
            .as_ref()
            .map_or(&self.projection.transitions, |wave| &wave.transitions)
    }
    fn ready(&self, empty_fanout: bool) -> Vec<NodeKey> {
        let mut ready = Vec::new();
        for node in &self.graph.nodes {
            if node.template {
                continue;
            }
            let key = NodeKey::Static(node.id.clone());
            if self.projection.run.as_ref().expect("initialized").nodes[&key].status()
                != NodeStatus::Pending
            {
                continue;
            }
            if self.graph.entries.contains(&node.id)
                || self
                    .transitions()
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
                .filter(|edge| {
                    edge.when.as_ref().is_none_or(|when| {
                        when(self.projection.run.as_ref().expect("initialized").state())
                    })
                })
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
        for key in &self.projection.instance_order {
            if self.projection.run.as_ref().expect("initialized").nodes[key].status()
                == NodeStatus::Pending
            {
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
                    || self.projection.run.as_ref().expect("initialized").nodes[&key].status()
                        != NodeStatus::Pending
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
                        edge.when.as_ref().is_none_or(|when| {
                            when(self.projection.run.as_ref().expect("initialized").state())
                        }) && (candidates.contains(&edge.source)
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
        if self
            .graph
            .nodes
            .iter()
            .find(|node| &node.id == source)
            .expect("source")
            .template
        {
            let instances = self
                .projection
                .run
                .as_ref()
                .expect("initialized")
                .instances(source);
            if instances.is_empty() {
                return empty_fanout;
            }
            instances.iter().all(|key| {
                matches!(
                    self.projection.run.as_ref().expect("initialized").nodes[key].status(),
                    NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
                )
            })
        } else {
            matches!(
                self.projection.run.as_ref().expect("initialized").nodes
                    [&NodeKey::Static(source.clone())]
                    .status(),
                NodeStatus::Completed | NodeStatus::Skipped | NodeStatus::Failed
            )
        }
    }
    fn predecessor_done(&self, source: &NodeId, empty_fanout: bool) -> bool {
        let key = NodeKey::Static(source.clone());
        if let Some(node) = self
            .projection
            .run
            .as_ref()
            .expect("initialized")
            .nodes
            .get(&key)
        {
            return node.status() == NodeStatus::Completed;
        }
        let instances = self
            .projection
            .run
            .as_ref()
            .expect("initialized")
            .instances(source);
        if instances.is_empty() {
            empty_fanout
        } else {
            instances.iter().all(|key| {
                self.projection.run.as_ref().expect("initialized").nodes[key].status()
                    == NodeStatus::Completed
            })
        }
    }
    fn assemble_input(&self, key: &NodeKey) -> Input {
        let mut input = InputBuilder::new();
        if let Some((writer, payload)) = self.projection.instance_inputs.get(key) {
            input.push(Origin::Node(writer.clone()), payload.clone());
            return input.freeze();
        }
        let NodeKey::Static(target) = key else {
            return input.freeze();
        };
        if let Some(plan) = self.transitions().get(target)
            && let Some(payload) = &plan.payload
        {
            input.push(Origin::Node(plan.writer.clone()), payload.clone());
            return input.freeze();
        }
        if self.graph.entries.contains(target) {
            for entry in self.projection.input.as_ref().expect("started").entries[target].values() {
                input.push(Origin::Run, entry.value.clone());
            }
        }
        for source in &self.graph.nodes {
            let eligible = self.graph.edges.iter().any(|edge| {
                edge.source == source.id
                    && &edge.target == target
                    && edge.when.as_ref().is_none_or(|when| {
                        when(self.projection.run.as_ref().expect("initialized").state())
                    })
            });
            if !eligible {
                continue;
            }
            if source.template {
                for instance in self
                    .projection
                    .run
                    .as_ref()
                    .expect("initialized")
                    .instances(&source.id)
                {
                    let node = &self.nodes()[instance];
                    if node.status() == NodeStatus::Completed
                        && let Some(output) = &node.output
                    {
                        input.push(Origin::Node(instance.clone()), output.clone());
                    }
                }
            } else {
                let source_key = NodeKey::Static(source.id.clone());
                let node = &self.nodes()[&source_key];
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
