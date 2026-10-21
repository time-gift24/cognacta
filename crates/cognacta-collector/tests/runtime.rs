mod support;
use cognacta_collector::{Collector, Error};
use cognacta_core::{
    AssistantMessage, EventStream, Finish, FinishReason, GenerationEvent, GenerationMetadata,
    GenerationRequest, GenerationResponse, InputPart, Message, Model, PartDelta, Protocol,
    Provider, Usage,
};
use futures_util::{StreamExt, stream};
use opentelemetry_proto::tonic::{
    collector::{
        logs::v1::ExportLogsServiceRequest, metrics::v1::ExportMetricsServiceRequest,
        trace::v1::ExportTraceServiceRequest,
    },
    metrics::v1::{metric::Data, number_data_point::Value},
};
use prost::Message as _;
use std::{
    io::{BufRead, BufReader, Write},
    process::{Command, Stdio},
    sync::Arc,
    time::{Duration, Instant},
};
use support::*;

struct Echo;
#[async_trait::async_trait]
impl Protocol for Echo {
    fn name(&self) -> &'static str {
        "test.echo"
    }
    async fn generate(
        &self,
        p: &Provider,
        m: &str,
        _: GenerationRequest,
    ) -> Result<GenerationResponse, cognacta_core::Error> {
        Ok(GenerationResponse::new(
            AssistantMessage::text("SECRET_REPLY"),
            Finish::new(FinishReason::Stop, None),
            Usage::builder().input_tokens(0).output_tokens(10).build(),
            GenerationMetadata::builder()
                .provider_name(p.name())
                .protocol_name(self.name())
                .requested_model(m)
                .request_id("upstream-42")
                .build(),
        ))
    }
    async fn stream(
        &self,
        p: &Provider,
        m: &str,
        r: GenerationRequest,
    ) -> Result<EventStream, cognacta_core::Error> {
        let response = self.generate(p, m, r).await?;
        Ok(Box::pin(stream::iter(vec![
            Ok(GenerationEvent::Started(response.metadata().clone())),
            Ok(GenerationEvent::Delta {
                part: 0,
                delta: PartDelta::Text("SECRET_REPLY".into()),
            }),
            Ok(GenerationEvent::Usage(
                Usage::builder().output_tokens(5).build(),
            )),
            Ok(GenerationEvent::Completed(response)),
        ])))
    }
}

#[test]
fn child() {
    let Ok(mode) = std::env::var("COGNACTA_OBSERVATION_CHILD") else {
        return;
    };
    assert!(rustls::crypto::CryptoProvider::get_default().is_none());
    if mode == "host" {
        tracing::subscriber::set_global_default(
            tracing_subscriber::fmt()
                .with_writer(std::io::stderr)
                .finish(),
        )
        .unwrap();
        assert!(matches!(
            Collector::init_from_env("fixture"),
            Err(Error::AlreadyInitialized { .. })
        ));
        tracing::warn!("host still active");
        return;
    }
    if mode == "invalid_service" {
        assert!(matches!(
            Collector::init_from_env(" \n"),
            Err(Error::InvalidConfig { .. })
        ));
        return;
    }
    let before = opentelemetry::global::meter("before")
        .u64_counter("before.calls")
        .build();
    let collector = if mode == "uninitialized" {
        None
    } else {
        Some(Collector::init_from_env("fixture").unwrap())
    };
    assert!(rustls::crypto::CryptoProvider::get_default().is_none());
    before.add(1, &[]);
    if mode == "duplicate" {
        assert!(matches!(
            Collector::init_from_env("fixture"),
            Err(Error::AlreadyInitialized { .. })
        ));
    }
    let model = Model::new(
        Arc::new(Provider::new("fixture-provider", "http://example.test").unwrap()),
        "fixture-model",
        Arc::new(Echo),
    )
    .unwrap();
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let request = GenerationRequest::new(vec![Message::User(vec![InputPart::Text(
                "SECRET_PROMPT".into(),
            )])])
            .unwrap();
            let mut events = model.stream(request).await.unwrap();
            while let Some(event) = events.next().await {
                let event = event.unwrap();
                if mode == "cancel" && matches!(event, GenerationEvent::Delta { .. }) {
                    break;
                }
            }
        });
    if mode == "cardinality" {
        let counter = opentelemetry::global::meter("fixture")
            .u64_counter("fixture.cardinality")
            .build();
        for id in 0..2100 {
            counter.add(1, &[opentelemetry::KeyValue::new("id", id)]);
        }
    }
    if mode == "backpressure" {
        let text = "x".repeat(1024);
        for _ in 0..10000 {
            tracing::warn!(target:"cognacta_core", padding=text, "pressure");
        }
        println!("business-progress");
        std::io::stdout().flush().unwrap();
        let mut ack = String::new();
        std::io::stdin().read_line(&mut ack).unwrap();
    }
    if let Some(collector) = collector {
        if mode == "drop" {
            drop(collector);
        } else if mode == "zero" {
            assert!(matches!(
                collector.shutdown(Duration::ZERO),
                Err(Error::ShutdownTimeout { .. })
            ));
        } else if mode == "backpressure" {
            assert!(matches!(
                collector.shutdown(Duration::from_secs(3)),
                Err(Error::ShutdownTimeout { .. })
            ));
        } else {
            collector.shutdown(Duration::from_secs(3)).unwrap();
        }
    }
    println!("business-done");
}
fn command(mode: &str) -> Command {
    let mut command = Command::new(std::env::current_exe().unwrap());
    clean_env(&mut command);
    command
        .args(["--exact", "child", "--nocapture"])
        .env("COGNACTA_OBSERVATION_CHILD", mode)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command
}
fn run(mode: &str, env: &[(&str, &str)]) -> std::process::Output {
    let mut cmd = command(mode);
    cmd.envs(env.iter().copied());
    let output = finish(cmd.spawn().unwrap());
    assert!(output.status.success(), "{output:?}");
    output
}
#[test]
fn no_init_local_conflict_invalid_and_drop_contracts() {
    let receiver = Receiver::new(false, None);
    let output = run(
        "uninitialized",
        &[("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint)],
    );
    assert!(output.stderr.is_empty());
    assert!(receiver.requests.try_recv().is_err());
    for mode in ["local", "duplicate", "drop", "zero"] {
        let output = run(mode, &[]);
        assert!(String::from_utf8_lossy(&output.stdout).contains("business-done"));
        if !matches!(mode, "drop" | "zero") {
            assert!(String::from_utf8_lossy(&output.stderr).contains("generation.completed"));
        }
    }
    let output = run("host", &[]);
    assert!(String::from_utf8_lossy(&output.stderr).contains("host still active"));
    run("invalid_service", &[]);
    let output = run(
        "local",
        &[
            ("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint),
            ("OTEL_EXPORTER_OTLP_PROTOCOL", "SECRET_PROTOCOL"),
            ("RUST_LOG", "bad[filter"),
        ],
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("collector.local_only"));
    assert!(stderr.contains("invalid_filter"));
    assert!(!stderr.contains("SECRET_PROTOCOL"));
    assert!(receiver.requests.try_recv().is_err());
}
#[test]
fn exports_three_signals_with_correlation_usage_and_bounded_attributes() {
    let receiver = Receiver::new(false, None);
    let output = run(
        "cardinality",
        &[
            ("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint),
            (
                "OTEL_EXPORTER_OTLP_HEADERS",
                "authorization=SECRET_TELEMETRY",
            ),
            (
                "OTEL_RESOURCE_ATTRIBUTES",
                "service.name=wrong,service.instance.id=wrong,environment=test",
            ),
        ],
    );
    let requests: Vec<_> = receiver.requests.try_iter().collect();
    let mut logs = vec![];
    let mut spans = vec![];
    let mut metrics = vec![];
    for request in &requests {
        assert!(request.headers.contains("SECRET_TELEMETRY"));
        assert!(!request.headers.contains("SECRET_MODEL_KEY"));
        match request.path.as_str() {
            "/v1/logs" => {
                for resource in ExportLogsServiceRequest::decode(request.body.as_slice())
                    .unwrap()
                    .resource_logs
                {
                    let description = format!("{:?}", resource.resource);
                    assert!(description.contains("fixture"));
                    assert!(!description.contains("wrong"));
                    for scope in resource.scope_logs {
                        logs.extend(scope.log_records);
                    }
                }
            }
            "/v1/traces" => {
                for resource in ExportTraceServiceRequest::decode(request.body.as_slice())
                    .unwrap()
                    .resource_spans
                {
                    for scope in resource.scope_spans {
                        spans.extend(scope.spans);
                    }
                }
            }
            "/v1/metrics" => {
                for resource in ExportMetricsServiceRequest::decode(request.body.as_slice())
                    .unwrap()
                    .resource_metrics
                {
                    for scope in resource.scope_metrics {
                        metrics.extend(scope.metrics);
                    }
                }
            }
            path => panic!("unexpected path {path}"),
        }
    }
    assert!(!logs.is_empty());
    assert_eq!(spans.len(), 1);
    assert_eq!(spans[0].name, "generation");
    assert!(
        logs.iter()
            .all(|log| log.trace_id == spans[0].trace_id && log.span_id == spans[0].span_id)
    );
    for name in [
        "started",
        "finished",
        "in_flight",
        "duration",
        "time_to_first_text",
        "tokens",
        "usage_reports",
    ] {
        assert!(
            metrics
                .iter()
                .any(|m| m.name == format!("cognacta.generation.{name}")),
            "missing {name}"
        );
    }
    assert!(!metrics.iter().any(|m| m.name == "before.calls"));
    let tokens = metrics
        .iter()
        .find(|m| m.name == "cognacta.generation.tokens")
        .unwrap();
    let Some(Data::Sum(sum)) = &tokens.data else {
        panic!("sum expected")
    };
    assert_eq!(
        sum.data_points
            .iter()
            .map(|p| match p.value {
                Some(Value::AsInt(n)) => n,
                _ => panic!("integer expected"),
            })
            .sum::<i64>(),
        10
    );
    let cardinality = metrics
        .iter()
        .find(|m| m.name == "fixture.cardinality")
        .unwrap();
    let Some(Data::Sum(sum)) = &cardinality.data else {
        panic!("sum expected")
    };
    assert!(sum.data_points.len() <= 2001);
    assert_eq!(
        sum.data_points
            .iter()
            .map(|p| match p.value {
                Some(Value::AsInt(n)) => n,
                _ => 0,
            })
            .sum::<i64>(),
        2100
    );
    let dump = format!(
        "{logs:?}{spans:?}{metrics:?}{}",
        String::from_utf8_lossy(&output.stderr)
    );
    for secret in ["SECRET_PROMPT", "SECRET_REPLY", "SECRET_TELEMETRY"] {
        assert!(!dump.contains(secret), "leaked {secret}");
    }
    assert!(!format!("{metrics:?}").contains("upstream-42"));
}
#[test]
fn filters_and_sampling_do_not_reduce_metrics() {
    let receiver = Receiver::new(false, None);
    run(
        "local",
        &[
            ("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint),
            ("RUST_LOG", "warn"),
            ("OTEL_TRACES_SAMPLER", "always_off"),
        ],
    );
    let requests: Vec<_> = receiver.requests.try_iter().collect();
    assert!(requests.iter().any(|r| r.path == "/v1/metrics"));
    assert!(requests.iter().all(|r| r.path == "/v1/metrics"));
    for request in requests {
        for resource in ExportMetricsServiceRequest::decode(request.body.as_slice())
            .unwrap()
            .resource_metrics
        {
            for scope in resource.scope_metrics {
                for metric in scope.metrics {
                    if matches!(
                        metric.name.as_str(),
                        "cognacta.generation.started" | "cognacta.generation.finished"
                    ) {
                        let Some(Data::Sum(sum)) = metric.data else {
                            panic!("sum expected")
                        };
                        assert_eq!(sum.data_points.len(), 1);
                        assert_eq!(sum.data_points[0].value, Some(Value::AsInt(1)));
                    }
                }
            }
        }
    }
}
#[test]
fn partial_success_diagnostics_are_local_safe_and_rate_limited() {
    use opentelemetry_proto::tonic::collector::{
        logs::v1 as logs, metrics::v1 as metrics, trace::v1 as traces,
    };

    for (rejected, message, warnings) in [
        (1, "", 1),
        (0, "SECRET_REJECTION", 1),
        (1, "SECRET_REJECTION", 1),
        (0, "", 0),
    ] {
        let responses = [
            logs::ExportLogsServiceResponse {
                partial_success: Some(logs::ExportLogsPartialSuccess {
                    rejected_log_records: rejected,
                    error_message: message.into(),
                }),
            }
            .encode_to_vec(),
            traces::ExportTraceServiceResponse {
                partial_success: Some(traces::ExportTracePartialSuccess {
                    rejected_spans: rejected,
                    error_message: message.into(),
                }),
            }
            .encode_to_vec(),
            metrics::ExportMetricsServiceResponse {
                partial_success: Some(metrics::ExportMetricsPartialSuccess {
                    rejected_data_points: rejected,
                    error_message: message.into(),
                }),
            }
            .encode_to_vec(),
        ];
        let receivers = responses.map(|body| {
            let mut response = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/x-protobuf\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len()
            ).into_bytes();
            response.extend(body);
            Receiver::with_response_bytes(false, Some(response))
        });
        let endpoints = receivers
            .each_ref()
            .map(|r| format!("{}/custom", r.endpoint));
        let env = [
            ("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT", endpoints[0].as_str()),
            ("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT", endpoints[1].as_str()),
            ("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT", endpoints[2].as_str()),
        ];
        // Check each signal independently, then their shared diagnostic rate limit.
        for enabled in [&env[0..1], &env[1..2], &env[2..3], &env[..]] {
            let output = run("local", enabled);
            let stderr = String::from_utf8_lossy(&output.stderr);
            assert_eq!(
                stderr.matches("collector.export_failed").count(),
                warnings,
                "{enabled:?}: {stderr}"
            );
            assert!(!stderr.contains("SECRET_REJECTION"));
            assert!(String::from_utf8_lossy(&output.stdout).contains("business-done"));
            let requests: Vec<_> = receivers
                .iter()
                .flat_map(|r| r.requests.try_iter())
                .collect();
            assert_eq!(
                requests.len(),
                enabled.len(),
                "must not retry partial acceptance"
            );
            for request in requests {
                assert_eq!(request.path, "/custom");
                let body = String::from_utf8_lossy(&request.body);
                assert!(!body.contains("collector.export_failed"));
                assert!(!body.contains("SECRET_REJECTION"));
            }
        }
    }
}

#[test]
fn stalled_network_and_stderr_do_not_block_business_or_extend_total_shutdown() {
    let receiver = Receiver::new(true, None);
    let mut cmd = command("backpressure");
    cmd.env("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint)
        .env("OTEL_EXPORTER_OTLP_TIMEOUT", "10000");
    let mut child = cmd.spawn().unwrap();
    let stdout = child.stdout.take().unwrap();
    let (tx, rx) = std::sync::mpsc::channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            let _ = tx.send(line.unwrap());
        }
    });
    // stderr intentionally stays unread until the child exits.
    loop {
        if rx.recv_timeout(LIMIT).unwrap() == "business-progress" {
            break;
        }
    }
    receiver.requests.recv_timeout(LIMIT).unwrap();
    let start = Instant::now();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(b"shutdown\n")
        .unwrap();
    let output = finish(child);
    assert!(output.status.success(), "{output:?}");
    assert!(
        start.elapsed() < Duration::from_secs(5),
        "shutdown budget multiplied"
    );
    let lines: Vec<_> = rx.try_iter().collect();
    assert!(lines.iter().any(|l| l == "business-done"));
    assert!(lines.iter().all(|l| !l.contains("Failed to send shutdown")));
}

#[test]
fn cancelled_stream_exports_one_cancelled_terminal() {
    let receiver = Receiver::new(false, None);
    run(
        "cancel",
        &[("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint)],
    );
    let mut found = false;
    for request in receiver
        .requests
        .try_iter()
        .filter(|r| r.path == "/v1/metrics")
    {
        for resource in ExportMetricsServiceRequest::decode(request.body.as_slice())
            .unwrap()
            .resource_metrics
        {
            for scope in resource.scope_metrics {
                for metric in scope.metrics {
                    if metric.name == "cognacta.generation.finished" {
                        let Some(Data::Sum(sum)) = metric.data else {
                            panic!("sum expected")
                        };
                        assert_eq!(sum.data_points.len(), 1);
                        assert_eq!(sum.data_points[0].value, Some(Value::AsInt(1)));
                        assert!(
                            format!("{:?}", sum.data_points[0].attributes).contains("cancelled")
                        );
                        found = true;
                    }
                }
            }
        }
    }
    assert!(found);
}
