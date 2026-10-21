use crate::{Error, ErrorKind};

/// One generation's complete ordered history and explicit options.
#[derive(Clone, Debug)]
pub struct GenerationRequest {
    instructions: Option<String>,
    messages: Vec<Message>,
    options: GenerationOptions,
}

impl GenerationRequest {
    pub fn new(messages: Vec<Message>) -> Result<Self, Error> {
        if messages.is_empty() {
            return Err(Error::new(
                ErrorKind::InvalidRequest,
                "messages must not be empty",
            ));
        }
        for message in &messages {
            validate_message(message)?;
        }
        Ok(Self {
            instructions: None,
            messages,
            options: GenerationOptions::default(),
        })
    }

    pub fn with_instructions(mut self, instructions: impl Into<String>) -> Self {
        self.instructions = Some(instructions.into());
        self
    }

    pub fn with_options(mut self, options: GenerationOptions) -> Result<Self, Error> {
        options.validate()?;
        self.options = options;
        Ok(self)
    }

    pub fn with_message(mut self, message: Message) -> Result<Self, Error> {
        validate_message(&message)?;
        self.messages.push(message);
        Ok(self)
    }

    pub fn instructions(&self) -> Option<&str> {
        self.instructions.as_deref()
    }

    pub fn messages(&self) -> &[Message] {
        &self.messages
    }

    pub fn options(&self) -> &GenerationOptions {
        &self.options
    }
}

fn validate_message(message: &Message) -> Result<(), Error> {
    if matches!(message, Message::User(parts) if parts.is_empty()) {
        return Err(Error::new(
            ErrorKind::InvalidRequest,
            "user message must contain at least one part",
        ));
    }
    Ok(())
}

#[derive(Clone, Debug)]
pub enum Message {
    User(Vec<InputPart>),
    Assistant(AssistantMessage),
}

#[derive(Clone, Debug)]
pub enum InputPart {
    Text(String),
}

#[derive(Clone, Debug, Default)]
pub struct GenerationOptions {
    max_output_tokens: Option<u32>,
    temperature: Option<f32>,
}

#[bon::bon]
impl GenerationOptions {
    #[builder(start_fn = builder)]
    pub fn new(max_output_tokens: Option<u32>, temperature: Option<f32>) -> Result<Self, Error> {
        let options = Self {
            max_output_tokens,
            temperature,
        };
        options.validate()?;
        Ok(options)
    }

    fn validate(&self) -> Result<(), Error> {
        if self.max_output_tokens == Some(0) {
            return Err(Error::new(
                ErrorKind::InvalidRequest,
                "max_output_tokens must be greater than zero",
            ));
        }
        if self.temperature.is_some_and(|value| !value.is_finite()) {
            return Err(Error::new(
                ErrorKind::InvalidRequest,
                "temperature must be finite",
            ));
        }
        Ok(())
    }

    pub fn max_output_tokens(&self) -> Option<u32> {
        self.max_output_tokens
    }

    pub fn temperature(&self) -> Option<f32> {
        self.temperature
    }
}

/// A complete assistant turn; use the value from `Completed` when extending history.
#[derive(Clone, Debug)]
pub struct AssistantMessage {
    parts: Vec<OutputPart>,
}

impl AssistantMessage {
    pub fn new(parts: Vec<OutputPart>) -> Self {
        Self { parts }
    }

    pub fn text(text: impl Into<String>) -> Self {
        Self::new(vec![OutputPart::Text(text.into())])
    }

    pub fn parts(&self) -> &[OutputPart] {
        &self.parts
    }

    pub fn text_content(&self) -> String {
        self.parts
            .iter()
            .map(|part| match part {
                OutputPart::Text(text) => text.as_str(),
            })
            .collect()
    }
}

#[derive(Clone, Debug)]
pub enum OutputPart {
    Text(String),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FinishReason {
    Stop,
    ToolCalls,
    OutputLimit,
    ContentFiltered,
    Other,
}

#[derive(Clone, Debug)]
pub struct Finish {
    reason: FinishReason,
    provider_reason: Option<String>,
}

#[bon::bon]
impl Finish {
    #[builder(start_fn = builder)]
    pub fn new(reason: FinishReason, #[builder(into)] provider_reason: Option<String>) -> Self {
        Self {
            reason,
            provider_reason,
        }
    }

    pub fn reason(&self) -> FinishReason {
        self.reason
    }

    pub fn provider_reason(&self) -> Option<&str> {
        self.provider_reason.as_deref()
    }
}

/// Provider-reported cumulative counts. An unreported count remains `None`.
#[derive(Clone, Debug, Default, bon::Builder)]
pub struct Usage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    total_tokens: Option<u64>,
    reasoning_tokens: Option<u64>,
    cache_read_tokens: Option<u64>,
    cache_write_tokens: Option<u64>,
}

impl Usage {
    pub fn input_tokens(&self) -> Option<u64> {
        self.input_tokens
    }

    pub fn output_tokens(&self) -> Option<u64> {
        self.output_tokens
    }

    pub fn total_tokens(&self) -> Option<u64> {
        self.total_tokens
    }

    pub fn reasoning_tokens(&self) -> Option<u64> {
        self.reasoning_tokens
    }

    pub fn cache_read_tokens(&self) -> Option<u64> {
        self.cache_read_tokens
    }

    pub fn cache_write_tokens(&self) -> Option<u64> {
        self.cache_write_tokens
    }
}

#[derive(Clone, Debug, bon::Builder)]
pub struct GenerationMetadata {
    #[builder(into)]
    provider_name: String,
    #[builder(into)]
    protocol_name: String,
    #[builder(into)]
    requested_model: String,
    #[builder(into)]
    resolved_model: Option<String>,
    #[builder(into)]
    request_id: Option<String>,
    #[builder(into)]
    response_id: Option<String>,
}

impl GenerationMetadata {
    pub fn provider_name(&self) -> &str {
        &self.provider_name
    }

    pub fn protocol_name(&self) -> &str {
        &self.protocol_name
    }

    pub fn requested_model(&self) -> &str {
        &self.requested_model
    }

    pub fn resolved_model(&self) -> Option<&str> {
        self.resolved_model.as_deref()
    }

    pub fn request_id(&self) -> Option<&str> {
        self.request_id.as_deref()
    }

    pub fn response_id(&self) -> Option<&str> {
        self.response_id.as_deref()
    }
}

#[derive(Clone, Debug)]
pub struct GenerationResponse {
    assistant: AssistantMessage,
    finish: Finish,
    usage: Usage,
    metadata: GenerationMetadata,
}

#[bon::bon]
impl GenerationResponse {
    #[builder(start_fn = builder)]
    pub fn new(
        assistant: AssistantMessage,
        finish: Finish,
        usage: Usage,
        metadata: GenerationMetadata,
    ) -> Self {
        Self {
            assistant,
            finish,
            usage,
            metadata,
        }
    }

    pub fn assistant(&self) -> &AssistantMessage {
        &self.assistant
    }

    pub fn finish(&self) -> &Finish {
        &self.finish
    }

    pub fn usage(&self) -> &Usage {
        &self.usage
    }

    pub fn metadata(&self) -> &GenerationMetadata {
        &self.metadata
    }
}

pub type PartId = u32;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PartKind {
    Text,
}

#[derive(Clone, Debug)]
pub enum PartDelta {
    Text(String),
}

/// Successful streams emit one `Completed` and then EOF; errors emit one `Err` then EOF.
#[derive(Clone, Debug)]
pub enum GenerationEvent {
    Started(GenerationMetadata),
    PartStarted { part: PartId, kind: PartKind },
    Delta { part: PartId, delta: PartDelta },
    PartCompleted { part: PartId, content: OutputPart },
    Usage(Usage),
    Completed(GenerationResponse),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_requests_and_options_at_construction() {
        for messages in [vec![], vec![Message::User(vec![])]] {
            assert_eq!(
                GenerationRequest::new(messages).unwrap_err().kind(),
                ErrorKind::InvalidRequest
            );
        }
        assert!(
            GenerationOptions::builder()
                .max_output_tokens(0)
                .build()
                .is_err()
        );
        for temperature in [f32::NAN, f32::INFINITY, f32::NEG_INFINITY] {
            assert!(
                GenerationOptions::builder()
                    .temperature(temperature)
                    .build()
                    .is_err()
            );
        }
        let request =
            GenerationRequest::new(vec![Message::User(vec![InputPart::Text("hello".into())])])
                .unwrap()
                .with_instructions("Be concise")
                .with_options(
                    GenerationOptions::builder()
                        .max_output_tokens(64)
                        .build()
                        .unwrap(),
                )
                .unwrap()
                .with_message(Message::Assistant(AssistantMessage::text("hi")))
                .unwrap();
        assert_eq!(request.instructions(), Some("Be concise"));
        assert_eq!(request.options().max_output_tokens(), Some(64));
        assert_eq!(request.options().temperature(), None);
        assert_eq!(request.messages().len(), 2);
        assert!(request.with_message(Message::User(vec![])).is_err());
    }
}
