use std::{
    any::{Any, type_name},
    collections::{HashMap, hash_map::Entry},
    future::poll_fn,
    sync::atomic::AtomicBool,
    task::Poll,
};

use async_trait::async_trait;
use tracing::Instrument;

use crate::{
    Error, ErrorKind,
    scheduler_observation::{RunObservation, StepObservation, safe_node_id, track_unwind},
};

/// Identity within a Cluster. Node construction validates registered identities.
pub type NodeId = String;
type Data = Box<dyn Any + Send>;

/// Shared business state, independently owned by each Run.
///
/// Apply only synchronous in-memory changes. On Err, leave the state unchanged:
/// validate first, then commit. The framework does not clone or roll back state.
pub trait State: Send + Sync {
    type Delta: Send;
    fn apply_delta(&mut self, delta: Self::Delta) -> Result<(), Error>;
}

/// Read-only state for one call. Business changes must be returned as Delta,
/// including when S contains interior mutability.
pub struct NodeContext<'a, S: State> {
    pub state: &'a S,
}

/// Typed behavior shared by calls to a registered Node.
///
/// Implement with `#[async_trait]`. Input belongs to this call; Payload becomes
/// the next call's Input on Goto. Each implementation has one Payload type.
#[async_trait]
pub trait NodeInstance<S: State>: Send + Sync {
    type Input: Send;
    type Payload: Send;

    async fn run(
        &self,
        input: Self::Input,
        ctx: NodeContext<'_, S>,
    ) -> Result<Outcome<S::Delta, Self::Payload>, Error>;
}

pub struct Outcome<D, P> {
    pub state_delta: Option<D>,
    pub control: Control<P>,
}

/// Routing is returned by nodes; Cluster does not store static edges.
pub enum Control<P> {
    Goto { target: NodeId, input: P },
    Finish,
}

/// A validated identity paired with its concrete implementation.
pub struct Node<B> {
    id: NodeId,
    body: B,
}

#[bon::bon]
impl<B> Node<B> {
    #[builder(start_fn = builder, state_mod(vis = "pub"))]
    pub fn new(id: NodeId, body: B) -> Result<Self, Error> {
        if id.is_empty() || id.trim() != id || id.chars().any(char::is_control) {
            return Err(Error::new(
                ErrorKind::InvalidRequest,
                "node ID must be nonempty, without surrounding whitespace or control characters",
            ));
        }
        Ok(Self { id, body })
    }

    pub fn id(&self) -> &NodeId {
        &self.id
    }
}

#[async_trait]
trait ErasedNode<S: State>: Send + Sync {
    async fn run(
        &self,
        input: Data,
        ctx: NodeContext<'_, S>,
    ) -> Result<Outcome<S::Delta, Data>, Error>;
}

#[async_trait]
impl<S, B> ErasedNode<S> for B
where
    S: State,
    B: NodeInstance<S>,
    B::Input: 'static,
    B::Payload: 'static,
{
    async fn run(
        &self,
        input: Data,
        ctx: NodeContext<'_, S>,
    ) -> Result<Outcome<S::Delta, Data>, Error> {
        let input = input.downcast::<B::Input>().map_err(|_| {
            Error::new(
                ErrorKind::InputTypeMismatch,
                format!("node input must be {}", type_name::<B::Input>()),
            )
        })?;
        tracing::Span::current().record("step_phase", "body");
        let outcome = NodeInstance::run(self, *input, ctx)
            .await
            .map_err(|source| {
                Error::new(ErrorKind::NodeExecution, "node execution failed")
                    .with_source(Box::new(source))
            })?;
        Ok(Outcome {
            state_delta: outcome.state_delta,
            control: match outcome.control {
                Control::Goto { target, input } => Control::Goto {
                    target,
                    input: Box::new(input),
                },
                Control::Finish => Control::Finish,
            },
        })
    }
}

/// A reusable registry of typed nodes, with routing supplied by their Outcomes.
///
/// Runs borrow this Cluster, preventing registration while they are still in use.
/// Dynamic targets and input types are checked when the next call starts.
///
/// ```
/// use async_trait::async_trait;
/// use cognacta_core::{Cluster, Control, Error, ErrorKind, Node, NodeContext,
///     NodeInstance, Outcome, RunStatus, Scheduler, State};
/// struct Total(u32);
/// impl State for Total {
///     type Delta = u32;
///     fn apply_delta(&mut self, delta: u32) -> Result<(), Error> {
///         let next = self.0.checked_add(delta)
///             .ok_or_else(|| Error::new(ErrorKind::InvalidRequest, "total overflow"))?;
///         self.0 = next;
///         Ok(())
///     }
/// }
/// struct Add;
/// #[async_trait]
/// impl NodeInstance<Total> for Add {
///     type Input = u32;
///     type Payload = ();
///     async fn run(&self, input: u32, ctx: NodeContext<'_, Total>)
///         -> Result<Outcome<u32, ()>, Error>
///     {
///         let _previous = ctx.state.0;
///         Ok(Outcome { state_delta: Some(input), control: Control::Finish })
///     }
/// }
/// # #[tokio::main(flavor = "current_thread")]
/// # async fn main() -> Result<(), Error> {
/// let mut cluster = Cluster::<Total>::new();
/// cluster.add(Node::builder().id("add".to_owned()).body(Add).build()?)?;
/// let mut run = cluster.start().state(Total(1))
///     .entry("add".to_owned()).input(2_u32).call()?;
/// Scheduler::new().drive(&mut run).await?;
/// assert_eq!(run.status(), RunStatus::Completed);
/// assert_eq!(run.state().0, 3);
/// assert_eq!(run.node_id(), None);
/// # Ok(())
/// # }
/// ```
pub struct Cluster<S: State> {
    nodes: HashMap<NodeId, Box<dyn ErasedNode<S>>>,
}

impl<S: State> Default for Cluster<S> {
    fn default() -> Self {
        Self::new()
    }
}

#[bon::bon]
impl<S: State> Cluster<S> {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
        }
    }

    pub fn add<B>(&mut self, node: Node<B>) -> Result<(), Error>
    where
        B: NodeInstance<S> + 'static,
        B::Input: 'static,
        B::Payload: 'static,
    {
        match self.nodes.entry(node.id) {
            Entry::Vacant(entry) => {
                entry.insert(Box::new(node.body));
                Ok(())
            }
            Entry::Occupied(entry) => Err(Error::new(
                ErrorKind::DuplicateNode,
                "node ID is already registered",
            )
            .with_node_id(entry.key().clone())),
        }
    }

    /// Validate the entry, then create a Ready Run without invoking any node.
    #[builder(state_mod(vis = "pub"))]
    pub fn start<'c, I>(&'c self, state: S, entry: NodeId, input: I) -> Result<Run<'c, S>, Error>
    where
        I: Send + 'static,
    {
        if !self.nodes.contains_key(&entry) {
            return Err(unknown_node(entry));
        }
        Ok(Run {
            cluster: self,
            state,
            phase: RunPhase::Ready {
                node_id: entry,
                input: Box::new(input),
            },
        })
    }
}

/// One execution owns its business State and borrows a fixed Cluster.
/// Detailed failure reasons are returned from Scheduler, not stored here.
pub struct Run<'c, S: State> {
    cluster: &'c Cluster<S>,
    state: S,
    phase: RunPhase,
}

enum RunPhase {
    Ready { node_id: NodeId, input: Data },
    Running { node_id: NodeId },
    Completed,
    Failed { node_id: NodeId },
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RunStatus {
    Ready,
    Running,
    Completed,
    Failed,
}

impl<S: State> Run<'_, S> {
    pub fn state(&self) -> &S {
        &self.state
    }

    pub fn status(&self) -> RunStatus {
        match self.phase {
            RunPhase::Ready { .. } => RunStatus::Ready,
            RunPhase::Running { .. } => RunStatus::Running,
            RunPhase::Completed => RunStatus::Completed,
            RunPhase::Failed { .. } => RunStatus::Failed,
        }
    }

    pub fn node_id(&self) -> Option<&NodeId> {
        match &self.phase {
            RunPhase::Ready { node_id, .. }
            | RunPhase::Running { node_id }
            | RunPhase::Failed { node_id } => Some(node_id),
            RunPhase::Completed => None,
        }
    }

    fn not_ready(&self) -> Error {
        let mut error = Error::new(ErrorKind::RunNotReady, "run is not ready");
        if let Some(node_id) = self.node_id() {
            error = error.with_node_id(node_id.clone());
        }
        error
    }

    fn begin_step(&mut self) -> Result<(NodeId, Data), Error> {
        let next = match &self.phase {
            RunPhase::Ready { node_id, .. } => RunPhase::Running {
                node_id: node_id.clone(),
            },
            _ => return Err(self.not_ready()),
        };
        match std::mem::replace(&mut self.phase, next) {
            RunPhase::Ready { node_id, input } => Ok((node_id, input)),
            previous => {
                self.phase = previous;
                Err(self.not_ready())
            }
        }
    }
}

/// Serial execution: call, apply Delta, then Goto or Finish.
#[derive(Default)]
pub struct Scheduler {
    _private: (),
}

impl Scheduler {
    pub fn new() -> Self {
        Self::default()
    }

    /// Drive a Ready Run to completion or its first failure.
    ///
    /// Previously committed deltas remain after a later failure. Dropping an
    /// active future can leave Running; this version has no recovery or retry.
    /// Panics propagate unchanged. Telemetry adds no Scheduler metrics.
    pub async fn drive<S: State>(&self, run: &mut Run<'_, S>) -> Result<(), Error> {
        if run.status() != RunStatus::Ready {
            let error = run.not_ready();
            tracing::warn!(
                event = "cluster.run.failed",
                phase = phase_name(run.status()),
                node_id = run.node_id().map(|id| safe_node_id(id)),
                error_kind = "run_not_ready",
            );
            return Err(error);
        }
        let panicked = AtomicBool::new(false);
        let mut observation = RunObservation::start(&panicked);
        let result = track_unwind(
            async {
                let mut completed_steps = 0;
                loop {
                    let (node_id, input) = run.begin_step()?;
                    if completed_steps == 64 {
                        completed_steps = 0;
                        // Transfer first so cancellation here cannot replay the input.
                        let mut yielded = false;
                        poll_fn(|cx| {
                            if yielded {
                                Poll::Ready(())
                            } else {
                                yielded = true;
                                cx.waker().wake_by_ref();
                                Poll::Pending
                            }
                        })
                        .await;
                    }
                    let mut step = StepObservation::start(&node_id, &panicked);
                    let result = async {
                        let node = run
                            .cluster
                            .nodes
                            .get(&node_id)
                            .ok_or_else(|| unknown_node(node_id.clone()))?;
                        step.span.record("step_phase", "input");
                        let outcome = node
                            .run(input, NodeContext { state: &run.state })
                            .await
                            .map_err(|error| error.with_node_id(node_id.clone()))?;
                        step.span.record("step_phase", "delta");
                        if let Some(delta) = outcome.state_delta {
                            run.state.apply_delta(delta).map_err(|source| {
                                Error::new(ErrorKind::StateDeltaRejected, "state delta rejected")
                                    .with_node_id(node_id.clone())
                                    .with_source(Box::new(source))
                            })?;
                        }
                        step.span.record("step_phase", "route");
                        Ok::<_, Error>(outcome.control)
                    }
                    .instrument(step.span.clone())
                    .await;
                    match result {
                        Ok(Control::Goto { target, input }) => {
                            run.phase = RunPhase::Ready {
                                node_id: target,
                                input,
                            };
                            completed_steps += 1;
                            step.complete("ready", "goto");
                        }
                        Ok(Control::Finish) => {
                            run.phase = RunPhase::Completed;
                            step.complete("completed", "finish");
                            return Ok(());
                        }
                        Err(error) => {
                            run.phase = RunPhase::Failed { node_id };
                            step.fail(&error);
                            return Err(error);
                        }
                    }
                }
            }
            .instrument(observation.span.clone()),
            &panicked,
        )
        .await;
        observation.finish(&result);
        result
    }
}

fn unknown_node(node_id: NodeId) -> Error {
    Error::new(ErrorKind::UnknownNode, "node is not registered").with_node_id(node_id)
}

fn phase_name(status: RunStatus) -> &'static str {
    match status {
        RunStatus::Ready => "ready",
        RunStatus::Running => "running",
        RunStatus::Completed => "completed",
        RunStatus::Failed => "failed",
    }
}
