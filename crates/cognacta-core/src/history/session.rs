use std::{
    collections::HashSet,
    future::Future,
    pin::Pin,
    sync::{Arc, Mutex},
    time::SystemTime,
};

use super::projection::{Fact, Projection};
use crate::{
    CallSite, ChildCall, Error, Event, EventLogError, GraphInput, History, HistoryError,
    NodeAttempt, RunError, State, new_run_id,
};

/// A recording failure stops one invocation tree, not unrelated roots sharing storage.
#[derive(Default, Debug)]
pub(crate) struct Gate {
    failure: Mutex<Option<Arc<Error>>>,
}

impl Gate {
    pub(crate) fn check(&self) -> Result<(), Error> {
        match &*self.failure.lock().expect("recording gate") {
            Some(error) => Err(shared(error)),
            None => Ok(()),
        }
    }
    pub(crate) fn fail(&self, error: Error) -> Error {
        let mut failure = self.failure.lock().expect("recording gate");
        shared(failure.get_or_insert_with(|| Arc::new(error)))
    }
}

fn shared(error: &Arc<Error>) -> Error {
    match error.as_ref() {
        Error::History(error) => error.clone().into(),
        Error::EventLog(EventLogError::Sequence {
            run_id,
            expected,
            actual,
        }) => EventLogError::Sequence {
            run_id: run_id.clone(),
            expected: *expected,
            actual: *actual,
        }
        .into(),
        Error::EventLog(EventLogError::Read { .. }) => EventLogError::Read {
            source: Box::new(error.clone()),
        }
        .into(),
        Error::EventLog(EventLogError::Encode { .. }) => EventLogError::Encode {
            source: Box::new(error.clone()),
        }
        .into(),
        Error::EventLog(EventLogError::Decode { .. }) => EventLogError::Decode {
            source: Box::new(error.clone()),
        }
        .into(),
        _ => EventLogError::Append {
            source: Box::new(error.clone()),
        }
        .into(),
    }
}

pub(crate) struct Session<S: State, O> {
    pub(crate) projection: Arc<tokio::sync::Mutex<Projection<S, O>>>,
    pub(crate) history: History,
    pub(crate) gate: Arc<Gate>,
}

impl<S: State, O> Clone for Session<S, O> {
    fn clone(&self) -> Self {
        Self {
            projection: self.projection.clone(),
            history: self.history.clone(),
            gate: self.gate.clone(),
        }
    }
}

impl<S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static> Session<S, O> {
    pub(crate) fn new(projection: Projection<S, O>, history: History, gate: Arc<Gate>) -> Self {
        Self {
            projection: Arc::new(tokio::sync::Mutex::new(projection)),
            history,
            gate,
        }
    }

    pub(crate) async fn commit(
        &self,
        fact: Fact<S>,
        diagnostic: Option<RunError>,
        ts: SystemTime,
    ) -> Result<(), Error> {
        let mut projection = self.projection.lock().await;
        self.commit_locked(&mut projection, fact, diagnostic, ts)
            .await
    }

    pub(crate) async fn commit_locked(
        &self,
        projection: &mut Projection<S, O>,
        fact: Fact<S>,
        diagnostic: Option<RunError>,
        ts: SystemTime,
    ) -> Result<(), Error> {
        self.gate.check()?;
        let seq = projection.last_seq + 1;
        let data = fact.wire().map_err(|error| self.gate.fail(error))?;
        let prepared = Fact::decode(&data).map_err(|error| self.gate.fail(error))?;
        projection
            .validate(
                seq,
                &projection.run_id,
                projection.parent_run_id.as_deref(),
                &prepared,
            )
            .map_err(|error| self.gate.fail(error))?;
        let output = projection
            .prepare_output(&prepared)
            .map_err(|error| self.gate.fail(error))?;
        let event = Event::builder()
            .seq(seq.try_into().expect("next sequence"))
            .run_id(projection.run_id.clone())
            .maybe_parent_run_id(projection.parent_run_id.clone())
            .ts(ts)
            .data(data)
            .build();
        self.history
            .log
            .append(event)
            .await
            .map_err(|error| self.gate.fail(error))?;
        // No suspension point or failure-gate check may separate a confirmed append and apply.
        projection.apply(seq, prepared, output);
        if let Some(diagnostic) = diagnostic {
            projection
                .run
                .as_mut()
                .expect("diagnostic after initialization")
                .errors
                .push(diagnostic);
            projection.sort_diagnostics();
        }
        Ok(())
    }
}

type LinkFuture<'a> =
    Pin<Box<dyn Future<Output = Result<(ChildCall, Arc<GraphInput>), Error>> + Send + 'a>>;

pub(crate) trait CallHost: Send + Sync {
    fn link(&self, key: String, input: Arc<GraphInput>) -> LinkFuture<'_>;
}

/// Physical-entry bookkeeping is separate from the durable logical attempt.
pub(crate) struct NodeCalls<S: State, O> {
    session: Session<S, O>,
    node: NodeAttempt,
    used: Mutex<HashSet<String>>,
}

impl<S: State, O> NodeCalls<S, O> {
    pub(crate) fn new(session: Session<S, O>, node: NodeAttempt) -> Self {
        Self {
            session,
            node,
            used: Mutex::new(HashSet::new()),
        }
    }
}

impl<S: State, O: serde::de::DeserializeOwned + Send + Sync + 'static> CallHost
    for NodeCalls<S, O>
{
    fn link(&self, key: String, input: Arc<GraphInput>) -> LinkFuture<'_> {
        Box::pin(async move {
            self.session.gate.check()?;
            if !self.used.lock().expect("call keys").insert(key.clone()) {
                return Err(self
                    .session
                    .gate
                    .fail(HistoryError::DuplicateCall { key }.into()));
            }
            let caller = CallSite {
                node: self.node.clone(),
                key,
            };
            let mut projection = self.session.projection.lock().await;
            if projection
                .run
                .as_ref()
                .and_then(|run| run.node(&self.node.key))
                .is_none_or(|node| {
                    node.status() != crate::NodeStatus::Running
                        || node.attempts() != self.node.attempt.get()
                })
            {
                return Err(self.session.gate.fail(HistoryError::CallContext.into()));
            }
            if let Some(index) = projection
                .calls
                .iter()
                .position(|call| call.caller == caller)
            {
                return Ok((
                    projection.calls[index].clone(),
                    projection.call_inputs[index].clone(),
                ));
            }
            let call = ChildCall {
                caller,
                child_run_id: new_run_id(),
                input: input.clone(),
            };
            self.session
                .commit_locked(
                    &mut projection,
                    Fact::CallLinked {
                        call: call.clone(),
                        input: input.clone(),
                    },
                    None,
                    SystemTime::now(),
                )
                .await?;
            Ok((call, input))
        })
    }
}
