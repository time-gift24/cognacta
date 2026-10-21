use rustls_platform_verifier::BuilderVerifierExt;

use crate::{
    Error,
    config::{Config, Signal},
};
use opentelemetry::KeyValue;
use opentelemetry_http::{HttpClient, HttpError};
use opentelemetry_otlp::{WithExportConfig, WithHttpConfig};
use opentelemetry_proto::tonic::collector::{
    logs::v1::ExportLogsServiceResponse, metrics::v1::ExportMetricsServiceResponse,
    trace::v1::ExportTraceServiceResponse,
};
use opentelemetry_sdk::{
    Resource,
    logs::{BatchLogProcessor, SdkLoggerProvider},
    metrics::{PeriodicReader, SdkMeterProvider, Stream, Temporality},
    trace::{BatchSpanProcessor, SdkTracerProvider},
};
use prost::Message;
use std::{
    io::{Read, Write},
    sync::{
        Arc,
        atomic::{AtomicU64, Ordering},
    },
    time::{Duration, Instant},
};
use tracing_appender::non_blocking::NonBlocking;

#[derive(Default)]
pub(crate) struct Remote {
    pub logs: Option<SdkLoggerProvider>,
    pub traces: Option<SdkTracerProvider>,
    pub metrics: Option<SdkMeterProvider>,
}

impl Remote {
    pub fn build(config: Config, service: String, writer: NonBlocking) -> Result<Self, Error> {
        let resource = Resource::builder_empty()
            .with_attributes(config.resource)
            .with_attributes([
                KeyValue::new("service.name", service),
                KeyValue::new("service.version", env!("CARGO_PKG_VERSION")),
                KeyValue::new("service.instance.id", uuid::Uuid::new_v4().to_string()),
            ])
            .build();
        let diagnostic = Arc::new(Diagnostic {
            writer,
            started: Instant::now(),
            last: AtomicU64::new(0),
        });
        let [logs, traces, metrics] = config.signals;
        // Build exporters before starting SDK providers: failure leaves no partially active backend.
        let logs = logs
            .map(|s| {
                let client = Client::new(&s, diagnostic.clone(), |body| {
                    ExportLogsServiceResponse::decode(body).map_or(true, |response| {
                        response.partial_success.is_some_and(|partial| {
                            partial.rejected_log_records > 0 || !partial.error_message.is_empty()
                        })
                    })
                })?;
                opentelemetry_otlp::LogExporter::builder()
                    .with_http()
                    .with_endpoint(s.endpoint)
                    .with_timeout(s.timeout)
                    .with_protocol(opentelemetry_otlp::Protocol::HttpBinary)
                    .with_http_client(client)
                    .with_retry_policy(opentelemetry_otlp::RetryPolicy::disabled())
                    .with_max_request_body_size(4 * 1024 * 1024)
                    .build()
                    .map_err(build_error)
            })
            .transpose()?;
        let traces = traces
            .map(|s| {
                let client = Client::new(&s, diagnostic.clone(), |body| {
                    ExportTraceServiceResponse::decode(body).map_or(true, |response| {
                        response.partial_success.is_some_and(|partial| {
                            partial.rejected_spans > 0 || !partial.error_message.is_empty()
                        })
                    })
                })?;
                opentelemetry_otlp::SpanExporter::builder()
                    .with_http()
                    .with_endpoint(s.endpoint)
                    .with_timeout(s.timeout)
                    .with_protocol(opentelemetry_otlp::Protocol::HttpBinary)
                    .with_http_client(client)
                    .with_retry_policy(opentelemetry_otlp::RetryPolicy::disabled())
                    .with_max_request_body_size(4 * 1024 * 1024)
                    .build()
                    .map_err(build_error)
            })
            .transpose()?;
        let metrics = metrics
            .map(|s| {
                let client = Client::new(&s, diagnostic, |body| {
                    ExportMetricsServiceResponse::decode(body).map_or(true, |response| {
                        response.partial_success.is_some_and(|partial| {
                            partial.rejected_data_points > 0 || !partial.error_message.is_empty()
                        })
                    })
                })?;
                opentelemetry_otlp::MetricExporter::builder()
                    .with_http()
                    .with_endpoint(s.endpoint)
                    .with_timeout(s.timeout)
                    .with_protocol(opentelemetry_otlp::Protocol::HttpBinary)
                    .with_http_client(client)
                    .with_retry_policy(opentelemetry_otlp::RetryPolicy::disabled())
                    .with_max_request_body_size(4 * 1024 * 1024)
                    .with_temporality(Temporality::Cumulative)
                    .build()
                    .map_err(build_error)
            })
            .transpose()?;
        Ok(Self {
            logs: logs.map(|e| {
                SdkLoggerProvider::builder()
                    .with_resource(resource.clone())
                    .with_log_processor(
                        BatchLogProcessor::builder(e)
                            .with_batch_config(
                                opentelemetry_sdk::logs::BatchConfigBuilder::default()
                                    .with_max_queue_size(2048)
                                    .with_max_export_batch_size(512)
                                    .with_scheduled_delay(Duration::from_secs(1))
                                    .build(),
                            )
                            .build(),
                    )
                    .build()
            }),
            traces: traces.map(|e| {
                SdkTracerProvider::builder()
                    .with_resource(resource.clone())
                    .with_sampler(config.sampler)
                    .with_span_processor(
                        BatchSpanProcessor::builder(e)
                            .with_batch_config(
                                opentelemetry_sdk::trace::BatchConfigBuilder::default()
                                    .with_max_queue_size(2048)
                                    .with_max_export_batch_size(512)
                                    .with_scheduled_delay(Duration::from_secs(1))
                                    .build(),
                            )
                            .build(),
                    )
                    .build()
            }),
            metrics: metrics.map(|e| {
                SdkMeterProvider::builder()
                    .with_resource(resource)
                    .with_reader(
                        PeriodicReader::builder(e)
                            .with_interval(Duration::from_secs(30))
                            .build(),
                    )
                    .with_view(|_| Stream::builder().with_cardinality_limit(2000).build().ok())
                    .build()
            }),
        })
    }

    pub fn shutdown(&self, deadline: Instant) -> Result<(), Error> {
        let mut result = Ok(());
        // Continue after a failure so each independent output gets its remaining budget.
        for (component, status) in [
            (
                "traces",
                self.traces.as_ref().map(|p| {
                    p.shutdown_with_timeout(deadline.saturating_duration_since(Instant::now()))
                }),
            ),
            (
                "logs",
                self.logs.as_ref().map(|p| {
                    p.shutdown_with_timeout(deadline.saturating_duration_since(Instant::now()))
                }),
            ),
            (
                "metrics",
                self.metrics.as_ref().map(|p| {
                    p.shutdown_with_timeout(deadline.saturating_duration_since(Instant::now()))
                }),
            ),
        ] {
            if let Some(Err(source)) = status {
                result = Err(Error::Shutdown {
                    component,
                    source: Box::new(source),
                });
            }
        }
        result
    }
}

fn build_error(source: opentelemetry_otlp::ExporterBuildError) -> Error {
    Error::Initialization {
        component: "OTLP exporter",
        source: Box::new(source),
    }
}

struct Diagnostic {
    writer: NonBlocking,
    started: Instant,
    last: AtomicU64,
}
impl Diagnostic {
    fn failed(&self) {
        let now = self.started.elapsed().as_secs().saturating_add(1);
        let previous = self.last.load(Ordering::Relaxed);
        if (previous == 0 || now.saturating_sub(previous) >= 60)
            && self
                .last
                .compare_exchange(previous, now, Ordering::Relaxed, Ordering::Relaxed)
                .is_ok()
        {
            let _ = writeln!(
                self.writer.clone(),
                "WARN collector.export_failed: 遥测发送失败，允许丢弃"
            );
        }
    }
}

// The HTTP boundary also caps response bodies and prevents raw SDK errors from reaching logs.
struct Client {
    inner: reqwest::blocking::Client,
    headers: http::HeaderMap,
    diagnostic: Arc<Diagnostic>,
    response_has_warning: fn(&[u8]) -> bool,
}
impl std::fmt::Debug for Client {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("TelemetryHttpClient")
    }
}
impl Client {
    fn new(
        signal: &Signal,
        diagnostic: Arc<Diagnostic>,
        response_has_warning: fn(&[u8]) -> bool,
    ) -> Result<Self, Error> {
        let mut tls = rustls::ClientConfig::builder_with_provider(
            rustls::crypto::ring::default_provider().into(),
        )
        .with_safe_default_protocol_versions()
        .and_then(|builder| builder.with_platform_verifier())
        .map_err(|source| Error::Initialization {
            component: "telemetry TLS",
            source: Box::new(source),
        })?
        .with_no_client_auth();
        tls.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];
        let inner = reqwest::blocking::Client::builder()
            .tls_backend_preconfigured(tls)
            .timeout(signal.timeout)
            .connect_timeout(signal.timeout)
            .redirect(reqwest::redirect::Policy::none())
            .retry(reqwest::retry::never())
            .build()
            .map_err(|source| Error::Initialization {
                component: "telemetry HTTP",
                source: Box::new(source),
            })?;
        let mut headers = http::HeaderMap::new();
        for (key, value) in &signal.headers {
            let name = http::HeaderName::from_bytes(key.as_bytes()).map_err(|source| {
                Error::Initialization {
                    component: "telemetry headers",
                    source: Box::new(source),
                }
            })?;
            let mut value =
                http::HeaderValue::from_str(value).map_err(|source| Error::Initialization {
                    component: "telemetry headers",
                    source: Box::new(source),
                })?;
            value.set_sensitive(true);
            headers.insert(name, value);
        }
        headers.insert(
            http::header::CONTENT_TYPE,
            http::HeaderValue::from_static("application/x-protobuf"),
        );
        Ok(Self {
            inner,
            headers,
            diagnostic,
            response_has_warning,
        })
    }
    fn send(
        &self,
        request: http::Request<bytes::Bytes>,
    ) -> Result<http::Response<bytes::Bytes>, HttpError> {
        let response = self
            .inner
            .post(request.uri().to_string())
            .headers(self.headers.clone())
            .body(request.into_body())
            .send()?;
        let mut result = http::Response::builder().status(response.status());
        *result
            .headers_mut()
            .ok_or_else(|| std::io::Error::other("response headers unavailable"))? =
            response.headers().clone();
        let mut bytes = Vec::new();
        response.take(65537).read_to_end(&mut bytes)?;
        if bytes.len() > 65536 {
            return Err(std::io::Error::other("telemetry response too large").into());
        }
        Ok(result.body(bytes.into())?)
    }
}
#[async_trait::async_trait]
impl HttpClient for Client {
    async fn send_bytes(
        &self,
        request: http::Request<bytes::Bytes>,
    ) -> Result<http::Response<bytes::Bytes>, HttpError> {
        let result = self.send(request);
        if !result.as_ref().is_ok_and(|response| {
            response.status().is_success() && !(self.response_has_warning)(response.body())
        }) {
            self.diagnostic.failed();
        }
        result
    }
}
