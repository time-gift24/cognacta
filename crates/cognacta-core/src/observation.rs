use crate::{
    Error, ErrorKind, EventStream, GenerationEvent, GenerationMetadata, GenerationResponse, Model,
    PartDelta, Usage,
};
use futures_core::Stream;
use opentelemetry::{
    KeyValue,
    metrics::{Counter, Histogram, Meter, UpDownCounter},
};
use std::{
    pin::Pin,
    sync::Arc,
    task::{Context, Poll},
    time::Instant,
};
use tracing::Span;

#[derive(Clone)]
pub(crate) struct Metrics {
    started: Counter<u64>,
    finished: Counter<u64>,
    active: UpDownCounter<i64>,
    duration: Histogram<f64>,
    first_text: Histogram<f64>,
    tokens: Counter<u64>,
    reports: Counter<u64>,
}
impl Metrics {
    pub fn new(meter: Meter) -> Self {
        Self {
            started: meter
                .u64_counter("cognacta.generation.started")
                .with_unit("{generation}")
                .build(),
            finished: meter
                .u64_counter("cognacta.generation.finished")
                .with_unit("{generation}")
                .build(),
            active: meter
                .i64_up_down_counter("cognacta.generation.in_flight")
                .with_unit("{generation}")
                .build(),
            duration: meter
                .f64_histogram("cognacta.generation.duration")
                .with_unit("s")
                .build(),
            first_text: meter
                .f64_histogram("cognacta.generation.time_to_first_text")
                .with_unit("s")
                .build(),
            tokens: meter
                .u64_counter("cognacta.generation.tokens")
                .with_unit("{token}")
                .build(),
            reports: meter
                .u64_counter("cognacta.generation.usage_reports")
                .with_unit("{report}")
                .build(),
        }
    }
}

pub(crate) struct Observation {
    metrics: Arc<Metrics>,
    attrs: Vec<KeyValue>,
    start: Instant,
    span: Option<Span>,
    terminal: bool,
    text_seen: bool,
    input: Option<u64>,
    output: Option<u64>,
    request_id: Option<String>,
}
impl Observation {
    pub fn start(model: &Model, operation: &'static str, metrics: Arc<Metrics>) -> Self {
        let start = Instant::now();
        let attrs = vec![
            KeyValue::new("provider", model.provider().name().to_owned()),
            KeyValue::new("model", model.name().to_owned()),
            KeyValue::new("protocol", model.protocol().name()),
            KeyValue::new("operation", operation),
        ];
        let span = tracing::info_span!(
            "generation",
            provider = model.provider().name(),
            model = model.name(),
            protocol = model.protocol().name(),
            operation,
            outcome = tracing::field::Empty,
            error.kind = tracing::field::Empty,
            upstream.request_id = tracing::field::Empty,
            elapsed_seconds = tracing::field::Empty,
            finish_reason = tracing::field::Empty,
            otel.status_code = tracing::field::Empty
        );
        metrics.started.add(1, &attrs);
        metrics.active.add(1, &attrs);
        span.in_scope(|| {
            tracing::info!(
                event = "generation.started",
                provider = model.provider().name(),
                model = model.name(),
                protocol = model.protocol().name(),
                operation,
                "generation.started"
            )
        });
        Self {
            metrics,
            attrs,
            start,
            span: Some(span),
            terminal: false,
            text_seen: false,
            input: None,
            output: None,
            request_id: None,
        }
    }
    pub fn span(&self) -> Span {
        self.span.clone().unwrap_or_else(Span::none)
    }
    fn usage(&mut self, usage: &Usage) {
        self.input = usage.input_tokens().or(self.input);
        self.output = usage.output_tokens().or(self.output);
    }
    fn metadata(&mut self, metadata: &GenerationMetadata) {
        self.request_id(metadata.request_id());
    }
    fn request_id(&mut self, id: Option<&str>) {
        if let Some(id) = id {
            let safe: String = id
                .chars()
                .take(256)
                .flat_map(|c| {
                    if c.is_control() {
                        c.escape_default().collect::<Vec<_>>()
                    } else {
                        vec![c]
                    }
                })
                .collect();
            self.span().record("upstream.request_id", &safe);
            self.request_id = Some(safe);
        }
    }
    pub fn success(&mut self, response: &GenerationResponse) {
        if self.terminal {
            return;
        }
        self.usage(response.usage());
        self.metadata(response.metadata());
        self.span().record(
            "finish_reason",
            tracing::field::debug(response.finish().reason()),
        );
        self.finish("success", None);
    }
    pub fn failure(&mut self, error: &Error) {
        if self.terminal {
            return;
        }
        if let Some(partial) = error.partial() {
            self.usage(partial.usage());
        }
        self.request_id(error.request_id());
        self.finish("error", Some(error_kind(error.kind())));
    }
    fn event(&mut self, event: &GenerationEvent) {
        if self.terminal {
            return;
        }
        match event {
            GenerationEvent::Started(metadata) => self.metadata(metadata),
            GenerationEvent::Usage(usage) => self.usage(usage),
            GenerationEvent::Completed(response) => self.success(response),
            GenerationEvent::Delta {
                delta: PartDelta::Text(text),
                ..
            } if !self.text_seen && !text.is_empty() => {
                self.text_seen = true;
                self.metrics
                    .first_text
                    .record(self.start.elapsed().as_secs_f64(), &self.attrs);
            }
            _ => {}
        }
    }
    fn finish(&mut self, outcome: &'static str, error: Option<&'static str>) {
        if self.terminal {
            return;
        }
        self.terminal = true;
        let elapsed = self.start.elapsed().as_secs_f64();
        self.metrics.active.add(-1, &self.attrs);
        let mut attrs = self.attrs.clone();
        attrs.push(KeyValue::new("outcome", outcome));
        self.metrics.duration.record(elapsed, &attrs);
        if let Some(kind) = error {
            attrs.push(KeyValue::new("error.kind", kind));
        }
        self.metrics.finished.add(1, &attrs);
        for (direction, value) in [("input", self.input), ("output", self.output)] {
            if let Some(value) = value {
                let mut attrs = self.attrs.clone();
                attrs.push(KeyValue::new("token.type", direction));
                self.metrics.tokens.add(value, &attrs);
                self.metrics.reports.add(1, &attrs);
            }
        }
        if let Some(span) = self.span.take() {
            span.record("outcome", outcome)
                .record("elapsed_seconds", elapsed);
            if let Some(kind) = error {
                span.record("error.kind", kind)
                    .record("otel.status_code", "ERROR");
            }
            let _entered = span.enter();
            let event = match outcome {
                "success" => "generation.completed",
                "error" => "generation.failed",
                _ => "generation.cancelled",
            };
            // Explicit fields also reach the OTel log bridge without copying arbitrary span attributes.
            if outcome == "error" {
                tracing::warn!(event, provider = %self.attrs[0].value, model = %self.attrs[1].value,
                    protocol = %self.attrs[2].value, operation = %self.attrs[3].value, outcome, error.kind = error,
                    upstream.request_id = self.request_id.as_deref(), elapsed_seconds = elapsed,
                    input_tokens = self.input, output_tokens = self.output, "generation.failed");
            } else {
                tracing::info!(event, provider = %self.attrs[0].value, model = %self.attrs[1].value,
                    protocol = %self.attrs[2].value, operation = %self.attrs[3].value, outcome,
                    upstream.request_id = self.request_id.as_deref(), elapsed_seconds = elapsed,
                    input_tokens = self.input, output_tokens = self.output, "generation terminal");
            }
        }
    }
    pub fn wrap(self, stream: EventStream) -> EventStream {
        Box::pin(ObservedStream {
            stream,
            observation: self,
        })
    }
}
impl Drop for Observation {
    fn drop(&mut self) {
        self.finish("cancelled", None);
    }
}

struct ObservedStream {
    stream: EventStream,
    observation: Observation,
}
impl Stream for ObservedStream {
    type Item = Result<GenerationEvent, Error>;
    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        let span = this.observation.span();
        let _entered = span.enter();
        let result = this.stream.as_mut().poll_next(cx);
        match &result {
            Poll::Ready(Some(Ok(event))) => this.observation.event(event),
            Poll::Ready(Some(Err(error))) => this.observation.failure(error),
            Poll::Ready(None) => this.observation.finish("error", Some("truncated")),
            Poll::Pending => {}
        }
        result
    }
}
pub(crate) fn error_kind(kind: ErrorKind) -> &'static str {
    match kind {
        ErrorKind::InvalidRequest => "invalid_request",
        ErrorKind::Unsupported => "unsupported",
        ErrorKind::Authentication => "authentication",
        ErrorKind::RateLimited => "rate_limited",
        ErrorKind::Unavailable => "unavailable",
        ErrorKind::Transport => "transport",
        ErrorKind::Timeout => "timeout",
        ErrorKind::InvalidResponse => "invalid_response",
        ErrorKind::Truncated => "truncated",
        ErrorKind::ReplayMismatch => "replay_mismatch",
        ErrorKind::DuplicateNode => "duplicate_node",
        ErrorKind::UnknownNode => "unknown_node",
        ErrorKind::InputTypeMismatch => "input_type_mismatch",
        ErrorKind::RunNotReady => "run_not_ready",
        ErrorKind::NodeExecution => "node_execution",
        ErrorKind::StateDeltaRejected => "state_delta_rejected",
    }
}
