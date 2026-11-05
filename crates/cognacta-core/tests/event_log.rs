use std::{num::NonZeroU64, sync::Arc, time::SystemTime};

use cognacta_core::{
    Error, Event, EventBuilder, EventData, EventLog, EventLogError, InMemoryEventLog, event_builder,
};

fn empty_builder() -> EventBuilder<event_builder::Empty> {
    Event::builder()
}

fn event() -> Event {
    empty_builder()
        .seq(NonZeroU64::MIN)
        .run_id("external".into())
        .ts(SystemTime::UNIX_EPOCH)
        .data(EventData::Control {
            wave: 1,
            outcomes: vec![],
        })
        .build()
}

async fn store<L: EventLog>(log: &L) -> Result<Vec<Arc<Event>>, Error> {
    log.append(event()).await?;
    log.events("external", 0).await
}

#[tokio::test]
async fn root_exports_support_construction_storage_and_serde() -> Result<(), Error> {
    let log = InMemoryEventLog::new();
    let events = store(&log).await?;
    assert_eq!(events.len(), 1);
    assert_eq!(events[0].seq(), NonZeroU64::MIN);
    assert_eq!(events[0].run_id(), "external");
    assert_eq!(events[0].parent_run_id(), None);
    assert_eq!(events[0].ts(), SystemTime::UNIX_EPOCH);
    assert_eq!(events[0].kind(), "control");
    assert!(matches!(
        events[0].data(),
        EventData::Control { wave: 1, .. }
    ));
    assert!(log.events("external", 1).await?.is_empty());
    assert!(Arc::ptr_eq(&events[0], &log.all_events().await?[0]));

    let bytes = serde_json::to_vec(events[0].as_ref()).unwrap();
    let restored: Event = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(&restored, events[0].as_ref());
    Ok(())
}

struct Unavailable;

impl EventLog for Unavailable {
    async fn append(&self, _: Event) -> Result<(), Error> {
        Err(EventLogError::Append {
            source: Box::new(std::io::Error::other("write unavailable")),
        }
        .into())
    }

    async fn events(&self, _: &str, _: u64) -> Result<Vec<Arc<Event>>, Error> {
        Err(EventLogError::Read {
            source: Box::new(std::io::Error::other("read unavailable")),
        }
        .into())
    }

    async fn all_events(&self) -> Result<Vec<Arc<Event>>, Error> {
        self.events("", 0).await
    }
}

#[tokio::test]
async fn downstream_implementation_returns_the_core_error_contract() {
    assert!(matches!(
        store(&Unavailable).await,
        Err(Error::EventLog(EventLogError::Append { .. }))
    ));
    assert!(matches!(
        Unavailable.events("external", 0).await,
        Err(Error::EventLog(EventLogError::Read { .. }))
    ));
    assert!(matches!(
        Unavailable.all_events().await,
        Err(Error::EventLog(EventLogError::Read { .. }))
    ));
}
