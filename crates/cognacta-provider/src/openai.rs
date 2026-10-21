use std::{sync::Arc, time::Duration};

use async_trait::async_trait;
use cognacta_core::{
    AssistantMessage, Error as CoreError, ErrorKind, EventStream, Finish, FinishReason,
    GenerationEvent, GenerationMetadata, GenerationRequest, GenerationResponse, InputPart, Message,
    OutputPart, PartDelta, PartKind, PartialGeneration, PartialPart, Protocol, Provider, Usage,
};
use futures_util::StreamExt;
use reqwest::{Method, Request, header};
use serde::Deserialize;
use serde_json::{Value, json};
use sse_core::{SseEvent, SseStream, SseStreamError};

use crate::{Error, HttpAccess};

/// OpenAI-compatible Chat Completions, currently supporting streamed text only.
pub struct OpenAiChatCompletions {
    http: Arc<HttpAccess>,
}

impl OpenAiChatCompletions {
    pub fn new(http: Arc<HttpAccess>) -> Self {
        Self { http }
    }
}

#[async_trait]
impl Protocol for OpenAiChatCompletions {
    fn name(&self) -> &'static str {
        "openai.chat-completions"
    }

    async fn generate(
        &self,
        _provider: &Provider,
        _model_name: &str,
        _request: GenerationRequest,
    ) -> Result<GenerationResponse, CoreError> {
        Err(CoreError::new(
            ErrorKind::Unsupported,
            "Chat Completions currently supports streamed text only",
        ))
    }

    async fn stream(
        &self,
        provider: &Provider,
        model_name: &str,
        request: GenerationRequest,
    ) -> Result<EventStream, CoreError> {
        let request = encode_request(provider, model_name, request)?;
        let response = self
            .http
            .send(request)
            .await
            .map_err(|error| into_core(error, None, None))?;
        let request_id = response
            .headers()
            .get("x-request-id")
            .and_then(|value| value.to_str().ok())
            .map(str::to_owned);
        if !response.status().is_success() {
            let status = response.status();
            let retry_after = response
                .headers()
                .get(header::RETRY_AFTER)
                .and_then(|value| value.to_str().ok())
                .and_then(|value| value.parse::<u64>().ok())
                .map(Duration::from_secs);
            // Read a bounded diagnostic body without reflecting arbitrary upstream text or secrets.
            let mut bytes = response.bytes_stream();
            let mut body = Vec::new();
            let mut source = None;
            while let Some(chunk) = bytes.next().await {
                let chunk = match chunk {
                    Ok(chunk) => chunk,
                    Err(error) => {
                        source = Some(error);
                        break;
                    }
                };
                let remaining = (64 * 1024_usize).saturating_sub(body.len());
                body.extend_from_slice(&chunk[..chunk.len().min(remaining)]);
                if chunk.len() >= remaining {
                    break;
                }
            }
            let message = if serde_json::from_slice::<Value>(&body)
                .ok()
                .and_then(|body| body.get("error").cloned())
                .is_some()
            {
                "upstream returned an error response"
            } else {
                status
                    .canonical_reason()
                    .unwrap_or("unexpected HTTP status")
            };
            return Err(into_core(
                Error::Http {
                    status: status.as_u16(),
                    message: message.into(),
                    request_id,
                    retry_after,
                    source,
                },
                None,
                None,
            ));
        }
        if !response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| {
                value
                    .split(';')
                    .next()
                    .unwrap_or_default()
                    .trim()
                    .eq_ignore_ascii_case("text/event-stream")
            })
        {
            return Err(into_core(
                invalid("expected a text/event-stream response"),
                request_id,
                None,
            ));
        }
        let mut state = State {
            provider: provider.name().to_owned(),
            requested_model: model_name.to_owned(),
            request_id,
            resolved_model: None,
            response_id: None,
            text: String::new(),
            part_started: false,
            finish: None,
            usage: Usage::default(),
        };
        Ok(Box::pin(async_stream::try_stream! {
            yield GenerationEvent::Started(state.metadata());
            let events = SseStream::new(response.bytes_stream());
            futures_util::pin_mut!(events);
            while let Some(event) = events.next().await {
                let event = event.map_err(|error| {
                    let error = match error {
                        SseStreamError::Inner(error) => Error::Transport(error),
                        error => Error::InvalidResponse {
                            message: "invalid SSE framing".into(),
                            source: Some(Box::new(error)),
                        },
                    };
                    state.error(error)
                })?;
                let SseEvent::Message(event) = event else { continue };
                if event.event != "message" {
                    Err(state.error(invalid("unsupported SSE event type")))?;
                }
                if event.data.trim() == "[DONE]" {
                    let finish = state.finish.take().ok_or_else(|| {
                        state.error(invalid("[DONE] arrived before a valid finish_reason"))
                    })?;
                    let assistant = if state.part_started {
                        yield GenerationEvent::PartCompleted {
                            part: 0,
                            content: OutputPart::Text(state.text.clone()),
                        };
                        AssistantMessage::text(state.text.clone())
                    } else {
                        AssistantMessage::new(Vec::new())
                    };
                    yield GenerationEvent::Completed(GenerationResponse::new(
                        assistant, finish, state.usage.clone(), state.metadata(),
                    ));
                    // A logical terminator ends the stream even if the HTTP body stays open.
                    return;
                }
                let chunk: Chunk = serde_json::from_str(&event.data).map_err(|error| {
                    state.error(Error::InvalidResponse {
                        message: "invalid Chat Completions JSON".into(),
                        source: Some(Box::new(error)),
                    })
                })?;
                let (text, usage) = state.apply(chunk).map_err(|error| state.error(error))?;
                if let Some(text) = text {
                    if !state.part_started {
                        state.part_started = true;
                        yield GenerationEvent::PartStarted { part: 0, kind: PartKind::Text };
                    }
                    state.text.push_str(&text);
                    yield GenerationEvent::Delta { part: 0, delta: PartDelta::Text(text) };
                }
                if usage {
                    yield GenerationEvent::Usage(state.usage.clone());
                }
            }
            Err(state.error(Error::Truncated))?;
        }))
    }
}

fn encode_request(
    provider: &Provider,
    model_name: &str,
    request: GenerationRequest,
) -> Result<Request, CoreError> {
    let mut messages = Vec::new();
    if let Some(instructions) = request.instructions() {
        messages.push(json!({"role": "system", "content": instructions}));
    }
    for message in request.messages() {
        let (role, text) = match message {
            Message::User(parts) => (
                "user",
                parts
                    .iter()
                    .map(|InputPart::Text(text)| text.as_str())
                    .collect::<String>(),
            ),
            Message::Assistant(assistant) => ("assistant", assistant.text_content()),
        };
        messages.push(json!({"role": role, "content": text}));
    }
    let options = request.options();
    let mut body = json!({"model": model_name, "messages": messages, "stream": true, "n": 1});
    if let Some(tokens) = options.max_output_tokens() {
        body["max_tokens"] = tokens.into();
    }
    if let Some(temperature) = options.temperature() {
        if !(0.0..=2.0).contains(&temperature) {
            return Err(CoreError::new(
                ErrorKind::InvalidRequest,
                "temperature must be between 0 and 2",
            ));
        }
        body["temperature"] = temperature.into();
    }
    let endpoint = format!(
        "{}/chat/completions",
        provider.base_url().trim_end_matches('/')
    );
    let url = reqwest::Url::parse(&endpoint).map_err(|error| {
        CoreError::new(
            ErrorKind::InvalidRequest,
            "invalid Chat Completions endpoint",
        )
        .with_source(Box::new(error))
    })?;
    let mut request = Request::new(Method::POST, url);
    request.headers_mut().insert(
        header::CONTENT_TYPE,
        header::HeaderValue::from_static("application/json"),
    );
    request.headers_mut().insert(
        header::ACCEPT,
        header::HeaderValue::from_static("text/event-stream"),
    );
    *request.body_mut() = Some(body.to_string().into());
    Ok(request)
}

#[derive(Deserialize)]
struct Chunk {
    id: Option<String>,
    model: Option<String>,
    choices: Vec<Choice>,
    usage: Option<ReportedUsage>,
    error: Option<Value>,
}

#[derive(Deserialize)]
struct Choice {
    index: u32,
    delta: Delta,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct Delta {
    role: Option<String>,
    content: Option<String>,
    tool_calls: Option<Value>,
    function_call: Option<Value>,
    refusal: Option<Value>,
    reasoning_content: Option<Value>,
    reasoning: Option<Value>,
    audio: Option<Value>,
}

#[derive(Deserialize)]
struct ReportedUsage {
    prompt_tokens: Option<u64>,
    completion_tokens: Option<u64>,
    total_tokens: Option<u64>,
    prompt_tokens_details: Option<PromptTokens>,
    completion_tokens_details: Option<CompletionTokens>,
}

#[derive(Deserialize)]
struct PromptTokens {
    cached_tokens: Option<u64>,
}

#[derive(Deserialize)]
struct CompletionTokens {
    reasoning_tokens: Option<u64>,
}

struct State {
    provider: String,
    requested_model: String,
    request_id: Option<String>,
    resolved_model: Option<String>,
    response_id: Option<String>,
    text: String,
    part_started: bool,
    finish: Option<Finish>,
    usage: Usage,
}

impl State {
    fn metadata(&self) -> GenerationMetadata {
        GenerationMetadata::builder()
            .provider_name(self.provider.clone())
            .protocol_name("openai.chat-completions".to_owned())
            .requested_model(self.requested_model.clone())
            .maybe_request_id(self.request_id.clone())
            .maybe_resolved_model(self.resolved_model.clone())
            .maybe_response_id(self.response_id.clone())
            .build()
    }

    fn error(&self, error: Error) -> CoreError {
        let parts = if self.part_started {
            vec![PartialPart::Text {
                part: 0,
                text: self.text.clone(),
            }]
        } else {
            Vec::new()
        };
        into_core(
            error,
            self.request_id.clone(),
            Some(PartialGeneration::new(parts, self.usage.clone())),
        )
    }

    fn apply(&mut self, chunk: Chunk) -> Result<(Option<String>, bool), Error> {
        if chunk.error.is_some() {
            return Err(invalid("upstream reported a streaming error"));
        }
        for (known, reported) in [
            (&mut self.response_id, chunk.id),
            (&mut self.resolved_model, chunk.model),
        ] {
            if let Some(value) = reported {
                if value.is_empty() || known.as_ref().is_some_and(|previous| *previous != value) {
                    return Err(invalid("inconsistent stream metadata"));
                }
                *known = Some(value);
            }
        }
        let mut text = None;
        match chunk.choices.as_slice() {
            // Compatible gateways may send a metadata-only trailer with no usage.
            // It does not finish a completion; [DONE] still requires index-zero finish_reason.
            [] => {}
            [choice] if choice.index == 0 => {
                if self.finish.is_some() {
                    return Err(invalid("choice arrived after finish_reason"));
                }
                let delta = &choice.delta;
                if delta.role.as_ref().is_some_and(|role| role != "assistant")
                    || delta.tool_calls.is_some()
                    || delta.function_call.is_some()
                    || delta.refusal.is_some()
                    || delta.reasoning_content.is_some()
                    || delta.reasoning.is_some()
                    || delta.audio.is_some()
                {
                    return Err(invalid("unsupported non-text output"));
                }
                if let Some(content) = &delta.content
                    && !content.is_empty()
                {
                    text = Some(content.clone());
                }
                if let Some(reason) = &choice.finish_reason {
                    let kind = match reason.as_str() {
                        "stop" => FinishReason::Stop,
                        "length" => FinishReason::OutputLimit,
                        "content_filter" => FinishReason::ContentFiltered,
                        "tool_calls" | "function_call" | "" => {
                            return Err(invalid("unsupported finish_reason"));
                        }
                        _ => FinishReason::Other,
                    };
                    self.finish = Some(Finish::new(kind, Some(reason.clone())));
                }
            }
            _ => {
                return Err(invalid(
                    "expected exactly one completion at choice index zero",
                ));
            }
        }
        let reported_usage = chunk.usage.is_some();
        if let Some(usage) = chunk.usage {
            self.usage = Usage::builder()
                .maybe_input_tokens(usage.prompt_tokens.or(self.usage.input_tokens()))
                .maybe_output_tokens(usage.completion_tokens.or(self.usage.output_tokens()))
                .maybe_total_tokens(usage.total_tokens.or(self.usage.total_tokens()))
                .maybe_cache_read_tokens(
                    usage
                        .prompt_tokens_details
                        .and_then(|details| details.cached_tokens)
                        .or(self.usage.cache_read_tokens()),
                )
                .maybe_reasoning_tokens(
                    usage
                        .completion_tokens_details
                        .and_then(|details| details.reasoning_tokens)
                        .or(self.usage.reasoning_tokens()),
                )
                .build();
        }
        Ok((text, reported_usage))
    }
}

fn invalid(message: &str) -> Error {
    Error::InvalidResponse {
        message: message.into(),
        source: None,
    }
}

fn into_core(
    error: Error,
    request_id: Option<String>,
    partial: Option<PartialGeneration>,
) -> CoreError {
    let (kind, retry_after, request_id) = match &error {
        Error::ConfigRead { .. }
        | Error::ConfigParse(_)
        | Error::InvalidConfig { .. }
        | Error::InvalidHeader { .. } => (ErrorKind::InvalidRequest, None, request_id),
        Error::UnsupportedProtocol { .. } => (ErrorKind::Unsupported, None, request_id),
        Error::Environment { .. } | Error::Authentication { .. } => {
            (ErrorKind::Authentication, None, request_id)
        }
        Error::Transport(source) => (
            if source.is_timeout() {
                ErrorKind::Timeout
            } else {
                ErrorKind::Transport
            },
            None,
            request_id,
        ),
        Error::Http {
            status,
            retry_after,
            request_id: reported_id,
            ..
        } => {
            let kind = match status {
                401 | 403 => ErrorKind::Authentication,
                429 => ErrorKind::RateLimited,
                500..=599 => ErrorKind::Unavailable,
                400..=499 => ErrorKind::InvalidRequest,
                _ => ErrorKind::InvalidResponse,
            };
            (kind, *retry_after, reported_id.clone().or(request_id))
        }
        Error::InvalidResponse { .. } => (ErrorKind::InvalidResponse, None, request_id),
        Error::Truncated => (ErrorKind::Truncated, None, request_id),
        Error::Domain(_) => {
            if let Error::Domain(error) = error {
                return error;
            }
            unreachable!()
        }
    };
    let mut mapped = CoreError::new(kind, error.to_string()).with_source(Box::new(error));
    if let Some(request_id) = request_id {
        mapped = mapped.with_request_id(request_id);
    }
    if let Some(retry_after) = retry_after {
        mapped = mapped.with_retry_after(retry_after);
    }
    if let Some(partial) = partial {
        mapped = mapped.with_partial(partial);
    }
    mapped
}
