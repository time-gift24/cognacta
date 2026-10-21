#[path = "../../cognacta-collector/tests/support/mod.rs"]
mod support;
#[cfg(feature = "cognacta-test")]
use opentelemetry_proto::tonic::collector::{
    logs::v1::ExportLogsServiceRequest, metrics::v1::ExportMetricsServiceRequest,
    trace::v1::ExportTraceServiceRequest,
};
#[cfg(feature = "cognacta-test")]
use prost::Message as _;
use std::process::{Command, Stdio};
#[cfg(feature = "cognacta-test")]
use std::{
    io::Write,
    time::{Duration, Instant},
};
use support::*;

fn command() -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_cognacta-cli"));
    clean_env(&mut command);
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command
}
#[test]
fn normal_command_and_config_errors_preserve_exit_behavior() {
    let receiver = Receiver::new(false, None);
    let mut plain = command();
    let reference = finish(plain.spawn().unwrap());
    assert!(reference.status.success());
    let mut invalid = command();
    invalid
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint)
        .env("OTEL_EXPORTER_OTLP_PROTOCOL", "invalid");
    let output = finish(invalid.spawn().unwrap());
    assert_eq!(reference.stdout, output.stdout);
    assert_eq!(reference.status, output.status);
    assert!(String::from_utf8_lossy(&output.stderr).contains("collector.local_only"));
    if let Ok(request) = receiver.requests.try_recv() {
        panic!(
            "unexpected request {} {} {:?}",
            request.path, request.headers, request.body
        );
    }
    let mut missing = command();
    missing.arg("--not-an-option");
    let baseline = finish(missing.spawn().unwrap());
    let mut remote = command();
    remote
        .arg("--not-an-option")
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:1");
    let output = finish(remote.spawn().unwrap());
    assert_eq!(baseline.status, output.status);
    assert_eq!(baseline.stdout, output.stdout);
}

#[cfg(feature = "cognacta-test")]
fn response(case: &str) -> String {
    if case == "initial_error" {
        let body = r#"{"error":{"message":"SECRET_BODY"}}"#;
        return format!(
            "HTTP/1.1 401 Unauthorized\r\nX-Request-Id: upstream-42\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
    }
    let chunk = serde_json::json!({"id":"response-42","model":"model","choices":[{"index":0,"delta":{"content":"SECRET_REPLY"},"finish_reason":null}]});
    let mut sse = format!("data: {chunk}\n\n");
    if case == "success" {
        let final_chunk = serde_json::json!({"id":"response-42","model":"model","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":10,"total_tokens":13}});
        sse.push_str(&format!("data: {final_chunk}\n\ndata: [DONE]\n\n"));
    }
    format!(
        "HTTP/1.1 200 OK\r\nX-Request-Id: upstream-42\r\nContent-Type: text/event-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{sse}",
        sse.len()
    )
}

#[cfg(feature = "cognacta-test")]
#[test]
fn real_model_results_and_private_content_are_independent_of_telemetry_health() {
    for case in ["success", "initial_error", "stream_error"] {
        let mut reference = None;
        for monitoring in ["local", "remote", "unavailable", "invalid", "stalled"] {
            let model = Receiver::new(false, Some(response(case)));
            let telemetry = Receiver::new(monitoring == "stalled", None);
            let config = std::env::temp_dir().join(format!(
                "cognacta-observation-{}-{case}-{monitoring}.toml",
                std::process::id()
            ));
            std::fs::write(
                &config,
                format!(
                    r#"[[providers]]
name = "fixture"
base_url = "{}/v1"
api_key = "SECRET_MODEL_KEY"
[[models]]
provider = "fixture"
name = "model"
protocol = "openai.chat-completions"
"#,
                    model.endpoint
                ),
            )
            .unwrap();
            let mut cmd = command();
            cmd.args(["chat", "--config"]).arg(&config).args([
                "--provider",
                "fixture",
                "--model",
                "model",
            ]);
            match monitoring {
                "remote" | "stalled" => {
                    cmd.env("OTEL_EXPORTER_OTLP_ENDPOINT", &telemetry.endpoint)
                        .env(
                            "OTEL_EXPORTER_OTLP_HEADERS",
                            "authorization=SECRET_TELEMETRY",
                        );
                }
                "unavailable" => {
                    cmd.env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:1");
                }
                "invalid" => {
                    cmd.env(
                        "OTEL_EXPORTER_OTLP_ENDPOINT",
                        "https://user:SECRET_TELEMETRY@example.test",
                    );
                }
                _ => {}
            }
            let start = Instant::now();
            let mut child = cmd.spawn().unwrap();
            child
                .stdin
                .take()
                .unwrap()
                .write_all(b"SECRET_PROMPT\n/exit\n")
                .unwrap();
            let output = finish(child);
            std::fs::remove_file(config).unwrap();
            if monitoring == "stalled" {
                assert!(start.elapsed() < Duration::from_secs(5));
            }
            assert_eq!(output.status.success(), case == "success", "{output:?}");
            let current = (output.status.code(), output.stdout.clone());
            if let Some(reference) = &reference {
                assert_eq!(&current, reference);
            } else {
                reference = Some(current);
            }
            let request = model.requests.recv_timeout(LIMIT).unwrap();
            assert_eq!(request.path, "/v1/chat/completions");
            assert!(request.headers.contains("SECRET_MODEL_KEY"));
            assert!(!request.headers.contains("SECRET_TELEMETRY"));
            assert!(String::from_utf8_lossy(&request.body).contains("SECRET_PROMPT"));
            assert!(model.requests.try_recv().is_err());
            let mut dump = String::from_utf8_lossy(&output.stderr).into_owned();
            assert!(dump.matches("collector.export_failed").count() <= 1);
            if monitoring == "remote" {
                let requests: Vec<_> = telemetry.requests.try_iter().collect();
                let mut spans = vec![];
                let mut logs = vec![];
                let mut metrics = vec![];
                for request in requests {
                    assert!(request.headers.contains("SECRET_TELEMETRY"));
                    assert!(!request.headers.contains("SECRET_MODEL_KEY"));
                    match request.path.as_str() {
                        "/v1/traces" => {
                            for r in ExportTraceServiceRequest::decode(request.body.as_slice())
                                .unwrap()
                                .resource_spans
                            {
                                for s in r.scope_spans {
                                    spans.extend(s.spans)
                                }
                            }
                        }
                        "/v1/logs" => {
                            for r in ExportLogsServiceRequest::decode(request.body.as_slice())
                                .unwrap()
                                .resource_logs
                            {
                                for s in r.scope_logs {
                                    logs.extend(s.log_records)
                                }
                            }
                        }
                        "/v1/metrics" => {
                            for r in ExportMetricsServiceRequest::decode(request.body.as_slice())
                                .unwrap()
                                .resource_metrics
                            {
                                for s in r.scope_metrics {
                                    metrics.extend(s.metrics)
                                }
                            }
                        }
                        path => panic!("unexpected {path}"),
                    }
                }
                let generation = spans.iter().find(|s| s.name == "generation").unwrap();
                let http = spans.iter().find(|s| s.name == "provider.http").unwrap();
                assert_eq!(http.parent_span_id, generation.span_id);
                assert_eq!(http.trace_id, generation.trace_id);
                assert!(logs.iter().any(|l| l.trace_id == generation.trace_id));
                let finished = metrics
                    .iter()
                    .find(|m| m.name == "cognacta.generation.finished")
                    .unwrap();
                let opentelemetry_proto::tonic::metrics::v1::metric::Data::Sum(sum) =
                    finished.data.as_ref().unwrap()
                else {
                    panic!("sum expected")
                };
                assert_eq!(sum.data_points.len(), 1);
                assert_eq!(
                    sum.data_points[0].value,
                    Some(
                        opentelemetry_proto::tonic::metrics::v1::number_data_point::Value::AsInt(1)
                    )
                );
                assert!(format!("{:?}", sum.data_points[0].attributes).contains(
                    if case == "success" {
                        "success"
                    } else {
                        "error"
                    }
                ));
                dump.push_str(&format!("{spans:?}{logs:?}{metrics:?}"));
            }
            for secret in [
                "SECRET_PROMPT",
                "SECRET_REPLY",
                "SECRET_BODY",
                "SECRET_MODEL_KEY",
                "SECRET_TELEMETRY",
            ] {
                assert!(!dump.contains(secret), "{monitoring} leaked {secret}");
            }
        }
    }
}

#[cfg(feature = "cognacta-test")]
#[test]
fn closed_output_cancels_consumption_and_config_failure_does_not_create_generation() {
    use std::io::Read;
    let model = Receiver::new(false, Some(response("success")));
    let telemetry = Receiver::new(false, None);
    let config = std::env::temp_dir().join(format!("cognacta-cancel-{}.toml", std::process::id()));
    std::fs::write(
        &config,
        format!(
            r#"[[providers]]
name = "fixture"
base_url = "{}"
[[models]]
provider = "fixture"
name = "model"
protocol = "openai.chat-completions"
"#,
            model.endpoint
        ),
    )
    .unwrap();
    let mut cmd = command();
    cmd.args(["chat", "--config"])
        .arg(&config)
        .args(["--provider", "fixture", "--model", "model"])
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", &telemetry.endpoint);
    let mut child = cmd.spawn().unwrap();
    let mut stdout = child.stdout.take().unwrap();
    let mut prompt = [0; 2];
    stdout.read_exact(&mut prompt).unwrap();
    assert_eq!(&prompt, b"> ");
    drop(stdout);
    child
        .stdin
        .take()
        .unwrap()
        .write_all(b"SECRET_PROMPT\n")
        .unwrap();
    let output = finish(child);
    assert!(!output.status.success());
    std::fs::remove_file(&config).unwrap();
    let requests: Vec<_> = telemetry.requests.try_iter().collect();
    let metric = requests.iter().find(|r| r.path == "/v1/metrics").unwrap();
    let data = ExportMetricsServiceRequest::decode(metric.body.as_slice()).unwrap();
    let dump = format!("{data:?}");
    assert!(dump.contains("cancelled"));
    assert!(!dump.contains("SECRET_PROMPT"));
    assert!(String::from_utf8_lossy(&output.stderr).contains("generation.cancelled"));
    let model_requests: Vec<_> = model.requests.try_iter().collect();
    assert_eq!(model_requests.len(), 1);

    let output = finish(cmd.spawn().unwrap());
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("configuration.failed"));
    let requests: Vec<_> = telemetry.requests.try_iter().collect();
    assert!(!requests.is_empty());
    assert!(requests.iter().all(|r| r.path == "/v1/logs"));
}
