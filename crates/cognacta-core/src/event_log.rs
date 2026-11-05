//! Immutable execution facts and their append/read storage boundary.

use std::{
    collections::HashMap,
    future::Future,
    num::{NonZeroU32, NonZeroU64},
    sync::{Arc, Mutex},
    time::SystemTime,
};

use bon::Builder;
use serde::{Deserialize, Serialize};

use crate::{Directive, Error, GraphInput, Input, JsonValue, NodeId, NodeKey, SharedValue};

/// An immutable fact identified by its caller-assigned `(run_id, seq)` pair.
#[derive(Builder, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[builder(state_mod(vis = "pub"))]
pub struct Event {
    seq: NonZeroU64,
    run_id: String,
    parent_run_id: Option<String>,
    ts: SystemTime,
    data: EventData,
}

impl Event {
    /// Sequence within this logical Run, beginning at one.
    pub fn seq(&self) -> NonZeroU64 {
        self.seq
    }

    pub fn run_id(&self) -> &str {
        &self.run_id
    }

    pub fn parent_run_id(&self) -> Option<&str> {
        self.parent_run_id.as_deref()
    }

    /// Wall-clock time supplied by the producer of this fact.
    pub fn ts(&self) -> SystemTime {
        self.ts
    }

    pub fn data(&self) -> &EventData {
        &self.data
    }

    /// Stable name derived from the data variant, never stored independently.
    pub fn kind(&self) -> &'static str {
        match &self.data {
            EventData::RunStarted { .. } => "run_started",
            EventData::RunInitialized { .. } => "run_initialized",
            EventData::NodeStarted { .. } => "node_started",
            EventData::NodeCompleted { .. } => "node_completed",
            EventData::NodeFailed { .. } => "node_failed",
            EventData::NodeSkipped { .. } => "node_skipped",
            EventData::CallLinked { .. } => "call_linked",
            EventData::RunFault { .. } => "run_fault",
            EventData::StateDelta { .. } => "state_delta",
            EventData::Control { .. } => "control",
            EventData::RunCompleted { .. } => "run_completed",
            EventData::RunFailed { .. } => "run_failed",
        }
    }
}

/// One invocation of a static node or a template instance within a Run.
#[derive(Clone, Debug, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub struct NodeAttempt {
    pub key: NodeKey,
    pub attempt: NonZeroU32,
}

/// A stable child-call key within one logical node attempt.
#[derive(Clone, Debug, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub struct CallSite {
    pub node: NodeAttempt,
    pub key: String,
}

/// The parent records this association before opening the child's history.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct ChildCall {
    pub caller: CallSite,
    pub child_run_id: String,
    pub input: Arc<GraphInput>,
}

/// Successful node result in the recorded JSON representation.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct RecordedOutcome {
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "crate::__private::deserialize_present"
    )]
    pub value: Option<SharedValue>,
    pub state_delta: JsonValue,
    pub directive: Option<Directive>,
}

/// Execution facts with directly readable JSON business values.
#[derive(Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EventData {
    RunStarted {
        format: u16,
        input: Arc<GraphInput>,
        caller: Option<CallSite>,
        depth: usize,
        max_depth: usize,
        max_waves: usize,
    },
    RunInitialized {
        state: JsonValue,
    },
    NodeStarted {
        wave: usize,
        node: NodeAttempt,
        input: Arc<Input>,
        members: Option<Vec<NodeKey>>,
    },
    /// The complete JSON Outcome, before its Delta and routing are committed.
    NodeCompleted {
        wave: usize,
        node: NodeAttempt,
        outcome: RecordedOutcome,
    },
    NodeFailed {
        wave: usize,
        node: NodeAttempt,
        reason: FailureKind,
    },
    NodeSkipped {
        key: NodeKey,
    },
    CallLinked {
        call: ChildCall,
    },
    RunFault {
        wave: Option<usize>,
        reason: FaultKind,
    },
    /// Consume raw Deltas from these successful results in the recorded order.
    StateDelta {
        wave: usize,
        outcomes: Vec<NodeAttempt>,
    },
    /// Interpret raw directives and close the wave, including an empty batch.
    Control {
        wave: usize,
        outcomes: Vec<NodeAttempt>,
    },
    RunCompleted {
        output: NodeAttempt,
    },
    RunFailed {
        reason: Option<TerminalFailure>,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum FaultKind {
    Driver,
    Protocol,
    StateOwnership,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum TerminalFailure {
    Input {
        missing: Vec<NodeId>,
        unexpected: Vec<NodeId>,
    },
    Initialization,
    Stalled,
    MaxWaves {
        limit: usize,
    },
    MissingOutput {
        node: NodeId,
    },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum WaveStage {
    Collecting,
    Collected,
    StateApplied,
    StateRejected,
}

/// Deterministic business failure; original error sources remain diagnostics.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Failure {
    pub wave: Option<usize>,
    pub cause: FailureCause,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum FailureCause {
    Node {
        node: NodeAttempt,
        reason: FailureKind,
    },
    Abandoned {
        node: NodeAttempt,
    },
    Merge {
        reason: MergeFailureKind,
        fields: Vec<String>,
    },
    Control {
        writer: NodeAttempt,
        target: NodeId,
        key: Option<String>,
        reason: ControlFailureKind,
    },
    Fault(FaultKind),
    Terminal(TerminalFailure),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum MergeFailureKind {
    SingleWriterConflict,
    Overflow,
    Reduce,
    Finish,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum ControlFailureKind {
    UnknownTarget,
    WrongTargetKind,
    DuplicateInstanceKey,
}

/// Business failure categories, without arbitrary error text or source chains.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum FailureKind {
    Input,
    Initialization,
    Execution,
    Task,
    DepthExceeded,
    Merge,
    InvalidDirective,
    Scheduling,
    Stalled,
    MaxWaves,
    MissingOutput,
    Invariant,
}

impl FailureKind {
    pub(crate) fn node(error: &Error) -> Self {
        match error {
            Error::Input(_) | Error::Call(crate::CallError::Input { .. }) => Self::Input,
            Error::Call(crate::CallError::Initialization { .. }) => Self::Initialization,
            Error::Call(crate::CallError::DepthExceeded { .. }) => Self::DepthExceeded,
            Error::Call(crate::CallError::MissingOutput) => Self::MissingOutput,
            Error::Node(crate::NodeError::Task(_)) => Self::Task,
            _ => Self::Execution,
        }
    }
}

/// Storage and payload errors, preserving the original source without displaying it.
#[derive(Debug, thiserror::Error)]
pub enum EventLogError {
    #[error("event sequence is not contiguous")]
    Sequence {
        run_id: String,
        expected: u64,
        actual: u64,
    },
    #[error("event append failed")]
    Append {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("event read failed")]
    Read {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("event payload encoding failed")]
    Encode {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
    #[error("event payload decoding failed")]
    Decode {
        #[source]
        source: Box<dyn std::error::Error + Send + Sync + 'static>,
    },
}

#[derive(Clone, Debug, thiserror::Error)]
pub enum HistoryError {
    #[error("run history is empty")]
    Empty,
    #[error("unsupported history format")]
    UnsupportedFormat { found: u16 },
    #[error("invalid execution history")]
    Invalid { seq: u64, reason: HistoryViolation },
    #[error("history is incompatible with graph")]
    IncompatibleGraph { node: NodeId },
    #[error("run is already terminal")]
    TerminalRun { run_id: String },
    #[error("resume requires a root run")]
    NotRoot { run_id: String },
    #[error("child call requires a running node attempt")]
    CallContext,
    #[error("invalid child call key")]
    InvalidCallKey { key: String },
    #[error("duplicate child call in one node entry")]
    DuplicateCall { key: String },
    #[error("child history does not match parent call")]
    CallLinkMismatch { child_run_id: String },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HistoryViolation {
    Sequence,
    Identity,
    Parent,
    EventOrder,
    WaveMembers,
    Attempt,
    ResultReference,
    StateStage,
    ControlStage,
    Terminal,
}

/// Generates a time-ordered UUID v7; history sequence remains the causal order.
pub fn new_run_id() -> String {
    uuid::Uuid::now_v7().to_string()
}

/// Stores complete facts without allocating sequence numbers or interpreting execution.
///
/// The caller serializes writes within each Run and supplies unique, increasing sequences
/// starting at one. Different Runs may share one log concurrently. This trait uses static
/// dispatch; its returned futures are `Send` but it is not a `dyn`-compatible boundary.
pub trait EventLog: Send + Sync {
    /// Appends one complete event without changing its identity or payload.
    ///
    /// # Errors
    /// Returns [`Error::EventLog`] with [`EventLogError::Append`] if storage fails.
    fn append(&self, event: Event) -> impl Future<Output = Result<(), Error>> + Send;

    /// Reads this Run's events with `seq > after_seq`, in sequence order.
    /// Zero reads all history; an unknown Run or exhausted cursor returns an empty Vec.
    ///
    /// # Errors
    /// Returns [`Error::EventLog`] with [`EventLogError::Read`] if storage fails.
    fn events(
        &self,
        run_id: &str,
        after_seq: u64,
    ) -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;

    /// Reads all history, ordered within each Run without a cross-Run ordering promise.
    ///
    /// # Errors
    /// Returns [`Error::EventLog`] with [`EventLogError::Read`] if storage fails.
    fn all_events(&self) -> impl Future<Output = Result<Vec<Arc<Event>>, Error>> + Send;
}

/// In-process history whose read snapshots share immutable event allocations.
///
/// Later appends do not change earlier read collections. Dropping the log leaves already
/// returned event handles alive; this store provides no persistence across process exits.
/// Creating or using it does not attach logging or recovery to a graph execution.
///
/// # Examples
///
/// ```
/// use std::{num::NonZeroU64, sync::Arc, time::SystemTime};
/// use cognacta_core::{Error, Event, EventData, EventLog, GraphInput, InMemoryEventLog};
///
/// # #[tokio::main(flavor = "current_thread")]
/// # async fn main() -> Result<(), Error> {
/// let log = InMemoryEventLog::new();
/// let event = Event::builder()
///     .seq(NonZeroU64::MIN)
///     .run_id("example".to_owned())
///     .ts(SystemTime::now())
///     .data(EventData::RunStarted {
///         input: Arc::new(GraphInput::new(Default::default())),
///         caller: None,
///         format: 2,
///         max_waves: 8,
///         depth: 0,
///         max_depth: 4,
///     })
///     .build();
/// log.append(event).await?;
/// assert_eq!(log.events("example", 0).await?[0].kind(), "run_started");
/// assert!(log.events("example", 1).await?.is_empty());
/// # Ok(())
/// # }
/// ```
#[derive(Debug, Default)]
pub struct InMemoryEventLog {
    events: Mutex<HashMap<String, Vec<Arc<Event>>>>,
}

impl InMemoryEventLog {
    pub fn new() -> Self {
        Self::default()
    }
}

impl EventLog for InMemoryEventLog {
    async fn append(&self, event: Event) -> Result<(), Error> {
        let mut runs = self
            .events
            .lock()
            .expect("event storage contains no user code");
        let events = runs.entry(event.run_id.clone()).or_default();
        let expected = events.last().map_or(1, |event| event.seq().get() + 1);
        if event.seq().get() != expected {
            return Err(EventLogError::Sequence {
                run_id: event.run_id.clone(),
                expected,
                actual: event.seq().get(),
            }
            .into());
        }
        events.push(Arc::new(event));
        Ok(())
    }

    async fn events(&self, run_id: &str, after_seq: u64) -> Result<Vec<Arc<Event>>, Error> {
        let events = self
            .events
            .lock()
            .expect("event storage contains no user code");
        Ok(events
            .get(run_id)
            .into_iter()
            .flatten()
            .filter(|event| event.seq.get() > after_seq)
            .cloned()
            .collect())
    }

    async fn all_events(&self) -> Result<Vec<Arc<Event>>, Error> {
        let events = self
            .events
            .lock()
            .expect("event storage contains no user code");
        Ok(events.values().flatten().cloned().collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::NodeId;
    use std::{error::Error as _, time::Duration};

    #[test]
    fn generated_ids_are_time_ordered_uuid_v7() {
        let ids = (0..100).map(|_| new_run_id()).collect::<Vec<_>>();
        assert!(ids.windows(2).all(|pair| pair[0] < pair[1]));
        assert!(
            ids.iter()
                .all(|id| uuid::Uuid::parse_str(id).unwrap().get_version_num() == 7)
        );
    }

    fn event(run_id: &str, seq: u64) -> Event {
        Event::builder()
            .seq(NonZeroU64::new(seq).unwrap())
            .run_id(run_id.to_owned())
            .ts(SystemTime::UNIX_EPOCH)
            .data(EventData::StateDelta {
                wave: seq as usize,
                outcomes: vec![],
            })
            .build()
    }

    #[test]
    fn standard_serde_preserves_every_event_shape_and_json_values() {
        let node = NodeAttempt {
            key: NodeKey::Instance {
                template: NodeId::new("worker"),
                key: "first".into(),
            },
            attempt: NonZeroU32::new(2).unwrap(),
        };
        let graph_input = Arc::new(GraphInput::new(HashMap::new()));
        let node_input = Arc::new(Input::new(vec![Arc::new(serde_json::json!({"job": 7}))]));
        let call = ChildCall {
            caller: CallSite {
                node: node.clone(),
                key: "child".into(),
            },
            child_run_id: "child".into(),
            input: graph_input.clone(),
        };
        let cases = [
            (
                "run_started",
                EventData::RunStarted {
                    format: 2,
                    input: graph_input.clone(),
                    caller: Some(call.caller.clone()),
                    depth: 1,
                    max_depth: 4,
                    max_waves: 8,
                },
            ),
            (
                "run_initialized",
                EventData::RunInitialized {
                    state: serde_json::json!({"count": 7}),
                },
            ),
            (
                "node_started",
                EventData::NodeStarted {
                    wave: 3,
                    node: node.clone(),
                    input: node_input.clone(),
                    members: Some(vec![node.key.clone()]),
                },
            ),
            (
                "node_completed",
                EventData::NodeCompleted {
                    wave: 3,
                    node: node.clone(),
                    outcome: RecordedOutcome {
                        value: Some(Arc::new(serde_json::json!({"accepted": 7}))),
                        state_delta: serde_json::json!({"count": 7}),
                        directive: None,
                    },
                },
            ),
            (
                "node_failed",
                EventData::NodeFailed {
                    wave: 3,
                    node: node.clone(),
                    reason: FailureKind::Execution,
                },
            ),
            (
                "node_skipped",
                EventData::NodeSkipped {
                    key: NodeKey::Static(NodeId::new("other")),
                },
            ),
            ("call_linked", EventData::CallLinked { call }),
            (
                "run_fault",
                EventData::RunFault {
                    wave: Some(3),
                    reason: FaultKind::Driver,
                },
            ),
            (
                "state_delta",
                EventData::StateDelta {
                    wave: 3,
                    outcomes: vec![node.clone()],
                },
            ),
            (
                "control",
                EventData::Control {
                    wave: 3,
                    outcomes: vec![],
                },
            ),
            ("run_completed", EventData::RunCompleted { output: node }),
            (
                "run_failed",
                EventData::RunFailed {
                    reason: Some(TerminalFailure::Initialization),
                },
            ),
        ];
        for (kind, data) in cases {
            let original = Event::builder()
                .seq(NonZeroU64::new(7).unwrap())
                .run_id("child".into())
                .parent_run_id("parent".into())
                .ts(SystemTime::UNIX_EPOCH + Duration::from_nanos(123))
                .data(data)
                .build();
            let bytes = serde_json::to_vec(&original).unwrap();
            let restored: Event = serde_json::from_slice(&bytes).unwrap();
            assert_eq!(restored, original);
            assert_eq!(restored.kind(), kind);
            let readable: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
            assert_eq!(readable["data"]["type"], kind);
            if kind == "node_completed" {
                assert_eq!(readable["data"]["outcome"]["value"]["accepted"], 7);
                assert_eq!(readable["data"]["outcome"]["state_delta"]["count"], 7);
            }
        }
    }

    #[test]
    fn deserialization_rejects_zero_sequence_and_attempt() {
        let mut encoded = serde_json::to_value(event("root", 1)).unwrap();
        encoded["seq"] = 0.into();
        assert!(serde_json::from_value::<Event>(encoded).is_err());

        let node = NodeAttempt {
            key: NodeKey::Static(NodeId::new("node")),
            attempt: NonZeroU32::MIN,
        };
        let mut encoded = serde_json::to_value(node).unwrap();
        encoded["attempt"] = 0.into();
        assert!(serde_json::from_value::<NodeAttempt>(encoded).is_err());
    }

    #[tokio::test]
    async fn reads_isolate_runs_and_use_an_exclusive_cursor() -> Result<(), Error> {
        let log = InMemoryEventLog::new();
        assert!(log.all_events().await?.is_empty());
        assert!(log.events("unknown", 0).await?.is_empty());
        for seq in 1..=3 {
            log.append(event("parent", seq)).await?;
        }
        let child = Event::builder()
            .seq(NonZeroU64::MIN)
            .run_id("child".into())
            .parent_run_id("parent".into())
            .ts(SystemTime::UNIX_EPOCH)
            .data(EventData::RunFailed {
                reason: Some(TerminalFailure::Initialization),
            })
            .build();
        log.append(child).await?;
        let parent = log.events("parent", 0).await?;
        assert_eq!(
            parent
                .iter()
                .map(|event| event.seq().get())
                .collect::<Vec<_>>(),
            [1, 2, 3]
        );
        let child = log.events("child", 0).await?;
        assert_eq!(child.len(), 1);
        assert_eq!(child[0].seq(), NonZeroU64::MIN);
        assert_eq!(child[0].parent_run_id(), Some("parent"));
        assert_eq!(child[0].ts(), SystemTime::UNIX_EPOCH);
        assert_eq!(log.events("parent", 2).await?, vec![parent[2].clone()]);
        assert!(log.events("parent", 3).await?.is_empty());
        assert!(log.events("parent", u64::MAX).await?.is_empty());
        assert_eq!(log.all_events().await?.len(), 4);
        Ok(())
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn concurrent_runs_share_events_without_mutating_prior_reads() -> Result<(), Error> {
        let log = Arc::new(InMemoryEventLog::new());
        log.append(event("snapshot", 1)).await?;
        let snapshot = log.events("snapshot", 0).await?;
        log.append(event("snapshot", 2)).await?;
        let current = log.events("snapshot", 0).await?;
        assert_eq!(snapshot.len(), 1);
        assert_eq!(current.len(), 2);
        assert!(Arc::ptr_eq(&snapshot[0], &current[0]));

        let mut tasks = tokio::task::JoinSet::new();
        for run_id in ["one", "two"] {
            let log = log.clone();
            tasks.spawn(async move {
                for seq in 1..=20 {
                    log.append(event(run_id, seq)).await?;
                    tokio::task::yield_now().await;
                }
                Ok::<_, Error>(())
            });
        }
        while let Some(result) = tasks.join_next().await {
            result.unwrap()?;
        }
        let all = log.all_events().await?;
        assert_eq!(all.len(), 42);
        for run_id in ["one", "two"] {
            let expected = log.events(run_id, 0).await?;
            let actual = all
                .iter()
                .filter(|event| event.run_id() == run_id)
                .cloned()
                .collect::<Vec<_>>();
            assert_eq!(actual, expected);
            assert_eq!(
                actual
                    .iter()
                    .map(|event| event.seq().get())
                    .collect::<Vec<_>>(),
                (1..=20).collect::<Vec<_>>()
            );
        }
        drop(log);
        assert_eq!(snapshot[0].run_id(), "snapshot");
        Ok(())
    }

    #[test]
    fn error_categories_keep_sources_out_of_display() {
        let source = || Box::new(std::io::Error::other("sensitive source"));
        let errors = [
            (
                "event append failed",
                EventLogError::Append { source: source() },
            ),
            (
                "event read failed",
                EventLogError::Read { source: source() },
            ),
            (
                "event payload encoding failed",
                EventLogError::Encode { source: source() },
            ),
            (
                "event payload decoding failed",
                EventLogError::Decode { source: source() },
            ),
        ];
        for (display, error) in errors {
            let error: Error = error.into();
            assert_eq!(error.to_string(), format!("event log error: {display}"));
            let Error::EventLog(inner) = &error else {
                panic!("wrong crate error")
            };
            assert_eq!(inner.source().unwrap().to_string(), "sensitive source");
            assert!(inner.source().unwrap().is::<std::io::Error>());
            assert_eq!(error.source().unwrap().to_string(), display);
        }
    }
}
