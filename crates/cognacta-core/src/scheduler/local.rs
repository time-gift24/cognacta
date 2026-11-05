use super::{Execution, Scheduler};
use crate::{ConfigError, Error, NodeError, NodeKey};
use bon::bon;
use std::{collections::HashMap, future::Future, num::NonZeroUsize, pin::Pin, sync::Arc};
use tokio::task::{Id, JoinSet};
#[derive(Clone, Copy, Debug)]
pub struct SchedulerConfig {
    pub(super) max_concurrency: NonZeroUsize,
    pub(super) max_waves: usize,
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

/// Local task scheduling with an independent concurrency pool per Run.
pub struct LocalScheduler {
    config: SchedulerConfig,
}

impl LocalScheduler {
    pub fn new(config: SchedulerConfig) -> Self {
        Self { config }
    }
}

impl Scheduler for LocalScheduler {
    fn config(&self) -> SchedulerConfig {
        self.config
    }

    fn drive<'a>(
        self: Arc<Self>,
        execution: &'a mut (dyn Execution + 'a),
    ) -> Pin<Box<dyn Future<Output = Result<(), Error>> + Send + 'a>> {
        Box::pin(async move {
            while let Some(ready) = execution.advance().await? {
                let mut tasks = JoinSet::new();
                let mut keys = HashMap::<Id, NodeKey>::new();
                let mut next = 0;
                let mut failure = None;
                while next < ready.len() || !tasks.is_empty() {
                    while failure.is_none()
                        && next < ready.len()
                        && tasks.len() < self.config.max_concurrency.get()
                    {
                        let key = ready[next].clone();
                        let task = match execution.dispatch(&key) {
                            Ok(task) => task,
                            Err(error) => {
                                failure = Some(error);
                                break;
                            }
                        };
                        let handle = tasks.spawn(task);
                        keys.insert(handle.id(), key);
                        next += 1;
                    }
                    let Some(joined) = tasks.join_next_with_id().await else {
                        break;
                    };
                    let (id, result) = match joined {
                        Ok((id, result)) => (id, result),
                        Err(error) if error.is_cancelled() => {
                            (error.id(), Err(Error::scheduling(error)))
                        }
                        Err(error) => (error.id(), Err(NodeError::Task(Box::new(error)).into())),
                    };
                    let key = keys.remove(&id).expect("submitted task has a node key");
                    if let Err(error) = execution.complete(key, result).await {
                        failure.get_or_insert(error);
                    }
                }
                if let Some(error) = failure {
                    return Err(error);
                }
            }
            Ok(())
        })
    }
}
