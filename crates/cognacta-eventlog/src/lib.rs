//! One append-only JSONL file per Run, implementing the core storage boundary.

use cognacta_core::{Error as CoreError, Event, EventLog, EventLogError};
use std::{
    collections::HashMap,
    fs::{self, File, OpenOptions},
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    sync::Arc,
};

/// File-storage errors retain sources without including paths or business data in Display.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("event file I/O failed")]
    Io {
        #[from]
        source: std::io::Error,
    },
    #[error("invalid event JSON")]
    Json {
        line: usize,
        #[source]
        source: serde_json::Error,
    },
    #[error("run ID is not a safe file name")]
    InvalidRunId,
    #[error("event file identity or sequence is invalid")]
    InvalidHistory { line: usize },
    #[error("event file ends with an incomplete line")]
    IncompleteLine,
    #[error("event file task failed")]
    Task {
        #[from]
        source: tokio::task::JoinError,
    },
}

/// Own one instance per directory and share it using Arc. Multiple processes must not write
/// the same directory concurrently. Failed or incomplete writes are never silently repaired.
pub struct JsonlEventLog {
    directory: Arc<PathBuf>,
    access: Arc<tokio::sync::Mutex<HashMap<String, u64>>>,
}

impl JsonlEventLog {
    /// Creates or opens a history directory without deleting existing files.
    pub async fn open(directory: impl Into<PathBuf>) -> Result<Self, Error> {
        let directory = Arc::new(directory.into());
        let path = directory.clone();
        tokio::task::spawn_blocking(move || fs::create_dir_all(path.as_ref())).await??;
        Ok(Self {
            directory,
            access: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
        })
    }

    pub fn directory(&self) -> &Path {
        &self.directory
    }
}

fn validate_id(run_id: &str) -> Result<(), Error> {
    if run_id.is_empty()
        || !run_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(Error::InvalidRunId);
    }
    Ok(())
}

fn read_run(directory: &Path, run_id: &str) -> Result<Vec<Arc<Event>>, Error> {
    let file = match File::open(directory.join(format!("{run_id}.jsonl"))) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
        Err(source) => return Err(source.into()),
    };
    let mut reader = BufReader::new(file);
    let mut events = Vec::new();
    let mut bytes = Vec::new();
    while reader.read_until(b'\n', &mut bytes)? != 0 {
        if bytes.last() != Some(&b'\n') {
            return Err(Error::IncompleteLine);
        }
        let line = events.len() + 1;
        let event: Event =
            serde_json::from_slice(&bytes).map_err(|source| Error::Json { line, source })?;
        if event.run_id() != run_id || event.seq().get() != line as u64 {
            return Err(Error::InvalidHistory { line });
        }
        events.push(Arc::new(event));
        bytes.clear();
    }
    Ok(events)
}

fn append_error(error: Error) -> CoreError {
    EventLogError::Append {
        source: Box::new(error),
    }
    .into()
}
fn read_error(error: Error) -> CoreError {
    EventLogError::Read {
        source: Box::new(error),
    }
    .into()
}

impl EventLog for JsonlEventLog {
    async fn append(&self, event: Event) -> Result<(), CoreError> {
        validate_id(event.run_id()).map_err(append_error)?;
        let mut bytes = serde_json::to_vec(&event).map_err(|source| {
            append_error(Error::Json {
                line: event.seq().get() as usize,
                source,
            })
        })?;
        bytes.push(b'\n');
        let mut access = self.access.clone().lock_owned().await;
        let directory = self.directory.clone();
        tokio::task::spawn_blocking(move || {
            let last = match access.get(event.run_id()) {
                Some(last) => *last,
                None => read_run(&directory, event.run_id())
                    .map_err(append_error)?
                    .last()
                    .map_or(0, |event| event.seq().get()),
            };
            if event.seq().get() != last + 1 {
                return Err(EventLogError::Sequence {
                    run_id: event.run_id().into(),
                    expected: last + 1,
                    actual: event.seq().get(),
                }
                .into());
            }
            let written = (|| -> Result<(), Error> {
                let mut file = OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(directory.join(format!("{}.jsonl", event.run_id())))?;
                file.write_all(&bytes)?;
                file.sync_data()?;
                if last == 0 {
                    File::open(directory.as_ref())?.sync_all()?;
                }
                Ok(())
            })();
            match written {
                Ok(()) => {
                    access.insert(event.run_id().into(), event.seq().get());
                    Ok(())
                }
                Err(error) => {
                    access.remove(event.run_id());
                    Err(append_error(error))
                }
            }
        })
        .await
        .map_err(|source| append_error(Error::Task { source }))?
    }

    async fn events(&self, run_id: &str, after_seq: u64) -> Result<Vec<Arc<Event>>, CoreError> {
        validate_id(run_id).map_err(read_error)?;
        let access = self.access.clone().lock_owned().await;
        let directory = self.directory.clone();
        let run_id = run_id.to_owned();
        tokio::task::spawn_blocking(move || {
            let _access = access;
            Ok(read_run(&directory, &run_id)
                .map_err(read_error)?
                .into_iter()
                .filter(|event| event.seq().get() > after_seq)
                .collect())
        })
        .await
        .map_err(|source| read_error(Error::Task { source }))?
    }

    async fn all_events(&self) -> Result<Vec<Arc<Event>>, CoreError> {
        let access = self.access.clone().lock_owned().await;
        let directory = self.directory.clone();
        tokio::task::spawn_blocking(move || {
            let _access = access;
            let read = (|| -> Result<Vec<Arc<Event>>, Error> {
                let mut ids = Vec::new();
                for entry in fs::read_dir(directory.as_ref())? {
                    let path = entry?.path();
                    if path
                        .extension()
                        .is_some_and(|extension| extension == "jsonl")
                    {
                        let id = path
                            .file_stem()
                            .and_then(|name| name.to_str())
                            .ok_or(Error::InvalidRunId)?;
                        validate_id(id)?;
                        ids.push(id.to_owned());
                    }
                }
                ids.sort();
                let mut events = Vec::new();
                for id in ids {
                    events.extend(read_run(&directory, &id)?);
                }
                Ok(events)
            })();
            read.map_err(read_error)
        })
        .await
        .map_err(|source| read_error(Error::Task { source }))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cognacta_core::{EventData, new_run_id};
    use std::time::SystemTime;

    struct Directory(PathBuf);
    impl Directory {
        fn new() -> Self {
            Self(std::env::temp_dir().join(format!("cognacta-eventlog-{}", new_run_id())))
        }
    }
    impl Drop for Directory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    fn event(run_id: &str, seq: u64) -> Event {
        Event::builder()
            .run_id(run_id.into())
            .seq(seq.try_into().unwrap())
            .ts(SystemTime::now())
            .data(EventData::StateDelta {
                wave: 1,
                outcomes: vec![],
            })
            .build()
    }

    #[tokio::test]
    async fn separate_files_survive_reopen_and_sequences_continue() {
        let directory = Directory::new();
        let log = JsonlEventLog::open(&directory.0).await.unwrap();
        log.append(event("parent", 1)).await.unwrap();
        log.append(event("child", 1)).await.unwrap();
        assert!(directory.0.join("parent.jsonl").exists());
        assert!(directory.0.join("child.jsonl").exists());
        drop(log);
        let log = JsonlEventLog::open(&directory.0).await.unwrap();
        log.append(event("parent", 2)).await.unwrap();
        assert_eq!(log.events("parent", 1).await.unwrap()[0].seq().get(), 2);
        assert_eq!(log.all_events().await.unwrap().len(), 3);
        assert!(matches!(
            log.append(event("parent", 2)).await,
            Err(CoreError::EventLog(EventLogError::Sequence {
                expected: 3,
                ..
            }))
        ));
    }

    #[tokio::test]
    async fn invalid_paths_and_incomplete_history_are_rejected_without_rewriting() {
        let directory = Directory::new();
        let log = JsonlEventLog::open(&directory.0).await.unwrap();
        assert!(log.append(event("../escape", 1)).await.is_err());
        let path = directory.0.join("broken.jsonl");
        fs::write(&path, b"{\"seq\":1").unwrap();
        assert!(log.events("broken", 0).await.is_err());
        assert!(log.append(event("broken", 1)).await.is_err());
        assert_eq!(fs::read(path).unwrap(), b"{\"seq\":1");
    }

    #[derive(Default, serde::Serialize, serde::Deserialize, cognacta_core::State)]
    struct Sum {
        #[reducer(cognacta_core::Add)]
        total: u64,
    }
    struct Leaf;
    impl cognacta_core::NodeInstance<Sum, std::sync::atomic::AtomicUsize> for Leaf {
        type Output = u64;
        async fn run(
            &self,
            _: &cognacta_core::Input,
            ctx: cognacta_core::NodeContext<Sum, std::sync::atomic::AtomicUsize>,
            _: Arc<dyn cognacta_core::Scheduler>,
        ) -> Result<cognacta_core::Outcome<Sum, u64>, CoreError> {
            ctx.run
                .resources()
                .fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            Ok(cognacta_core::Outcome {
                value: Some(Arc::new(7)),
                state_delta: SumDelta { total: Some(7) },
                directive: None,
            })
        }
    }
    struct Parent(Arc<cognacta_core::Graph<Sum, u64, std::sync::atomic::AtomicUsize>>);
    impl cognacta_core::NodeInstance<Sum, std::sync::atomic::AtomicUsize> for Parent {
        type Output = u64;
        async fn run(
            &self,
            _: &cognacta_core::Input,
            ctx: cognacta_core::NodeContext<Sum, std::sync::atomic::AtomicUsize>,
            scheduler: Arc<dyn cognacta_core::Scheduler>,
        ) -> Result<cognacta_core::Outcome<Sum, u64>, CoreError> {
            let value = ctx
                .call(
                    "worker",
                    self.0.as_ref(),
                    cognacta_core::graph_input! { leaf: [] },
                    ctx.run.resources().clone(),
                    scheduler,
                )
                .await?;
            Ok(cognacta_core::Outcome {
                value: Some(Arc::new(*value + 1)),
                state_delta: SumDelta { total: Some(1) },
                directive: None,
            })
        }
    }
    struct StopParentResult(Arc<JsonlEventLog>);
    impl EventLog for StopParentResult {
        async fn append(&self, event: Event) -> Result<(), CoreError> {
            if event.parent_run_id().is_none() && event.kind() == "node_completed" {
                return Err(EventLogError::Append {
                    source: Box::new(std::io::Error::other("stop before parent result")),
                }
                .into());
            }
            self.0.append(event).await
        }
        async fn events(&self, id: &str, after: u64) -> Result<Vec<Arc<Event>>, CoreError> {
            self.0.events(id, after).await
        }
        async fn all_events(&self) -> Result<Vec<Arc<Event>>, CoreError> {
            self.0.all_events().await
        }
    }

    #[tokio::test]
    async fn reopened_files_resume_parent_and_reuse_completed_child() {
        use cognacta_core::{
            Graph, History, LocalScheduler, Node, NodeId, RunContext, Scheduler, SchedulerConfig,
        };
        use std::sync::atomic::{AtomicUsize, Ordering};
        let directory = Directory::new();
        let calls = Arc::new(AtomicUsize::new(0));
        let child = Arc::new(
            Graph::build(
                vec![Node::new(NodeId::new("leaf"), Leaf)],
                vec![],
                vec![],
                NodeId::new("leaf"),
            )
            .unwrap(),
        );
        let parent: Graph<Sum, u64, AtomicUsize> = Graph::build(
            vec![Node::new(NodeId::new("parent"), Parent(child.clone()))],
            vec![],
            vec![],
            NodeId::new("parent"),
        )
        .unwrap();
        let scheduler: Arc<dyn Scheduler> =
            Arc::new(LocalScheduler::new(SchedulerConfig::new(1, 4).unwrap()));
        let id = new_run_id();
        {
            let log = Arc::new(JsonlEventLog::open(&directory.0).await.unwrap());
            let stopping = Arc::new(StopParentResult(log));
            let context = RunContext::root(id.clone(), 3, calls.clone()).with_event_log(stopping);
            assert!(matches!(
                scheduler
                    .clone()
                    .run(&parent, cognacta_core::graph_input! { parent: [] }, context)
                    .await,
                Err(CoreError::EventLog(_))
            ));
        }
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        let log = Arc::new(JsonlEventLog::open(&directory.0).await.unwrap());
        let original = log.events(&id, 0).await.unwrap();
        let child_id = original
            .iter()
            .find_map(|event| match event.data() {
                EventData::CallLinked { call } => Some(call.child_run_id.clone()),
                _ => None,
            })
            .unwrap();
        let run = scheduler
            .resume(&parent, &id, History::new(log.clone()), calls.clone())
            .await
            .unwrap();
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!((run.state().total, **run.final_output().unwrap()), (1, 8));
        let child_events = log.events(&child_id, 0).await.unwrap();
        let restored = cognacta_core::replay(child.as_ref(), &child_events).unwrap();
        assert_eq!(restored.run().unwrap().state().total, 7);
        assert_eq!(fs::read_dir(&directory.0).unwrap().count(), 2);
        assert_eq!(
            &log.events(&id, 0).await.unwrap()[..original.len()],
            &original
        );
        assert!(directory.0.join(format!("{id}.jsonl")).exists());
        assert!(directory.0.join(format!("{child_id}.jsonl")).exists());
    }
}
