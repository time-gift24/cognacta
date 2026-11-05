use std::{
    collections::{HashMap, HashSet},
    num::NonZeroU64,
    sync::Arc,
};

use super::codec::{decode, encode};
use crate::{
    CallSite, ChildCall, ControlFailureKind, Directive, DirectiveError, Error, EventData, Failure,
    FailureCause, FailureKind, FaultKind, Graph, GraphInput, HistoryError,
    HistoryViolation as Invalid, Input, MergeError, MergeFailureKind, NodeAttempt, NodeId, NodeKey,
    NodeRun, NodeStatus, RecordedOutcome, Run, RunError, RunStatus, SharedValue, State,
    TerminalFailure, WaveStage, graph::ErasedOutcome,
};

pub(crate) enum Fact<S: State> {
    Started {
        format: u16,
        input: Arc<GraphInput>,
        caller: Option<CallSite>,
        depth: usize,
        max_depth: usize,
        max_waves: usize,
    },
    Initialized(S),
    NodeStarted {
        wave: usize,
        node: NodeAttempt,
        input: Arc<Input>,
        members: Option<Vec<NodeKey>>,
    },
    NodeCompleted {
        wave: usize,
        node: NodeAttempt,
        outcome: ErasedOutcome<S>,
    },
    NodeFailed {
        wave: usize,
        node: NodeAttempt,
        reason: FailureKind,
    },
    NodeSkipped(NodeKey),
    CallLinked {
        call: ChildCall,
        input: Arc<GraphInput>,
    },
    Fault {
        wave: Option<usize>,
        reason: FaultKind,
    },
    StateDelta {
        wave: usize,
        outcomes: Vec<NodeAttempt>,
    },
    Control {
        wave: usize,
        outcomes: Vec<NodeAttempt>,
    },
    Completed(NodeAttempt),
    Failed(Option<TerminalFailure>),
}

impl<S: State> Fact<S> {
    pub(crate) fn wire(&self) -> Result<EventData, Error> {
        Ok(match self {
            Self::Started {
                format,
                input,
                caller,
                depth,
                max_depth,
                max_waves,
                ..
            } => EventData::RunStarted {
                format: *format,
                input: input.clone(),
                caller: caller.clone(),
                depth: *depth,
                max_depth: *max_depth,
                max_waves: *max_waves,
            },
            Self::Initialized(state) => EventData::RunInitialized {
                state: encode(state)?,
            },
            Self::NodeStarted {
                wave,
                node,
                input,
                members,
            } => EventData::NodeStarted {
                wave: *wave,
                node: node.clone(),
                input: input.clone(),
                members: members.clone(),
            },
            Self::NodeCompleted {
                wave,
                node,
                outcome,
            } => EventData::NodeCompleted {
                wave: *wave,
                node: node.clone(),
                outcome: RecordedOutcome {
                    value: outcome.value.clone(),
                    state_delta: encode(&outcome.state_delta)?,
                    directive: outcome.directive.clone(),
                },
            },
            Self::NodeFailed { wave, node, reason } => EventData::NodeFailed {
                wave: *wave,
                node: node.clone(),
                reason: *reason,
            },
            Self::NodeSkipped(key) => EventData::NodeSkipped { key: key.clone() },
            Self::CallLinked { call, .. } => EventData::CallLinked { call: call.clone() },
            Self::Fault { wave, reason } => EventData::RunFault {
                wave: *wave,
                reason: *reason,
            },
            Self::StateDelta { wave, outcomes } => EventData::StateDelta {
                wave: *wave,
                outcomes: outcomes.clone(),
            },
            Self::Control { wave, outcomes } => EventData::Control {
                wave: *wave,
                outcomes: outcomes.clone(),
            },
            Self::Completed(output) => EventData::RunCompleted {
                output: output.clone(),
            },
            Self::Failed(reason) => EventData::RunFailed {
                reason: reason.clone(),
            },
        })
    }

    pub(crate) fn decode(data: &EventData) -> Result<Self, Error> {
        Ok(match data {
            EventData::RunStarted {
                format,
                input,
                caller,
                depth,
                max_depth,
                max_waves,
            } => Self::Started {
                format: *format,
                input: input.clone(),
                caller: caller.clone(),
                depth: *depth,
                max_depth: *max_depth,
                max_waves: *max_waves,
            },
            EventData::RunInitialized { state } => Self::Initialized(decode(state.clone())?),
            EventData::NodeStarted {
                wave,
                node,
                input,
                members,
            } => Self::NodeStarted {
                wave: *wave,
                node: node.clone(),
                input: input.clone(),
                members: members.clone(),
            },
            EventData::NodeCompleted {
                wave,
                node,
                outcome,
            } => Self::NodeCompleted {
                wave: *wave,
                node: node.clone(),
                outcome: ErasedOutcome {
                    value: outcome.value.clone(),
                    state_delta: decode(outcome.state_delta.clone())?,
                    directive: outcome.directive.clone(),
                },
            },
            EventData::NodeFailed { wave, node, reason } => Self::NodeFailed {
                wave: *wave,
                node: node.clone(),
                reason: *reason,
            },
            EventData::NodeSkipped { key } => Self::NodeSkipped(key.clone()),
            EventData::CallLinked { call } => Self::CallLinked {
                call: call.clone(),
                input: call.input.clone(),
            },
            EventData::RunFault { wave, reason } => Self::Fault {
                wave: *wave,
                reason: *reason,
            },
            EventData::StateDelta { wave, outcomes } => Self::StateDelta {
                wave: *wave,
                outcomes: outcomes.clone(),
            },
            EventData::Control { wave, outcomes } => Self::Control {
                wave: *wave,
                outcomes: outcomes.clone(),
            },
            EventData::RunCompleted { output } => Self::Completed(output.clone()),
            EventData::RunFailed { reason } => Self::Failed(reason.clone()),
        })
    }
}

#[derive(Clone)]
pub(crate) struct Transition {
    pub(crate) writer: NodeKey,
    pub(crate) payload: Option<SharedValue>,
    pub(crate) immediate: bool,
}

pub(crate) struct ResultParts<S: State> {
    pub(crate) node: NodeAttempt,
    delta: Option<S::Delta>,
    directive: Option<Directive>,
}

pub(crate) struct Wave<S: State> {
    pub(crate) number: usize,
    pub(crate) members: Vec<NodeKey>,
    pub(crate) stage: WaveStage,
    pub(crate) baseline: HashMap<NodeKey, NodeRun>,
    pub(crate) transitions: HashMap<NodeId, Transition>,
    results: HashMap<NodeKey, ResultParts<S>>,
}

impl<S: State> Wave<S> {
    pub(crate) fn outcomes(&self, controls_only: bool) -> Vec<NodeAttempt> {
        self.members
            .iter()
            .filter_map(|key| self.results.get(key))
            .filter(|result| !controls_only || result.directive.is_some())
            .map(|result| result.node.clone())
            .collect()
    }
}

struct NodeShape {
    id: NodeId,
    template: bool,
    entry: bool,
}

pub(crate) struct Projection<S: State, O> {
    pub(crate) run_id: String,
    pub(crate) parent_run_id: Option<String>,
    pub(crate) last_seq: u64,
    pub(crate) input: Option<Arc<GraphInput>>,
    pub(crate) caller: Option<CallSite>,
    pub(crate) depth: usize,
    pub(crate) max_depth: usize,
    pub(crate) max_waves: usize,
    pub(crate) run: Option<Run<S, O>>,
    startup_terminal: bool,
    startup_failures: Vec<Failure>,
    nodes: Vec<NodeShape>,
    pub(crate) return_node: NodeId,
    pub(crate) wave: Option<Wave<S>>,
    pub(crate) transitions: HashMap<NodeId, Transition>,
    pub(crate) instance_inputs: HashMap<NodeKey, (NodeKey, SharedValue)>,
    pub(crate) instance_order: Vec<NodeKey>,
    pub(crate) calls: Vec<ChildCall>,
    pub(crate) call_inputs: Vec<Arc<GraphInput>>,
}

impl<S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static> Projection<S, O> {
    pub(crate) fn new<R>(
        graph: &Graph<S, O, R>,
        run_id: String,
        parent_run_id: Option<String>,
    ) -> Self {
        Self {
            run_id,
            parent_run_id,
            last_seq: 0,
            input: None,
            caller: None,
            depth: 0,
            max_depth: 0,
            max_waves: 0,
            run: None,
            startup_terminal: false,
            startup_failures: Vec::new(),
            nodes: graph
                .nodes
                .iter()
                .map(|node| NodeShape {
                    id: node.id.clone(),
                    template: node.template,
                    entry: graph.entries.contains(&node.id),
                })
                .collect(),
            return_node: graph.return_node.clone(),
            wave: None,
            transitions: HashMap::new(),
            instance_inputs: HashMap::new(),
            instance_order: Vec::new(),
            calls: Vec::new(),
            call_inputs: Vec::new(),
        }
    }

    pub(crate) fn failures(&self) -> &[Failure] {
        self.run
            .as_ref()
            .map_or(&self.startup_failures, |run| &run.failures)
    }

    pub(crate) fn terminal(&self) -> bool {
        self.startup_terminal
            || self
                .run
                .as_ref()
                .is_some_and(|run| matches!(run.status(), RunStatus::Completed | RunStatus::Failed))
    }

    fn node(&self, key: &NodeKey) -> Option<&NodeRun> {
        self.run.as_ref()?.node(key)
    }

    pub(crate) fn validate(
        &self,
        seq: u64,
        run_id: &str,
        parent: Option<&str>,
        fact: &Fact<S>,
    ) -> Result<(), Error> {
        let invalid = |reason| Error::from(HistoryError::Invalid { seq, reason });
        if seq != self.last_seq + 1 {
            return Err(invalid(Invalid::Sequence));
        }
        if run_id != self.run_id || parent != self.parent_run_id.as_deref() {
            return Err(invalid(Invalid::Identity));
        }
        if self.terminal() {
            return Err(invalid(Invalid::Terminal));
        }
        if let Fact::Started {
            format,
            input,
            caller,
            depth,
            max_depth,
            ..
        } = fact
        {
            if *format != 2 {
                return Err(HistoryError::UnsupportedFormat { found: *format }.into());
            }
            if seq != 1 {
                return Err(invalid(Invalid::EventOrder));
            }
            if *depth > *max_depth
                || match (parent, caller) {
                    (None, None) => *depth != 0,
                    (Some(_), Some(caller)) => *depth == 0 || caller.key.is_empty(),
                    _ => true,
                }
            {
                return Err(invalid(Invalid::Parent));
            }
            if input
                .entries
                .values()
                .flat_map(|entry| entry.values())
                .any(|entry| entry.origin != crate::Origin::Run)
            {
                return Err(invalid(Invalid::Identity));
            }
            return Ok(());
        }
        if self.input.is_none() {
            return Err(invalid(Invalid::EventOrder));
        }
        match fact {
            Fact::Started { .. } => unreachable!(),
            Fact::Initialized(_) => {
                if self.run.is_some() {
                    return Err(invalid(Invalid::EventOrder));
                }
            }
            Fact::Failed(reason) => {
                if self.wave.is_some() {
                    return Err(invalid(Invalid::Terminal));
                }
                match reason {
                    None if self.failures().is_empty() => return Err(invalid(Invalid::Terminal)),
                    Some(TerminalFailure::Input { .. } | TerminalFailure::Initialization)
                        if self.run.is_some() =>
                    {
                        return Err(invalid(Invalid::Terminal));
                    }
                    Some(
                        TerminalFailure::Stalled
                        | TerminalFailure::MaxWaves { .. }
                        | TerminalFailure::MissingOutput { .. },
                    ) if self.run.is_none() => return Err(invalid(Invalid::Terminal)),
                    Some(TerminalFailure::MaxWaves { limit })
                        if *limit != self.max_waves
                            || self.run.as_ref().is_none_or(|run| run.waves < *limit) =>
                    {
                        return Err(invalid(Invalid::Terminal));
                    }
                    Some(TerminalFailure::MissingOutput { node }) if node != &self.return_node => {
                        return Err(invalid(Invalid::Terminal));
                    }
                    _ => {}
                }
            }
            Fact::NodeStarted {
                wave,
                node,
                members,
                ..
            } => {
                let run = self
                    .run
                    .as_ref()
                    .ok_or_else(|| invalid(Invalid::EventOrder))?;
                let current = self
                    .node(&node.key)
                    .ok_or_else(|| invalid(Invalid::Attempt))?;
                if current.status() != NodeStatus::Pending
                    || node.attempt.get() != current.attempts() + 1
                {
                    return Err(invalid(Invalid::Attempt));
                }
                match (&self.wave, members) {
                    (None, Some(members)) => {
                        if !self.failures().is_empty()
                            || *wave != run.waves + 1
                            || run.waves >= self.max_waves
                            || members.is_empty()
                            || members.iter().collect::<HashSet<_>>().len() != members.len()
                            || !members.contains(&node.key)
                            || members.iter().any(|key| {
                                self.node(key)
                                    .is_none_or(|node| node.status() != NodeStatus::Pending)
                            })
                        {
                            return Err(invalid(Invalid::WaveMembers));
                        }
                    }
                    (Some(active), None)
                        if active.number == *wave
                            && active.stage == WaveStage::Collecting
                            && active.members.contains(&node.key) => {}
                    _ => return Err(invalid(Invalid::WaveMembers)),
                }
            }
            Fact::NodeCompleted { wave, node, .. } | Fact::NodeFailed { wave, node, .. } => {
                let active = self
                    .wave
                    .as_ref()
                    .ok_or_else(|| invalid(Invalid::EventOrder))?;
                if active.number != *wave
                    || active.stage != WaveStage::Collecting
                    || !active.members.contains(&node.key)
                    || self.node(&node.key).is_none_or(|current| {
                        current.status() != NodeStatus::Running
                            || current.attempts() != node.attempt.get()
                    })
                {
                    return Err(invalid(Invalid::Attempt));
                }
            }
            Fact::NodeSkipped(key) => {
                if self.wave.is_some()
                    || !self.failures().is_empty()
                    || self
                        .node(key)
                        .is_none_or(|node| node.status() != NodeStatus::Pending)
                    || !matches!(key, NodeKey::Static(id) if self.nodes.iter().any(|node| &node.id == id && !node.entry && !node.template))
                {
                    return Err(invalid(Invalid::EventOrder));
                }
            }
            Fact::CallLinked { call, input } => {
                if call.caller.key.is_empty()
                    || input
                        .entries
                        .values()
                        .flat_map(|entry| entry.values())
                        .any(|entry| entry.origin != crate::Origin::Run)
                    || self.node(&call.caller.node.key).is_none_or(|node| {
                        node.status() != NodeStatus::Running
                            || node.attempts() != call.caller.node.attempt.get()
                    })
                    || self.calls.iter().any(|old| {
                        old.caller == call.caller || old.child_run_id == call.child_run_id
                    })
                    || call.child_run_id == self.run_id
                {
                    return Err(invalid(Invalid::Parent));
                }
            }
            Fact::Fault { wave, reason } => {
                if self.run.is_none()
                    || *wave != self.wave.as_ref().map(|wave| wave.number)
                    || (*reason == FaultKind::StateOwnership
                        && self
                            .wave
                            .as_ref()
                            .is_none_or(|wave| wave.stage != WaveStage::Collected))
                {
                    return Err(invalid(Invalid::EventOrder));
                }
            }
            Fact::StateDelta { wave, outcomes } | Fact::Control { wave, outcomes } => {
                let control = matches!(fact, Fact::Control { .. });
                let active = self
                    .wave
                    .as_ref()
                    .ok_or_else(|| invalid(Invalid::EventOrder))?;
                if active.number != *wave
                    || if control {
                        !matches!(
                            active.stage,
                            WaveStage::StateApplied | WaveStage::StateRejected
                        )
                    } else {
                        active.stage != WaveStage::Collected
                    }
                {
                    return Err(invalid(if control {
                        Invalid::ControlStage
                    } else {
                        Invalid::StateStage
                    }));
                }
                if active.outcomes(control) != *outcomes {
                    return Err(invalid(Invalid::ResultReference));
                }
            }
            Fact::Completed(output) => {
                let run = self
                    .run
                    .as_ref()
                    .ok_or_else(|| invalid(Invalid::Terminal))?;
                if self.wave.is_some()
                    || !self.failures().is_empty()
                    || run.nodes.values().any(|node| {
                        !matches!(node.status(), NodeStatus::Completed | NodeStatus::Skipped)
                    })
                    || output.key != NodeKey::Static(self.return_node.clone())
                    || self.node(&output.key).is_none_or(|node| {
                        node.attempts() != output.attempt.get() || node.output.is_none()
                    })
                {
                    return Err(invalid(Invalid::Terminal));
                }
            }
        }
        Ok(())
    }

    pub(crate) fn prepare_output(&self, fact: &Fact<S>) -> Result<Option<Arc<O>>, Error> {
        let Fact::Completed(output) = fact else {
            return Ok(None);
        };
        let value = self.run.as_ref().expect("validated run").nodes[&output.key]
            .output
            .as_ref()
            .expect("validated output");
        Ok(Some(Arc::new(decode(value.as_ref().clone())?)))
    }

    pub(crate) fn apply(&mut self, seq: u64, fact: Fact<S>, prepared_output: Option<Arc<O>>) {
        match fact {
            Fact::Started {
                input,
                caller,
                depth,
                max_depth,
                max_waves,
                ..
            } => {
                self.input = Some(input);
                self.caller = caller;
                self.depth = depth;
                self.max_depth = max_depth;
                self.max_waves = max_waves;
            }
            Fact::Initialized(state) => {
                self.run = Some(Run {
                    state: Arc::new(state),
                    status: RunStatus::Running,
                    nodes: self
                        .nodes
                        .iter()
                        .filter(|node| !node.template)
                        .map(|node| (NodeKey::Static(node.id.clone()), NodeRun::pending()))
                        .collect(),
                    instances: HashMap::new(),
                    errors: Vec::new(),
                    failures: Vec::new(),
                    final_output: None,
                    waves: 0,
                    run_id: self.run_id.clone(),
                    parent_run_id: self.parent_run_id.clone(),
                    parent_node: self.caller.as_ref().map(|caller| caller.node.key.clone()),
                    depth: self.depth,
                    max_depth: self.max_depth,
                });
            }
            Fact::NodeStarted {
                wave,
                node,
                input,
                members,
            } => {
                let run = self.run.as_mut().expect("initialized");
                if let Some(members) = members {
                    self.wave = Some(Wave {
                        number: wave,
                        members,
                        stage: WaveStage::Collecting,
                        baseline: run.nodes.clone(),
                        transitions: self.transitions.clone(),
                        results: HashMap::new(),
                    });
                    run.waves = wave;
                }
                run.nodes.get_mut(&node.key).expect("member").start(input);
                if let NodeKey::Static(id) = node.key {
                    self.transitions.remove(&id);
                }
            }
            Fact::NodeCompleted { node, outcome, .. } => {
                self.run
                    .as_mut()
                    .expect("initialized")
                    .nodes
                    .get_mut(&node.key)
                    .expect("member")
                    .complete(outcome.value);
                self.wave.as_mut().expect("wave").results.insert(
                    node.key.clone(),
                    ResultParts {
                        node,
                        delta: Some(outcome.state_delta),
                        directive: outcome.directive,
                    },
                );
                self.collected();
            }
            Fact::NodeFailed { wave, node, reason } => {
                self.run
                    .as_mut()
                    .expect("initialized")
                    .nodes
                    .get_mut(&node.key)
                    .expect("member")
                    .fail();
                self.failure(Some(wave), FailureCause::Node { node, reason });
                self.collected();
            }
            Fact::NodeSkipped(key) => self
                .run
                .as_mut()
                .expect("initialized")
                .nodes
                .get_mut(&key)
                .expect("node")
                .skip(),
            Fact::CallLinked { call, input } => {
                self.calls.push(call);
                self.call_inputs.push(input);
            }
            Fact::Fault { wave, reason } => {
                let abandoned = if let Some(active) = &mut self.wave {
                    if matches!(active.stage, WaveStage::Collecting | WaveStage::Collected) {
                        active.stage = WaveStage::Collected;
                        let run = self.run.as_mut().expect("initialized");
                        active
                            .members
                            .iter()
                            .filter_map(|key| {
                                let node = run.nodes.get_mut(key).expect("member");
                                if node.status() != NodeStatus::Running {
                                    return None;
                                }
                                node.fail();
                                Some(NodeAttempt {
                                    key: key.clone(),
                                    attempt: node.attempts().try_into().expect("started"),
                                })
                            })
                            .collect::<Vec<_>>()
                    } else {
                        Vec::new()
                    }
                } else {
                    Vec::new()
                };
                for node in abandoned {
                    self.failure(wave, FailureCause::Abandoned { node });
                }
                self.failure(wave, FailureCause::Fault(reason));
            }
            Fact::StateDelta { wave, outcomes } => {
                let escaped = self.failures().iter().any(|failure| {
                    failure.wave == Some(wave)
                        && failure.cause == FailureCause::Fault(FaultKind::StateOwnership)
                });
                let active = self.wave.as_mut().expect("wave");
                let deltas = outcomes
                    .into_iter()
                    .map(|node| {
                        active
                            .results
                            .get_mut(&node.key)
                            .expect("result")
                            .delta
                            .take()
                            .expect("unconsumed")
                    })
                    .collect();
                let result = if escaped {
                    None
                } else {
                    Some(
                        Arc::get_mut(&mut self.run.as_mut().expect("initialized").state)
                            .expect("ownership checked before append")
                            .merge_batch(deltas),
                    )
                };
                active.stage = if matches!(&result, Some(Ok(()))) {
                    WaveStage::StateApplied
                } else {
                    WaveStage::StateRejected
                };
                if let Some(Err(error)) = result {
                    let (reason, fields) = match &error {
                        Error::Merge(MergeError::SingleWriterConflicts { fields }) => (
                            MergeFailureKind::SingleWriterConflict,
                            fields.iter().map(|field| (*field).into()).collect(),
                        ),
                        Error::Merge(MergeError::Overflow { field }) => (
                            MergeFailureKind::Overflow,
                            field.iter().map(|field| (*field).into()).collect(),
                        ),
                        Error::Merge(MergeError::Reduce { field, .. }) => (
                            MergeFailureKind::Reduce,
                            field.iter().map(|field| (*field).into()).collect(),
                        ),
                        Error::Merge(MergeError::Finish { field, .. }) => (
                            MergeFailureKind::Finish,
                            field.iter().map(|field| (*field).into()).collect(),
                        ),
                        _ => (MergeFailureKind::Reduce, Vec::new()),
                    };
                    self.failure(Some(wave), FailureCause::Merge { reason, fields });
                    self.run
                        .as_mut()
                        .expect("initialized")
                        .errors
                        .push(RunError::Merge(error));
                }
            }
            Fact::Control { wave, outcomes } => {
                let directives = {
                    let active = self.wave.as_mut().expect("wave");
                    outcomes
                        .into_iter()
                        .map(|node| {
                            let directive = active
                                .results
                                .get_mut(&node.key)
                                .expect("result")
                                .directive
                                .take()
                                .expect("directive");
                            (node, directive)
                        })
                        .collect::<Vec<_>>()
                };
                let mut keys = HashSet::new();
                for (writer, directive) in &directives {
                    let targets: Vec<(&NodeId, Option<&String>)> = match directive {
                        Directive::Transition { target, .. } => vec![(target, None)],
                        Directive::Deliver(targets) => targets
                            .iter()
                            .map(|target| (&target.template, Some(&target.key)))
                            .collect(),
                    };
                    for (target, key) in targets {
                        let reason = match self.nodes.iter().find(|node| &node.id == target) {
                            None => Some(ControlFailureKind::UnknownTarget),
                            Some(node) if node.template != key.is_some() => {
                                Some(ControlFailureKind::WrongTargetKind)
                            }
                            Some(_) => key.and_then(|key| {
                                let instance = NodeKey::Instance {
                                    template: target.clone(),
                                    key: key.clone(),
                                };
                                (self.node(&instance).is_some() || !keys.insert(instance))
                                    .then_some(ControlFailureKind::DuplicateInstanceKey)
                            }),
                        };
                        if let Some(reason) = reason {
                            let source = match reason {
                                ControlFailureKind::UnknownTarget => {
                                    DirectiveError::UnknownTarget {
                                        target: target.clone(),
                                    }
                                }
                                ControlFailureKind::WrongTargetKind => {
                                    DirectiveError::WrongTargetKind {
                                        target: target.clone(),
                                    }
                                }
                                ControlFailureKind::DuplicateInstanceKey => {
                                    DirectiveError::DuplicateInstanceKey {
                                        template: target.clone(),
                                        key: key.expect("delivery").clone(),
                                    }
                                }
                            };
                            self.failure(
                                Some(wave),
                                FailureCause::Control {
                                    writer: writer.clone(),
                                    target: target.clone(),
                                    key: key.cloned(),
                                    reason,
                                },
                            );
                            self.run.as_mut().expect("initialized").errors.push(
                                RunError::InvalidDirective {
                                    writer: writer.key.clone(),
                                    source,
                                },
                            );
                        }
                    }
                }
                if self.failures().is_empty() {
                    let run = self.run.as_mut().expect("initialized");
                    for (writer, directive) in directives {
                        match directive {
                            Directive::Transition {
                                target,
                                payload,
                                immediate,
                            } => {
                                run.nodes
                                    .get_mut(&NodeKey::Static(target.clone()))
                                    .expect("validated target")
                                    .rearm();
                                self.transitions.insert(
                                    target,
                                    Transition {
                                        writer: writer.key,
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
                                        .insert(key.clone(), (writer.key.clone(), target.payload));
                                    self.instance_order.push(key.clone());
                                    run.instances
                                        .entry(target.template)
                                        .or_default()
                                        .push(key.clone());
                                    run.nodes.insert(key, NodeRun::pending());
                                }
                            }
                        }
                    }
                }
                self.sort_diagnostics();
                self.wave = None;
            }
            Fact::Completed(_output) => {
                let run = self.run.as_mut().expect("initialized");
                run.final_output = prepared_output;
                run.status = RunStatus::Completed;
            }
            Fact::Failed(reason) => {
                if let Some(reason) = reason {
                    self.failure(None, FailureCause::Terminal(reason));
                }
                if let Some(run) = &mut self.run {
                    run.status = RunStatus::Failed;
                } else {
                    self.startup_terminal = true;
                }
            }
        }
        self.last_seq = seq;
    }

    fn collected(&mut self) {
        let wave = self.wave.as_mut().expect("wave");
        let run = self.run.as_ref().expect("initialized");
        if wave.members.iter().all(|key| {
            matches!(
                run.nodes[key].status(),
                NodeStatus::Completed | NodeStatus::Failed
            )
        }) {
            wave.stage = WaveStage::Collected;
        }
    }

    fn failure(&mut self, wave: Option<usize>, cause: FailureCause) {
        let failures = self
            .run
            .as_mut()
            .map_or(&mut self.startup_failures, |run| &mut run.failures);
        failures.push(Failure { wave, cause });
        let members = self
            .wave
            .as_ref()
            .map(|wave| wave.members.as_slice())
            .unwrap_or_default();
        failures.sort_by_key(|failure| {
            let (group, key) = match &failure.cause {
                FailureCause::Node { node, .. } | FailureCause::Abandoned { node } => {
                    (0, Some(&node.key))
                }
                FailureCause::Merge { .. } => (1, None),
                FailureCause::Control { writer, .. } => (2, Some(&writer.key)),
                FailureCause::Fault(_) => (3, None),
                FailureCause::Terminal(_) => (4, None),
            };
            (
                failure.wave.unwrap_or(usize::MAX),
                group,
                key.and_then(|key| members.iter().position(|member| member == key))
                    .unwrap_or(usize::MAX),
            )
        });
    }

    pub(crate) fn sort_diagnostics(&mut self) {
        let members = self
            .wave
            .as_ref()
            .map(|wave| wave.members.as_slice())
            .unwrap_or_default();
        if let Some(run) = &mut self.run {
            run.errors.sort_by_key(|error| match error {
                RunError::Node { key, .. } => (
                    0,
                    members
                        .iter()
                        .position(|member| member == key)
                        .unwrap_or(usize::MAX),
                ),
                RunError::Merge(_) => (1, 0),
                RunError::InvalidDirective { .. } => (2, 0),
                _ => (3, 0),
            });
        }
    }
}

/// A read-only projection of any valid nonempty history prefix, including initialization.
pub struct ReplayedRun<S: State, O> {
    pub(crate) projection: Projection<S, O>,
}

impl<S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static> ReplayedRun<S, O> {
    pub fn run_id(&self) -> &str {
        &self.projection.run_id
    }
    pub fn parent_run_id(&self) -> Option<&str> {
        self.projection.parent_run_id.as_deref()
    }
    pub fn caller(&self) -> Option<&CallSite> {
        self.projection.caller.as_ref()
    }
    pub fn last_seq(&self) -> NonZeroU64 {
        self.projection
            .last_seq
            .try_into()
            .expect("nonempty prefix")
    }
    pub fn input(&self) -> &GraphInput {
        self.projection.input.as_deref().expect("started")
    }
    pub fn run(&self) -> Option<&Run<S, O>> {
        self.projection.run.as_ref()
    }
    pub fn into_run(self) -> Option<Run<S, O>> {
        self.projection.run
    }
    pub fn failures(&self) -> &[Failure] {
        self.projection.failures()
    }
    pub fn is_terminal(&self) -> bool {
        self.projection.terminal()
    }
    pub fn wave(&self) -> Option<(usize, WaveStage)> {
        self.projection
            .wave
            .as_ref()
            .map(|wave| (wave.number, wave.stage))
    }
    pub fn members(&self) -> &[NodeKey] {
        self.projection
            .wave
            .as_ref()
            .map_or(&[], |wave| &wave.members)
    }
    pub fn calls(&self) -> &[ChildCall] {
        &self.projection.calls
    }
}
