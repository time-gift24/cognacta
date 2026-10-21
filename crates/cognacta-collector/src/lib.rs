//! Process-owned logs, traces and metrics with bounded, lossy background output.
//!
//! Initialize before constructing business objects or cached metric handles. Without
//! initialization, standard instrumentation retains the host's default no-op behavior.
//! No explicit OTLP endpoint means local stderr only. Stop business work and release
//! spans before shutdown; its timeout is a total budget, including the local writer.
//!
//! ```no_run
//! use cognacta_collector::{Collector, Error};
//! use std::time::Duration;
//! fn main() -> Result<(), Error> {
//!     let collector = Collector::init_from_env("example")?;
//!     let calls = opentelemetry::global::meter("example").u64_counter("example.calls").build();
//!     for turn in 1..=2 {
//!         tracing::info!(turn, "operation");
//!         calls.add(1, &[]);
//!     }
//!     collector.shutdown(Duration::from_secs(3))
//! }
//! ```
mod config;
mod error;
mod remote;

pub use error::Error;

use opentelemetry::trace::TracerProvider;
use std::{
    io::Write,
    mem::ManuallyDrop,
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc,
    },
    time::{Duration, Instant},
};
use tracing_appender::non_blocking::{NonBlocking, WorkerGuard};
use tracing_subscriber::{EnvFilter, Layer, filter::filter_fn, layer::SubscriberExt};

static INITIALIZED: AtomicBool = AtomicBool::new(false);
const DEFAULT_FILTER: &str =
    "warn,cognacta_core=info,cognacta_provider=info,cognacta_cli=info,cognacta_collector=info";

/// One process-wide collection lifetime. Dropping does not wait for output.
/// Initialization is one-shot, even after shutdown; global hot replacement is unsupported.
pub struct Collector {
    command: mpsc::Sender<Instant>,
    done: mpsc::Receiver<Result<(), Error>>,
}

impl Collector {
    /// Validate and install once. Invalid remote configuration degrades to local logs.
    /// Does not wait for a receiver to become reachable. Errors retain their source;
    /// log their safe Display, never Debug or the source chain.
    pub fn init_from_env(service_name: &str) -> Result<Self, Error> {
        if service_name.trim().is_empty() || service_name.chars().any(char::is_control) {
            return Err(error::invalid("service_name", "必须非空白且不含控制字符"));
        }
        if INITIALIZED
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .is_err()
        {
            return Err(Error::AlreadyInitialized { source: None });
        }
        let (ready_tx, ready) = mpsc::sync_channel(1);
        let (command, commands) = mpsc::channel();
        let (finished, done) = mpsc::channel();
        let service = service_name.to_owned();
        // This owner thread is created now, not during Drop, so dropping cannot fail
        // to transfer resources or accidentally destroy a blocking guard on the caller.
        let spawned = std::thread::Builder::new()
            .name("collector-owner".into())
            .spawn(move || {
                let mut local = Local::new();
                let remote = config::environment()
                    .and_then(|env| config::Config::parse(&env))
                    .and_then(|config| remote::Remote::build(config, service, local.writer.clone()))
                    .unwrap_or_else(|error| {
                        let _ = writeln!(local.writer, "WARN collector.local_only: {error}");
                        remote::Remote::default()
                    });
                let log_filter = match std::env::var("RUST_LOG") {
                    Ok(value) => EnvFilter::try_new(value).ok(),
                    Err(std::env::VarError::NotPresent) => Some(EnvFilter::new(DEFAULT_FILTER)),
                    Err(_) => None,
                }
                .unwrap_or_else(|| {
                    let _ = writeln!(
                        local.writer,
                        "WARN collector.invalid_filter: RUST_LOG 无效，使用默认级别"
                    );
                    EnvFilter::new(DEFAULT_FILTER)
                });
                let trace_layer = remote.traces.as_ref().map(|provider| {
                    tracing_opentelemetry::layer()
                        .with_tracer(provider.tracer("cognacta"))
                        .with_filter(filter_fn(|meta| !internal(meta)))
                });
                let log_layer = remote.logs.as_ref().map(|provider| {
                    opentelemetry_appender_tracing::layer::OpenTelemetryTracingBridge::new(provider)
                        .with_filter(log_filter.clone())
                        .with_filter(filter_fn(|meta| !internal(meta)))
                });
                let subscriber = tracing_subscriber::registry()
                    .with(trace_layer)
                    .with(log_layer)
                    .with(
                        tracing_subscriber::fmt::layer()
                            .with_ansi(false)
                            .with_writer(local.writer.clone())
                            .with_filter(log_filter)
                            .with_filter(filter_fn(|meta| !internal(meta))),
                    );
                let dispatch = tracing::Dispatch::new(subscriber);
                if ready_tx.send((dispatch, remote.metrics.clone())).is_err() {
                    return;
                }
                let deadline = commands.recv().unwrap_or_else(|_| Instant::now());
                let status = remote.shutdown(deadline);
                if let Err(error) = &status {
                    let _ = writeln!(local.writer, "WARN collector.shutdown_failed: {error}");
                }
                drop(remote);
                let drained = local.finish(deadline);
                let status = if drained {
                    status
                } else {
                    Err(Error::ShutdownTimeout {
                        timeout: Duration::ZERO,
                    })
                };
                let _ = finished.send(status);
            });
        if let Err(source) = spawned {
            INITIALIZED.store(false, Ordering::Release);
            return Err(Error::Initialization {
                component: "owner thread",
                source: Box::new(source),
            });
        }
        let (dispatch, metrics) = ready.recv().map_err(|source| {
            INITIALIZED.store(false, Ordering::Release);
            Error::Initialization {
                component: "output resources",
                source: Box::new(source),
            }
        })?;
        tracing::dispatcher::set_global_default(dispatch).map_err(|source| {
            Error::AlreadyInitialized {
                source: Some(Box::new(source)),
            }
        })?;
        if let Some(metrics) = metrics {
            opentelemetry::global::set_meter_provider(metrics);
        }
        Ok(Self { command, done })
    }

    /// Attempt final delivery within one shared deadline. Returns early when done.
    /// After timeout, resources stay owned by the background cleanup thread; neither
    /// this method nor subsequent Drop waits for it again. The caller keeps its
    /// original business result when telemetry cannot be delivered.
    pub fn shutdown(self, timeout: Duration) -> Result<(), Error> {
        let deadline = Instant::now()
            .checked_add(timeout)
            .ok_or_else(|| error::invalid("timeout", "时间预算超出单调时钟范围"))?;
        self.command
            .send(deadline)
            .map_err(|source| Error::Shutdown {
                component: "owner thread",
                source: Box::new(source),
            })?;
        match self
            .done
            .recv_timeout(deadline.saturating_duration_since(Instant::now()))
        {
            Ok(Err(Error::ShutdownTimeout { .. })) | Err(mpsc::RecvTimeoutError::Timeout) => {
                Err(Error::ShutdownTimeout { timeout })
            }
            Ok(result) => result,
            Err(source) => Err(Error::Shutdown {
                component: "owner thread",
                source: Box::new(source),
            }),
        }
    }
}

fn internal(meta: &tracing::Metadata<'_>) -> bool {
    ["opentelemetry", "tracing_opentelemetry", "reqwest", "hyper"]
        .iter()
        .any(|prefix| meta.target().starts_with(prefix))
}

struct Local {
    writer: NonBlocking,
    guard: ManuallyDrop<WorkerGuard>,
    marker: Vec<u8>,
    drained: mpsc::Receiver<()>,
}
impl Local {
    fn new() -> Self {
        Self::with_writer(std::io::stderr(), 2048)
    }
    fn with_writer(writer: impl Write + Send + 'static, capacity: usize) -> Self {
        let marker = uuid::Uuid::new_v4().as_bytes().to_vec();
        let (ack, drained) = mpsc::sync_channel(1);
        let sink = DrainWriter {
            writer,
            marker: marker.clone(),
            ack,
        };
        let (writer, guard) = tracing_appender::non_blocking::NonBlockingBuilder::default()
            .buffered_lines_limit(capacity)
            .lossy(true)
            .thread_name("collector-stderr")
            .finish(sink);
        Self {
            writer,
            guard: ManuallyDrop::new(guard),
            marker,
            drained,
        }
    }
    fn finish(mut self, deadline: Instant) -> bool {
        loop {
            // Lossy enqueue can discard the control marker too; retry within the shared budget.
            let _ = self.writer.write_all(&self.marker);
            let remaining = deadline.saturating_duration_since(Instant::now());
            match self
                .drained
                .recv_timeout(remaining.min(Duration::from_millis(10)))
            {
                Ok(()) => break,
                Err(mpsc::RecvTimeoutError::Timeout) if Instant::now() < deadline => continue,
                _ => {
                    // ponytail: retain the process-lifetime guard on timeout. WorkerGuard
                    // 0.2.5 prints to stdout if its full queue rejects shutdown.
                    return false;
                }
            }
        }
        drop(ManuallyDrop::into_inner(self.guard));
        true
    }
}
struct DrainWriter<W> {
    writer: W,
    marker: Vec<u8>,
    ack: mpsc::SyncSender<()>,
}
impl<W: Write> Write for DrainWriter<W> {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        if bytes == self.marker {
            self.writer.flush()?;
            let _ = self.ack.try_send(());
            Ok(bytes.len())
        } else {
            self.writer.write(bytes)
        }
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.writer.flush()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn full_local_queue_recovers_during_shutdown() {
        struct BlockedWriter {
            entered: mpsc::Sender<()>,
            release: mpsc::Receiver<()>,
        }
        impl Write for BlockedWriter {
            fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
                self.entered.send(()).unwrap();
                self.release.recv_timeout(Duration::from_secs(5)).unwrap();
                Ok(bytes.len())
            }
            fn flush(&mut self) -> std::io::Result<()> {
                Ok(())
            }
        }
        let (entered, blocked) = mpsc::channel();
        let (release, resume) = mpsc::channel();
        let mut local = Local::with_writer(
            BlockedWriter {
                entered,
                release: resume,
            },
            1,
        );
        local.writer.write_all(b"first").unwrap();
        blocked.recv_timeout(Duration::from_secs(5)).unwrap();
        local.writer.write_all(b"queued").unwrap();
        let drops = local.writer.error_counter();
        let (done, result) = mpsc::channel();
        let deadline = Instant::now() + Duration::from_secs(3);
        let worker = std::thread::spawn(move || {
            done.send(local.finish(deadline)).unwrap();
        });
        // Wait until shutdown has actually tried to enqueue its marker into the full queue.
        while drops.dropped_lines() == 0 {
            assert!(
                Instant::now() < deadline,
                "shutdown never reached the full queue"
            );
            std::thread::yield_now();
        }
        release.send(()).unwrap();
        blocked.recv_timeout(Duration::from_secs(5)).unwrap();
        release.send(()).unwrap();
        let drained = result.recv_timeout(Duration::from_secs(1));
        worker.join().unwrap();
        assert!(
            matches!(drained, Ok(true)),
            "recovered writer must finish before the shutdown budget expires: {drained:?}"
        );
    }
}
