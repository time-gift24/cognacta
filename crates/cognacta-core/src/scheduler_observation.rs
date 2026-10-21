use std::{
    future::{Future, poll_fn},
    pin::pin,
    sync::atomic::{AtomicBool, Ordering},
};

use tracing::Span;

use crate::{Error, ErrorKind, observation::error_kind};

// Bound the encoded output, not the number of input characters.
pub(crate) fn safe_node_id(id: &str) -> String {
    let mut safe = String::new();
    for ch in id.chars() {
        if ch.is_control() {
            for escaped in ch.escape_default() {
                if safe.len() + escaped.len_utf8() > 256 {
                    return safe;
                }
                safe.push(escaped);
            }
        } else {
            if safe.len() + ch.len_utf8() > 256 {
                break;
            }
            safe.push(ch);
        }
    }
    safe
}

pub(crate) struct RunObservation<'a> {
    pub span: Span,
    settled: bool,
    panicked: &'a AtomicBool,
}

impl<'a> RunObservation<'a> {
    pub fn start(panicked: &'a AtomicBool) -> Self {
        let span = tracing::info_span!("cluster.run", phase = "ready");
        span.in_scope(|| tracing::info!(event = "cluster.run.started", phase = "ready"));
        span.record("phase", "running");
        Self {
            span,
            settled: false,
            panicked,
        }
    }

    pub fn finish(&mut self, result: &Result<(), Error>) {
        self.settled = true;
        self.span.in_scope(|| match result {
            Ok(()) => {
                self.span.record("phase", "completed");
                tracing::info!(event = "cluster.run.completed", phase = "completed");
            }
            Err(error) => {
                self.span.record("phase", "failed");
                tracing::warn!(
                    event = "cluster.run.failed",
                    phase = "failed",
                    node_id = error.node_id().map(|id| safe_node_id(id)),
                    error_kind = error_kind(error.kind())
                );
            }
        });
    }
}

impl Drop for RunObservation<'_> {
    fn drop(&mut self) {
        if !self.settled && !self.panicked.load(Ordering::Relaxed) && !std::thread::panicking() {
            self.span.in_scope(|| {
                tracing::debug!(event = "cluster.run.cancelled", phase = "running");
            });
        }
    }
}

pub(crate) struct StepObservation<'a> {
    pub span: Span,
    node_id: String,
    settled: bool,
    panicked: &'a AtomicBool,
}

impl<'a> StepObservation<'a> {
    pub fn start(node_id: &str, panicked: &'a AtomicBool) -> Self {
        let node_id = safe_node_id(node_id);
        let span = tracing::debug_span!("cluster.step", node_id = %node_id,
            phase = "running", step_phase = "lookup");
        span.in_scope(|| {
            tracing::debug!(event = "cluster.step.started", node_id = %node_id,
                phase = "running", step_phase = "lookup");
        });
        Self {
            span,
            node_id,
            settled: false,
            panicked,
        }
    }

    pub fn complete(&mut self, phase: &'static str, control: &'static str) {
        self.settled = true;
        self.span.record("phase", phase);
        self.span.in_scope(|| {
            tracing::debug!(event = "cluster.step.completed", node_id = %self.node_id,
                phase, step_phase = "route", control);
        });
    }

    pub fn fail(&mut self, error: &Error) {
        self.settled = true;
        let step_phase = match error.kind() {
            ErrorKind::UnknownNode => "lookup",
            ErrorKind::InputTypeMismatch => "input",
            ErrorKind::StateDeltaRejected => "delta",
            _ => "body",
        };
        self.span
            .record("phase", "failed")
            .record("step_phase", step_phase);
        self.span.in_scope(|| {
            tracing::warn!(event = "cluster.step.failed", node_id = %self.node_id,
                phase = "failed", step_phase, error_kind = error_kind(error.kind()));
        });
    }
}

impl Drop for StepObservation<'_> {
    fn drop(&mut self) {
        if !self.settled && !self.panicked.load(Ordering::Relaxed) && !std::thread::panicking() {
            // The only suspension point in a step is the node's async call.
            self.span.in_scope(|| {
                tracing::debug!(event = "cluster.step.cancelled", node_id = %self.node_id,
                    phase = "running", step_phase = "body");
            });
        }
    }
}

/// Mark unwinding during poll without catching or changing the panic. The
/// caller may catch it and only later drop the future, outside thread::panicking.
pub(crate) async fn track_unwind<F: Future>(future: F, panicked: &AtomicBool) -> F::Output {
    let mut future = pin!(future);
    poll_fn(|cx| {
        let mut marker = UnwindMarker {
            panicked,
            armed: true,
        };
        let result = future.as_mut().poll(cx);
        marker.armed = false;
        result
    })
    .await
}

struct UnwindMarker<'a> {
    panicked: &'a AtomicBool,
    armed: bool,
}

impl Drop for UnwindMarker<'_> {
    fn drop(&mut self) {
        if self.armed {
            self.panicked.store(true, Ordering::Relaxed);
        }
    }
}
