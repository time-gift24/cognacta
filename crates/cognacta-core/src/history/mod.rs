pub(crate) mod codec;
pub(crate) mod projection;
pub(crate) mod session;

use std::{fmt, future::Future, pin::Pin, sync::Arc};

use crate::{Error, Event, EventLog, Graph, State};
pub use projection::ReplayedRun;

#[cfg(test)]
mod tests;

type ReadFuture<'a> = Pin<Box<dyn Future<Output = Result<Vec<Arc<Event>>, Error>> + Send + 'a>>;

pub(crate) trait Store: Send + Sync {
    fn append(&self, event: Event) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + '_>>;
    fn events<'a>(&'a self, run_id: &'a str, after_seq: u64) -> ReadFuture<'a>;
    fn all_events(&self) -> ReadFuture<'_>;
}

impl<L: EventLog> Store for L {
    fn append(&self, event: Event) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + '_>> {
        Box::pin(EventLog::append(self, event))
    }
    fn events<'a>(&'a self, run_id: &'a str, after_seq: u64) -> ReadFuture<'a> {
        Box::pin(EventLog::events(self, run_id, after_seq))
    }
    fn all_events(&self) -> ReadFuture<'_> {
        Box::pin(EventLog::all_events(self))
    }
}

/// Event storage retained independently of an executing future.
#[derive(Clone)]
pub struct History {
    pub(crate) log: Arc<dyn Store>,
}

impl fmt::Debug for History {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("History").finish_non_exhaustive()
    }
}

impl History {
    pub fn new<L: EventLog + 'static>(log: Arc<L>) -> Self {
        Self { log }
    }
    pub async fn events(&self, run_id: &str, after_seq: u64) -> Result<Vec<Arc<Event>>, Error> {
        self.log.events(run_id, after_seq).await
    }
    pub async fn all_events(&self) -> Result<Vec<Arc<Event>>, Error> {
        self.log.all_events().await
    }
}

/// Folds a complete prefix of one Run without executing nodes, initializers or scheduling.
pub fn replay<S, O, R>(
    graph: &Graph<S, O, R>,
    events: &[Arc<Event>],
) -> Result<ReplayedRun<S, O>, Error>
where
    S: State,
    O: serde::de::DeserializeOwned + Send + Sync + 'static,
    R: Send + Sync + 'static,
{
    let first = events.first().ok_or(crate::HistoryError::Empty)?;
    let mut projection = projection::Projection::new(
        graph,
        first.run_id().into(),
        first.parent_run_id().map(str::to_owned),
    );
    for event in events {
        let fact = projection::Fact::decode(event.data())?;
        projection.validate(
            event.seq().get(),
            event.run_id(),
            event.parent_run_id(),
            &fact,
        )?;
        let output = projection.prepare_output(&fact)?;
        projection.apply(event.seq().get(), fact, output);
    }
    Ok(ReplayedRun { projection })
}
