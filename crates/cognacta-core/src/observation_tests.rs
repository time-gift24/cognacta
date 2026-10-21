use super::*;
use crate::{
    AssistantMessage, Finish, FinishReason, GenerationMetadata, InputPart, Message, PartDelta,
    PartialGeneration, Usage,
};
use futures_util::{StreamExt, stream};
use opentelemetry::metrics::MeterProvider;
use opentelemetry_sdk::metrics::{
    InMemoryMetricExporter, SdkMeterProvider,
    data::{AggregatedMetrics, MetricData},
};
use std::sync::Mutex;

struct Fake {
    events: Mutex<Option<Vec<Result<GenerationEvent, Error>>>>,
    initial: Option<ErrorKind>,
    pending: bool,
}
#[async_trait]
impl Protocol for Fake {
    fn name(&self) -> &'static str {
        "test.observation"
    }
    async fn generate(
        &self,
        _: &Provider,
        _: &str,
        _: GenerationRequest,
    ) -> Result<GenerationResponse, Error> {
        if let Some(kind) = self.initial {
            Err(Error::new(kind, "original"))
        } else {
            Ok(response())
        }
    }
    async fn stream(
        &self,
        _: &Provider,
        _: &str,
        _: GenerationRequest,
    ) -> Result<EventStream, Error> {
        if self.pending {
            std::future::pending::<()>().await;
        }
        if let Some(kind) = self.initial {
            return Err(Error::new(kind, "original"));
        }
        Ok(Box::pin(stream::iter(
            self.events.lock().unwrap().take().unwrap(),
        )))
    }
}
fn response() -> GenerationResponse {
    GenerationResponse::new(
        AssistantMessage::text("private response"),
        Finish::new(FinishReason::OutputLimit, None),
        Usage::builder().input_tokens(0).output_tokens(10).build(),
        GenerationMetadata::builder()
            .provider_name("p")
            .protocol_name("test.observation")
            .requested_model("m")
            .request_id("request\n42")
            .build(),
    )
}
fn request() -> GenerationRequest {
    GenerationRequest::new(vec![Message::User(vec![InputPart::Text(
        "private prompt".into(),
    )])])
    .unwrap()
}
fn delta(text: &str) -> Result<GenerationEvent, Error> {
    Ok(GenerationEvent::Delta {
        part: 0,
        delta: PartDelta::Text(text.into()),
    })
}
fn setup(
    events: Vec<Result<GenerationEvent, Error>>,
    initial: Option<ErrorKind>,
    pending: bool,
) -> (Model, SdkMeterProvider, InMemoryMetricExporter) {
    let exporter = InMemoryMetricExporter::default();
    let provider = SdkMeterProvider::builder()
        .with_periodic_exporter(exporter.clone())
        .build();
    let mut model = Model::new(
        Arc::new(Provider::new("p", "https://example.test").unwrap()),
        "m",
        Arc::new(Fake {
            events: Mutex::new(Some(events)),
            initial,
            pending,
        }),
    )
    .unwrap();
    model.metrics = Arc::new(Metrics::new(provider.meter("test")));
    (model, provider, exporter)
}
fn number(
    provider: &SdkMeterProvider,
    exporter: &InMemoryMetricExporter,
    suffix: &str,
    attribute: Option<(&str, &str)>,
) -> i128 {
    exporter.reset();
    provider.force_flush().unwrap();
    let mut total = 0;
    for resource in exporter.get_finished_metrics().unwrap() {
        for scope in resource.scope_metrics() {
            for metric in scope.metrics() {
                if metric.name() != format!("cognacta.generation.{suffix}") {
                    continue;
                }
                let matches = |attrs: Vec<&opentelemetry::KeyValue>| {
                    attribute.is_none_or(|(k, v)| {
                        attrs
                            .iter()
                            .any(|a| a.key.as_str() == k && a.value.to_string() == v)
                    })
                };
                match metric.data() {
                    AggregatedMetrics::U64(MetricData::Sum(sum)) => {
                        for point in sum.data_points() {
                            if matches(point.attributes().collect()) {
                                total += i128::from(point.value());
                            }
                        }
                    }
                    AggregatedMetrics::I64(MetricData::Sum(sum)) => {
                        for point in sum.data_points() {
                            if matches(point.attributes().collect()) {
                                total += i128::from(point.value());
                            }
                        }
                    }
                    AggregatedMetrics::F64(MetricData::Histogram(hist)) => {
                        for point in hist.data_points() {
                            if matches(point.attributes().collect()) {
                                total += i128::from(point.count());
                            }
                        }
                    }
                    _ => panic!("unexpected aggregation"),
                }
            }
        }
    }
    total
}

#[tokio::test]
async fn streamed_completion_settles_latest_usage_once_and_drop_does_not_cancel() {
    let (model, p, e) = setup(
        vec![
            delta(""),
            Ok(GenerationEvent::Usage(
                Usage::builder().output_tokens(5).build(),
            )),
            delta("a"),
            Ok(GenerationEvent::Usage(
                Usage::builder().output_tokens(10).build(),
            )),
            delta("b"),
            Ok(GenerationEvent::Completed(response())),
        ],
        None,
        false,
    );
    let mut events = model.stream(request()).await.unwrap();
    assert_eq!(number(&p, &e, "in_flight", None), 1);
    assert_eq!(number(&p, &e, "finished", None), 0);
    assert!(matches!(
        events.next().await,
        Some(Ok(GenerationEvent::Delta { .. }))
    ));
    assert_eq!(number(&p, &e, "time_to_first_text", None), 0);
    while !matches!(events.next().await, Some(Ok(GenerationEvent::Completed(_)))) {}
    drop(events);
    assert_eq!(number(&p, &e, "started", None), 1);
    assert_eq!(number(&p, &e, "finished", Some(("outcome", "success"))), 1);
    assert_eq!(
        number(&p, &e, "finished", Some(("outcome", "cancelled"))),
        0
    );
    assert_eq!(number(&p, &e, "in_flight", None), 0);
    assert_eq!(number(&p, &e, "duration", None), 1);
    assert_eq!(number(&p, &e, "time_to_first_text", None), 1);
    assert_eq!(number(&p, &e, "tokens", Some(("token.type", "output"))), 10);
    assert_eq!(
        number(&p, &e, "usage_reports", Some(("token.type", "input"))),
        1
    );
}

#[tokio::test]
async fn errors_cancellation_eof_and_no_text_preserve_business_contract() {
    for (mode, expected) in [
        ("initial", "error"),
        ("mid", "error"),
        ("eof", "error"),
        ("cancel", "cancelled"),
        ("request_cancel", "cancelled"),
        ("no_text", "success"),
    ] {
        let events = match mode {
            "mid" => vec![
                delta("part"),
                Err(Error::new(ErrorKind::Timeout, "original").with_partial(
                    PartialGeneration::new(vec![], Usage::builder().output_tokens(12).build()),
                )),
            ],
            "no_text" => vec![Ok(GenerationEvent::Completed(response()))],
            "cancel" => vec![Ok(GenerationEvent::Usage(
                Usage::builder().output_tokens(4).build(),
            ))],
            _ => vec![],
        };
        let (model, p, e) = setup(
            events,
            (mode == "initial").then_some(ErrorKind::Authentication),
            mode == "request_cancel",
        );
        if mode == "request_cancel" {
            let mut future = Box::pin(model.stream(request()));
            assert!(futures_util::poll!(&mut future).is_pending());
            drop(future);
        } else {
            match model.stream(request()).await {
                Err(error) => {
                    assert_eq!(mode, "initial");
                    assert_eq!(error.message(), "original");
                }
                Ok(mut stream) => {
                    if mode == "cancel" {
                        assert!(stream.next().await.is_some());
                        drop(stream);
                    } else {
                        while let Some(event) = stream.next().await {
                            if let Err(error) = event {
                                assert_eq!(error.message(), "original");
                                assert_eq!(error.kind(), ErrorKind::Timeout);
                            }
                        }
                    }
                }
            }
        }
        assert_eq!(
            number(&p, &e, "finished", Some(("outcome", expected))),
            1,
            "{mode}"
        );
        assert_eq!(number(&p, &e, "finished", None), 1, "{mode}");
        assert_eq!(number(&p, &e, "in_flight", None), 0, "{mode}");
        assert_eq!(number(&p, &e, "duration", None), 1, "{mode}");
        assert_eq!(
            number(&p, &e, "time_to_first_text", None),
            i128::from(mode == "mid")
        );
        if mode == "mid" {
            assert_eq!(number(&p, &e, "tokens", None), 12);
        }
        if mode == "cancel" {
            assert_eq!(number(&p, &e, "tokens", None), 4);
            assert_eq!(
                number(&p, &e, "usage_reports", Some(("token.type", "input"))),
                0
            );
        }
        if mode == "eof" {
            assert_eq!(
                number(&p, &e, "finished", Some(("error.kind", "truncated"))),
                1
            );
        }
    }
}
#[tokio::test]
async fn unpolled_future_is_not_counted_and_generate_is_observed() {
    let (model, p, e) = setup(vec![], None, false);
    drop(model.stream(request()));
    drop(model.generate(request()));
    assert_eq!(number(&p, &e, "started", None), 0);
    assert_eq!(
        model
            .generate(request())
            .await
            .unwrap()
            .assistant()
            .text_content(),
        "private response"
    );
    assert_eq!(number(&p, &e, "finished", Some(("outcome", "success"))), 1);
    assert_eq!(number(&p, &e, "time_to_first_text", None), 0);
    let (model, p, e) = setup(vec![], Some(ErrorKind::Unsupported), false);
    assert_eq!(
        model.generate(request()).await.unwrap_err().kind(),
        ErrorKind::Unsupported
    );
    assert_eq!(
        number(&p, &e, "finished", Some(("error.kind", "unsupported"))),
        1
    );
}
