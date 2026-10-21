//! All HTTP payloads in this file are hand-written fixtures, not captured provider responses.

#[path = "support/client.rs"]
mod support;

use std::{collections::HashMap, error::Error as _, future::Future, sync::Arc, time::Duration};

use async_trait::async_trait;
use cognacta_core::{
    AssistantMessage, ErrorKind, EventStream, FinishReason, GenerationEvent, GenerationOptions,
    GenerationRequest, InputPart, Message, Model, PartDelta, PartialPart, Protocol, Provider,
};
use cognacta_provider::{
    Error, HeaderAuth, HttpAccess, OpenAiChatCompletions, ProvidersConfig, RequestAuth,
    build_models,
};
use futures_util::{FutureExt, StreamExt};
use reqwest::{Client, Request, header};
use serde_json::{Value, json};
use tokio::{
    io::{AsyncReadExt, AsyncWriteExt},
    net::{TcpListener, TcpStream},
    sync::oneshot,
    time::timeout,
};

const LIMIT: Duration = Duration::from_secs(5);

async fn bounded<T>(future: impl Future<Output = T>) -> T {
    timeout(LIMIT, future)
        .await
        .expect("fixture exceeded five-second bound")
}

fn client() -> Client {
    support::client_builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap()
}

fn user(text: &str) -> Message {
    Message::User(vec![InputPart::Text(text.into())])
}

fn request() -> GenerationRequest {
    GenerationRequest::new(vec![user("你好")]).unwrap()
}

fn configured_models(address: &str, other_address: &str) -> HashMap<(String, String), Model> {
    let config = ProvidersConfig::from_toml(&format!(
        r#"
[[providers]]
name = "unselected"
base_url = "http://{other_address}/unused/"
headers = {{ x-tenant-id = "other-tenant", authorization = "Bearer other-fixture-key" }}
auth = {{ type = "none" }}

[[providers]]
name = "selected"
base_url = "http://{address}/proxy/v1"
headers = {{ x-tenant-id = "fixture-tenant", authorization = "Bearer fixture-key" }}
auth = {{ type = "none" }}

# Model order deliberately reverses provider order; only explicit references bind them.
[[models]]
provider = "selected"
name = "model-a"
protocol = "openai.chat-completions"

[[models]]
provider = "unselected"
name = "model-a"
protocol = "openai.chat-completions"
"#
    ))
    .unwrap();
    let models = build_models(config, client()).unwrap();
    assert_eq!(models.len(), 2);
    models
}

fn configured_model(address: &str) -> Model {
    configured_models(address, "127.0.0.1:1")
        .remove(&("selected".into(), "model-a".into()))
        .unwrap()
}

struct ReceivedRequest {
    head: String,
    body: Value,
}

async fn receive_request(socket: &mut TcpStream) -> ReceivedRequest {
    let mut bytes = Vec::new();
    let header_end = loop {
        let mut chunk = [0_u8; 4096];
        let read = socket.read(&mut chunk).await.unwrap();
        assert!(read > 0, "connection closed before request headers");
        bytes.extend_from_slice(&chunk[..read]);
        if let Some(index) = bytes.windows(4).position(|window| window == b"\r\n\r\n") {
            break index + 4;
        }
        assert!(bytes.len() < 64 * 1024);
    };
    let head = String::from_utf8(bytes[..header_end].to_vec()).unwrap();
    let content_length = head
        .lines()
        .find_map(|line| {
            let (name, value) = line.split_once(':')?;
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse::<usize>().unwrap())
        })
        .unwrap();
    while bytes.len() - header_end < content_length {
        let mut chunk = [0_u8; 4096];
        let read = socket.read(&mut chunk).await.unwrap();
        assert!(read > 0, "connection closed before request body");
        bytes.extend_from_slice(&chunk[..read]);
    }
    ReceivedRequest {
        head,
        body: serde_json::from_slice(&bytes[header_end..header_end + content_length]).unwrap(),
    }
}

async fn start_sse(socket: &mut TcpStream) {
    socket.write_all(b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream; charset=utf-8\r\nTransfer-Encoding: chunked\r\nX-Request-Id: fixture-request\r\n\r\n").await.unwrap();
}

async fn write_chunk(socket: &mut TcpStream, chunk: &[u8]) {
    socket
        .write_all(format!("{:x}\r\n", chunk.len()).as_bytes())
        .await
        .unwrap();
    socket.write_all(chunk).await.unwrap();
    socket.write_all(b"\r\n").await.unwrap();
}

fn chunk(content: &str, finish: Option<&str>) -> String {
    format!(
        "data: {}\n\n",
        json!({
            "id": "fixture-response", "model": "model-a-resolved", "object": "chat.completion.chunk",
            "choices": [{"index": 0, "delta": {"content": content}, "finish_reason": finish}]
        })
    )
}

async fn next(stream: &mut EventStream) -> Option<Result<GenerationEvent, cognacta_core::Error>> {
    bounded(stream.next()).await
}

#[tokio::test]
async fn config_selection_preserves_history_and_delivers_split_unicode_before_done() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let other_listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let mut models = configured_models(
        &listener.local_addr().unwrap().to_string(),
        &other_listener.local_addr().unwrap().to_string(),
    );
    let model = models
        .remove(&("selected".into(), "model-a".into()))
        .unwrap();
    let other_model = models
        .remove(&("unselected".into(), "model-a".into()))
        .unwrap();
    let (first_seen, proceed) = oneshot::channel();
    let server = tokio::spawn(async move {
        let (mut socket, _) = bounded(listener.accept()).await.unwrap();
        let received = receive_request(&mut socket).await;
        assert!(
            received
                .head
                .starts_with("POST /proxy/v1/chat/completions HTTP/1.1\r\n")
        );
        let head = received.head.to_ascii_lowercase();
        assert!(head.contains("authorization: bearer fixture-key\r\n"));
        assert!(head.contains("x-tenant-id: fixture-tenant\r\n"));
        assert!(head.contains("accept: text/event-stream\r\n"));
        assert_eq!(received.body["model"], "model-a");
        assert_eq!(received.body["stream"], true);
        assert_eq!(received.body["n"], 1);
        assert_eq!(received.body["max_tokens"], 64);
        assert_eq!(received.body["temperature"], 0.5);
        assert_eq!(
            received.body["messages"],
            json!([
                {"role": "system", "content": "Keep it brief"},
                {"role": "user", "content": "first"},
                {"role": "assistant", "content": "answer"},
                {"role": "user", "content": "你好"},
            ])
        );
        assert!(received.body.get("tools").is_none());
        start_sse(&mut socket).await;
        // Deliberately split every UTF-8 code point and SSE delimiter across HTTP chunks.
        let first = chunk("你", None);
        for byte in first.as_bytes() {
            write_chunk(&mut socket, &[*byte]).await;
        }
        bounded(proceed).await.unwrap();
        let tail = format!(
            "{}{}data: {{\"choices\":[],\"usage\":{{\"prompt_tokens\":8,\"completion_tokens\":2,\"total_tokens\":10,\"prompt_tokens_details\":{{\"cached_tokens\":0}}}}}}\n\ndata: [DONE]\n\ndata: INVALID TRAILING BYTES\n\n",
            chunk("好", None),
            chunk("", Some("length")),
        );
        write_chunk(&mut socket, tail.as_bytes()).await;
        // Keep the body open until the client closes it after logical completion.
        let mut byte = [0];
        assert_eq!(bounded(socket.read(&mut byte)).await.unwrap(), 0);
        assert!(listener.accept().now_or_never().is_none());
    });
    let request = GenerationRequest::new(vec![
        user("first"),
        Message::Assistant(AssistantMessage::text("answer")),
        user("你好"),
    ])
    .unwrap()
    .with_instructions("Keep it brief")
    .with_options(
        GenerationOptions::builder()
            .max_output_tokens(64)
            .temperature(0.5)
            .build()
            .unwrap(),
    )
    .unwrap();
    let mut events = bounded(model.stream(request)).await.unwrap();
    assert!(matches!(
        next(&mut events).await.unwrap().unwrap(),
        GenerationEvent::Started(_)
    ));
    assert!(matches!(
        next(&mut events).await.unwrap().unwrap(),
        GenerationEvent::PartStarted { part: 0, .. }
    ));
    assert!(
        matches!(next(&mut events).await.unwrap().unwrap(), GenerationEvent::Delta { part: 0, delta: PartDelta::Text(text) } if text == "你")
    );
    first_seen.send(()).unwrap();
    let mut text = String::from("你");
    let mut completed = None;
    let mut usage_events = 0;
    while let Some(event) = next(&mut events).await {
        match event.unwrap() {
            GenerationEvent::Delta {
                delta: PartDelta::Text(delta),
                ..
            } => text.push_str(&delta),
            GenerationEvent::Usage(usage) => {
                usage_events += 1;
                assert_eq!(usage.total_tokens(), Some(10));
            }
            GenerationEvent::Completed(response) => {
                assert!(completed.is_none());
                completed = Some(response);
            }
            GenerationEvent::PartCompleted {
                part: 0,
                content: cognacta_core::OutputPart::Text(text),
            } => assert_eq!(text, "你好"),
            event => panic!("unexpected event: {event:?}"),
        }
    }
    assert_eq!(text, "你好");
    assert_eq!(usage_events, 1);
    let response = completed.unwrap();
    assert_eq!(response.assistant().text_content(), text);
    assert_eq!(response.finish().reason(), FinishReason::OutputLimit);
    assert_eq!(response.usage().total_tokens(), Some(10));
    assert_eq!(response.usage().cache_read_tokens(), Some(0));
    assert_eq!(response.usage().reasoning_tokens(), None);
    assert_eq!(response.metadata().request_id(), Some("fixture-request"));
    assert_eq!(response.metadata().response_id(), Some("fixture-response"));
    assert_eq!(
        response.metadata().resolved_model(),
        Some("model-a-resolved")
    );
    assert_eq!(response.metadata().requested_model(), "model-a");
    assert_eq!(response.metadata().provider_name(), "selected");
    assert!(next(&mut events).await.is_none());
    bounded(server).await.unwrap();

    // The same model name on the other Provider must use its own address and credentials.
    let other_server = tokio::spawn(async move {
        let (mut socket, _) = bounded(other_listener.accept()).await.unwrap();
        let received = receive_request(&mut socket).await;
        assert!(
            received
                .head
                .starts_with("POST /unused/chat/completions HTTP/1.1\r\n")
        );
        let head = received.head.to_ascii_lowercase();
        assert!(head.contains("authorization: bearer other-fixture-key\r\n"));
        assert!(head.contains("x-tenant-id: other-tenant\r\n"));
        assert_eq!(received.body["model"], "model-a");
        start_sse(&mut socket).await;
        write_chunk(
            &mut socket,
            format!("{}data: [DONE]\n\n", chunk("other", Some("stop"))).as_bytes(),
        )
        .await;
        socket.write_all(b"0\r\n\r\n").await.unwrap();
    });
    let mut other_events =
        bounded(other_model.stream(GenerationRequest::new(vec![user("你好")]).unwrap()))
            .await
            .unwrap();
    let mut other_completed = false;
    while let Some(event) = next(&mut other_events).await {
        if let GenerationEvent::Completed(response) = event.unwrap() {
            assert_eq!(response.assistant().text_content(), "other");
            assert_eq!(response.metadata().provider_name(), "unselected");
            assert_eq!(response.metadata().requested_model(), "model-a");
            other_completed = true;
        }
    }
    assert!(other_completed);
    bounded(other_server).await.unwrap();
}

async fn serve_body(body: String) -> (Model, tokio::task::JoinHandle<()>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let model = configured_model(&listener.local_addr().unwrap().to_string());
    let server = tokio::spawn(async move {
        let (mut socket, _) = bounded(listener.accept()).await.unwrap();
        receive_request(&mut socket).await;
        start_sse(&mut socket).await;
        write_chunk(&mut socket, body.as_bytes()).await;
        socket.write_all(b"0\r\n\r\n").await.unwrap();
        socket.shutdown().await.unwrap();
        assert!(listener.accept().now_or_never().is_none());
    });
    (model, server)
}

#[tokio::test]
async fn stream_failures_preserve_partial_and_end_once() {
    for (tail, expected, json_error) in [
        ("".to_owned(), ErrorKind::Truncated, false),
        ("data: {broken\n\n".to_owned(), ErrorKind::InvalidResponse, true),
        ("data: [DONE]\n\n".to_owned(), ErrorKind::InvalidResponse, false),
        (format!("{}event: error\ndata: [DONE]\n\n", chunk("", Some("stop"))), ErrorKind::InvalidResponse, false),
        ("data: {\"choices\":[{\"index\":1,\"delta\":{},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n".to_owned(), ErrorKind::InvalidResponse, false),
    ] {
        let (model, server) = serve_body(format!("{}{tail}", chunk("partial", None))).await;
        let mut events = model.stream(request()).await.unwrap();
        let error = loop {
            match next(&mut events).await.expect("missing stream error") {
                Err(error) => break error,
                Ok(GenerationEvent::Completed(_)) => panic!("failed stream completed"),
                Ok(_) => {}
            }
        };
        assert_eq!(error.kind(), expected);
        assert!(matches!(error.partial().unwrap().parts(), [PartialPart::Text { part: 0, text }] if text == "partial"));
        assert_eq!(error.request_id(), Some("fixture-request"));
        let provider_error = error.source().unwrap().downcast_ref::<Error>().unwrap();
        if json_error { assert!(provider_error.source().unwrap().is::<serde_json::Error>()); }
        assert!(next(&mut events).await.is_none());
        bounded(server).await.unwrap();
    }
}

#[tokio::test]
async fn usage_is_a_snapshot_and_missing_counts_remain_unknown() {
    let body = format!(
        "{}data: {{\"choices\":[],\"usage\":{{\"prompt_tokens\":3,\"completion_tokens\":1,\"total_tokens\":4}}}}\n\ndata: {{\"choices\":[],\"usage\":{{\"prompt_tokens\":3,\"completion_tokens\":1,\"total_tokens\":4}}}}\n\n{}data: [DONE]\n\n",
        chunk("ok", None),
        chunk("", Some("stop")),
    );
    let (model, server) = serve_body(body).await;
    let mut events = model.stream(request()).await.unwrap();
    let mut snapshots = 0;
    while let Some(event) = next(&mut events).await {
        match event.unwrap() {
            GenerationEvent::Usage(usage) => {
                snapshots += 1;
                assert_eq!(usage.total_tokens(), Some(4));
            }
            GenerationEvent::Completed(response) => {
                assert_eq!(response.usage().total_tokens(), Some(4))
            }
            _ => {}
        }
    }
    assert_eq!(snapshots, 2);
    bounded(server).await.unwrap();
    let (model, server) =
        serve_body(format!("{}data: [DONE]\n\n", chunk("ok", Some("stop")))).await;
    let mut events = model.stream(request()).await.unwrap();
    while let Some(event) = next(&mut events).await {
        if let GenerationEvent::Completed(response) = event.unwrap() {
            assert_eq!(response.usage().input_tokens(), None);
            assert_eq!(response.usage().output_tokens(), None);
            assert_eq!(response.usage().total_tokens(), None);
        }
    }
    bounded(server).await.unwrap();
}

#[tokio::test]
async fn http_errors_preserve_classification_and_never_follow_redirects() {
    for (status, expected) in [
        (401, ErrorKind::Authentication),
        (403, ErrorKind::Authentication),
        (429, ErrorKind::RateLimited),
        (503, ErrorKind::Unavailable),
        (400, ErrorKind::InvalidRequest),
        (307, ErrorKind::InvalidResponse),
    ] {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let model = configured_model(&address.to_string());
        let server = tokio::spawn(async move {
            let (mut socket, _) = bounded(listener.accept()).await.unwrap();
            receive_request(&mut socket).await;
            let body = r#"{"error":{"message":"do-not-echo-fixture-secret"}}"#;
            socket.write_all(format!("HTTP/1.1 {status} Fixture\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\nLocation: http://{address}/redirected\r\nX-Request-Id: failed-request\r\nRetry-After: 2\r\n\r\n{body}", body.len()).as_bytes()).await.unwrap();
            socket.shutdown().await.unwrap();
            // Give a redirect/retry a chance to be observed while the caller awaits its result.
            if let Ok(Ok(_)) = timeout(Duration::from_millis(100), listener.accept()).await {
                panic!("generation request was sent more than once");
            }
        });
        let error = match bounded(model.stream(request())).await {
            Ok(_) => panic!("HTTP error returned a successful stream"),
            Err(error) => error,
        };
        assert_eq!(error.kind(), expected);
        assert_eq!(error.request_id(), Some("failed-request"));
        assert_eq!(error.retry_after(), Some(Duration::from_secs(2)));
        assert!(!error.to_string().contains("do-not-echo-fixture-secret"));
        assert!(
            matches!(error.source().unwrap().downcast_ref::<Error>(), Some(Error::Http { status: reported, .. }) if *reported == status)
        );
        bounded(server).await.unwrap();
    }
}

#[tokio::test]
async fn http_errors_preserve_status_when_diagnostic_body_read_fails() {
    for (status, expected, close_body) in [
        (401, ErrorKind::Authentication, true),
        (429, ErrorKind::RateLimited, true),
        (503, ErrorKind::Unavailable, true),
        (429, ErrorKind::RateLimited, false),
    ] {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let model = configured_model(&listener.local_addr().unwrap().to_string());
        let (release, waiting) = oneshot::channel();
        let server = tokio::spawn(async move {
            let (mut socket, _) = bounded(listener.accept()).await.unwrap();
            receive_request(&mut socket).await;
            // Advertise a longer body, then either disconnect or hold it open.
            socket.write_all(format!("HTTP/1.1 {status} Fixture\r\nContent-Type: application/json\r\nContent-Length: 100\r\nConnection: close\r\nX-Request-Id: failed-request\r\nRetry-After: 5\r\n\r\n{{}}").as_bytes()).await.unwrap();
            if !close_body {
                bounded(waiting).await.unwrap();
            }
            socket.shutdown().await.unwrap();
        });
        let result = bounded(model.stream(request())).await;
        let _ = release.send(());
        bounded(server).await.unwrap();
        let error = match result {
            Ok(_) => panic!("HTTP error returned a successful stream"),
            Err(error) => error,
        };
        assert_eq!(error.kind(), expected);
        assert_eq!(error.retry_after(), Some(Duration::from_secs(5)));
        assert_eq!(error.request_id(), Some("failed-request"));
        let provider_error = error.source().unwrap().downcast_ref::<Error>().unwrap();
        assert!(
            matches!(provider_error, Error::Http { status: reported, .. } if *reported == status)
        );
        let source = provider_error
            .source()
            .unwrap()
            .downcast_ref::<reqwest::Error>()
            .unwrap();
        assert_eq!(source.is_timeout(), !close_body);
    }
}

#[tokio::test]
async fn public_manual_authentication_preserves_sources_without_sending() {
    struct FailingAuth;
    #[async_trait]
    impl RequestAuth for FailingAuth {
        fn replay_scope(&self) -> &str {
            "fixture-auth"
        }
        async fn apply(&self, _request: &mut Request) -> Result<(), Error> {
            Err(Error::Authentication {
                message: "fixture authentication failed".into(),
                source: Some(Box::new(std::io::Error::other(
                    "fixture credential service unavailable",
                ))),
            })
        }
    }
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let provider = Arc::new(
        Provider::new(
            "manual",
            format!("http://{}/v1/", listener.local_addr().unwrap()),
        )
        .unwrap(),
    );
    let http = HttpAccess::builder()
        .client(client())
        .auth(Arc::new(FailingAuth) as Arc<dyn RequestAuth>)
        .build()
        .unwrap();
    let protocol: Arc<dyn Protocol> = Arc::new(OpenAiChatCompletions::new(Arc::new(http)));
    let model = Model::new(provider, "model-a", protocol).unwrap();
    let error = match model.stream(request()).await {
        Ok(_) => panic!("authentication unexpectedly succeeded"),
        Err(error) => error,
    };
    assert_eq!(error.kind(), ErrorKind::Authentication);
    let provider_error = error.source().unwrap().downcast_ref::<Error>().unwrap();
    assert!(matches!(provider_error, Error::Authentication { .. }));
    assert!(provider_error.source().unwrap().is::<std::io::Error>());
    assert!(listener.accept().now_or_never().is_none());
    let error = model.generate(request()).await.unwrap_err();
    assert_eq!(error.kind(), ErrorKind::Unsupported);
    assert!(listener.accept().now_or_never().is_none());
}

#[tokio::test]
async fn public_header_auth_and_provider_try_from_are_usable() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let config = ProvidersConfig::from_toml(&format!(
        r#"
[[providers]]
name = "manual"
base_url = "http://{address}/v1/"
auth = {{ type = "none" }}
[[models]]
provider = "manual"
name = "model-a"
protocol = "openai.chat-completions"
"#
    ))
    .unwrap();
    let provider = Arc::new(Provider::try_from(&config.providers[0]).unwrap());
    let auth = HeaderAuth::new(
        header::AUTHORIZATION,
        header::HeaderValue::from_static("Bearer manual-fixture-key"),
    );
    let http = Arc::new(
        HttpAccess::new(client(), header::HeaderMap::new(), Some(Arc::new(auth))).unwrap(),
    );
    let model = Model::new(
        provider,
        "model-a",
        Arc::new(OpenAiChatCompletions::new(http)),
    )
    .unwrap();
    let server = tokio::spawn(async move {
        let (mut socket, _) = bounded(listener.accept()).await.unwrap();
        let received = receive_request(&mut socket).await;
        assert!(received.head.starts_with("POST /v1/chat/completions "));
        assert!(
            received
                .head
                .to_ascii_lowercase()
                .contains("authorization: bearer manual-fixture-key\r\n")
        );
        start_sse(&mut socket).await;
        write_chunk(
            &mut socket,
            format!("{}data: [DONE]\n\n", chunk("ok", Some("stop"))).as_bytes(),
        )
        .await;
        socket.write_all(b"0\r\n\r\n").await.unwrap();
    });
    let mut events = model.stream(request()).await.unwrap();
    let mut completed = false;
    while let Some(event) = next(&mut events).await {
        if let GenerationEvent::Completed(_) = event.unwrap() {
            completed = true;
        }
    }
    assert!(completed);
    bounded(server).await.unwrap();
}

#[test]
fn provider_errors_are_public_and_distinct_from_domain_errors() {
    let error = ProvidersConfig::from_toml("providers = [").unwrap_err();
    assert!(matches!(error, Error::ConfigParse(_)));
    assert!(error.source().unwrap().is::<toml::de::Error>());
    let config = ProvidersConfig::from_toml(
        r#"
[[providers]]
name = "manual"
base_url = "http://127.0.0.1/v1"
auth = { type = "none" }
[[models]]
provider = "manual"
name = "model-a"
protocol = "unsupported.protocol"
"#,
    )
    .unwrap();
    let error = match build_models(config, client()) {
        Ok(_) => panic!("unknown protocol accepted"),
        Err(error) => error,
    };
    assert!(matches!(error, Error::UnsupportedProtocol { .. }));
}

#[tokio::test]
async fn transport_and_read_timeout_preserve_reqwest_sources() {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    drop(listener);
    let model = configured_model(&address.to_string());
    let error = match bounded(model.stream(request())).await {
        Ok(_) => panic!("closed port returned a stream"),
        Err(error) => error,
    };
    assert_eq!(error.kind(), ErrorKind::Transport);
    assert!(
        error
            .source()
            .unwrap()
            .downcast_ref::<Error>()
            .unwrap()
            .source()
            .unwrap()
            .is::<reqwest::Error>()
    );

    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let provider = Arc::new(
        Provider::new(
            "timeout",
            format!("http://{}/v1", listener.local_addr().unwrap()),
        )
        .unwrap(),
    );
    let client = support::client_builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .read_timeout(Duration::from_millis(200))
        .build()
        .unwrap();
    let http = HttpAccess::new(client, header::HeaderMap::new(), None).unwrap();
    let model = Model::new(
        provider,
        "model-a",
        Arc::new(OpenAiChatCompletions::new(Arc::new(http))),
    )
    .unwrap();
    let (release, waiting) = oneshot::channel();
    let server = tokio::spawn(async move {
        let (mut socket, _) = bounded(listener.accept()).await.unwrap();
        receive_request(&mut socket).await;
        start_sse(&mut socket).await;
        write_chunk(&mut socket, chunk("partial", None).as_bytes()).await;
        bounded(waiting).await.unwrap();
    });
    let mut events = bounded(model.stream(request())).await.unwrap();
    let error = loop {
        match next(&mut events).await.expect("missing timeout error") {
            Err(error) => break error,
            Ok(GenerationEvent::Completed(_)) => panic!("timed-out stream completed"),
            Ok(_) => {}
        }
    };
    assert_eq!(error.kind(), ErrorKind::Timeout);
    assert!(
        matches!(error.partial().unwrap().parts(), [PartialPart::Text { text, .. }] if text == "partial")
    );
    assert!(
        error
            .source()
            .unwrap()
            .downcast_ref::<Error>()
            .unwrap()
            .source()
            .unwrap()
            .is::<reqwest::Error>()
    );
    assert!(next(&mut events).await.is_none());
    release.send(()).unwrap();
    bounded(server).await.unwrap();
}

#[tokio::test]
async fn authentication_cannot_replace_required_protocol_headers() {
    struct ConflictingAuth(header::HeaderName);
    #[async_trait]
    impl RequestAuth for ConflictingAuth {
        fn replay_scope(&self) -> &str {
            "conflicting-fixture"
        }
        async fn apply(&self, request: &mut Request) -> Result<(), Error> {
            request.headers_mut().insert(
                self.0.clone(),
                header::HeaderValue::from_static("text/plain"),
            );
            Ok(())
        }
    }
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let provider = Arc::new(
        Provider::new(
            "manual",
            format!("http://{}/v1", listener.local_addr().unwrap()),
        )
        .unwrap(),
    );
    for name in [header::CONTENT_TYPE, header::ACCEPT] {
        let http = HttpAccess::builder()
            .client(client())
            .auth(Arc::new(ConflictingAuth(name)) as Arc<dyn RequestAuth>)
            .build()
            .unwrap();
        let model = Model::new(
            provider.clone(),
            "model-a",
            Arc::new(OpenAiChatCompletions::new(Arc::new(http))),
        )
        .unwrap();
        let error = match model.stream(request()).await {
            Ok(_) => panic!("conflicting protocol header was sent"),
            Err(error) => error,
        };
        assert_eq!(error.kind(), ErrorKind::InvalidRequest);
        assert!(matches!(
            error.source().unwrap().downcast_ref::<Error>(),
            Some(Error::InvalidConfig { .. })
        ));
        assert!(listener.accept().now_or_never().is_none());
    }
}

#[tokio::test]
async fn metadata_only_trailer_does_not_replace_completion_state() {
    // Hand-written fixture matching the trailer shape observed during ChatAnywhere
    // integration on 2026-10-15. Identifiers and content here are artificial.
    let trailer = concat!(
        "data: {\"id\":\"fixture-response\",\"model\":\"model-a-resolved\",",
        "\"choices\":[],\"object\":\"chat.completion.chunk\",",
        "\"system_fingerprint\":\"fixture\",\"service_tier\":\"default\",\"obfuscation\":\"fixture\"}\n\n",
        "data: [DONE]\n\n",
    );
    for finished in [true, false] {
        let body = format!("{}{trailer}", chunk("ok", finished.then_some("stop")));
        let (model, server) = serve_body(body).await;
        let mut events = model.stream(request()).await.unwrap();
        let mut completed = false;
        let mut failed = false;
        while let Some(event) = next(&mut events).await {
            match event {
                Ok(GenerationEvent::Completed(response)) => {
                    assert!(finished);
                    assert!(!completed);
                    assert_eq!(response.assistant().text_content(), "ok");
                    assert_eq!(response.usage().total_tokens(), None);
                    completed = true;
                }
                Err(error) => {
                    assert!(!finished);
                    assert!(!failed);
                    assert_eq!(error.kind(), ErrorKind::InvalidResponse);
                    failed = true;
                }
                _ => {}
            }
        }
        assert_eq!(completed, finished);
        assert_eq!(failed, !finished);
        bounded(server).await.unwrap();
    }
}
