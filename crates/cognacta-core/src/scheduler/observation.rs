use crate::{NodeKey, RunContext};
use std::time::Instant;

pub(super) struct Observation {
    pub(super) span: tracing::Span,
    dispatcher: tracing::Dispatch,
    started: Instant,
    settled: bool,
    run_id: String,
    parent_run_id: String,
    parent_node: String,
    depth: usize,
}

// Bound the encoded representation too: a control character may expand to several bytes.
fn safe(value: &str) -> String {
    value
        .chars()
        .flat_map(char::escape_debug)
        .take(256)
        .collect()
}

impl Observation {
    pub(super) fn new<R: Send + Sync + 'static>(context: &RunContext<R>) -> Self {
        let started = Instant::now();
        let run_id = safe(context.run_id());
        let parent_run_id = safe(context.parent_run_id().unwrap_or(""));
        let parent_node = safe(
            &context
                .parent_node()
                .map(ToString::to_string)
                .unwrap_or_default(),
        );
        let depth = context.depth();
        let span = tracing::debug_span!("graph.run", %run_id, %parent_run_id, %parent_node, depth);
        tracing::debug!(parent: &span, event = "run_started", phase = "input", %run_id, %parent_run_id, %parent_node, depth, "run started");
        Self {
            span,
            dispatcher: tracing::dispatcher::get_default(Clone::clone),
            started,
            settled: false,
            run_id,
            parent_run_id,
            parent_node,
            depth,
        }
    }

    pub(super) fn finish(&mut self, phase: &'static str, failure: Option<&'static str>) {
        self.settled = true;
        let elapsed_ms = self.started.elapsed().as_secs_f64() * 1000.0;
        if let Some(error_class) = failure {
            tracing::warn!(parent: &self.span, event = "run_failed", run_id = %self.run_id, parent_run_id = %self.parent_run_id, parent_node = %self.parent_node, depth = self.depth, phase, error_class, elapsed_ms, "run failed");
        } else {
            tracing::debug!(parent: &self.span, event = "run_completed", run_id = %self.run_id, parent_run_id = %self.parent_run_id, parent_node = %self.parent_node, depth = self.depth, phase, elapsed_ms, "run completed");
        }
    }
}

impl Drop for Observation {
    fn drop(&mut self) {
        if !self.settled && !std::thread::panicking() {
            tracing::dispatcher::with_default(&self.dispatcher, || {
                tracing::debug!(parent: &self.span, event = "run_cancelled", run_id = %self.run_id, parent_run_id = %self.parent_run_id, parent_node = %self.parent_node, depth = self.depth, elapsed_ms = self.started.elapsed().as_secs_f64() * 1000.0, "local run observation cancelled");
            });
        }
    }
}

pub(super) fn depth_rejected<R: Send + Sync + 'static>(parent: &RunContext<R>, node: &NodeKey) {
    tracing::warn!(event = "depth_rejected", run_id = %safe(parent.run_id()), parent_node = %safe(&node.to_string()), depth = parent.depth(), max_depth = parent.max_depth(), error_class = "depth_exceeded", "child depth rejected");
}
