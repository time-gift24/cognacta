use std::time::Duration;

use crate::{NodeId, PartId, Usage};

/// Failure categories for model protocols and cluster execution.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ErrorKind {
    InvalidRequest,
    Unsupported,
    Authentication,
    RateLimited,
    Unavailable,
    Transport,
    Timeout,
    InvalidResponse,
    Truncated,
    ReplayMismatch,
    DuplicateNode,
    UnknownNode,
    InputTypeMismatch,
    RunNotReady,
    NodeExecution,
    StateDeltaRejected,
}

/// A classified failure with optional diagnostics and its original source.
#[derive(Debug, thiserror::Error, bon::Builder)]
#[error("{message}")]
pub struct Error {
    kind: ErrorKind,
    #[builder(into)]
    message: String,
    #[builder(into)]
    request_id: Option<String>,
    node_id: Option<NodeId>,
    retry_after: Option<Duration>,
    #[builder(into)]
    partial: Option<Box<PartialGeneration>>,
    #[source]
    source: Option<Box<dyn std::error::Error + Send + Sync>>,
}

impl Error {
    /// `message` must be a safe diagnostic, without credentials or raw request headers.
    pub fn new(kind: ErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
            request_id: None,
            node_id: None,
            retry_after: None,
            partial: None,
            source: None,
        }
    }

    pub fn with_request_id(mut self, request_id: String) -> Self {
        self.request_id = Some(request_id);
        self
    }

    pub fn with_node_id(mut self, node_id: NodeId) -> Self {
        self.node_id = Some(node_id);
        self
    }

    pub fn node_id(&self) -> Option<&NodeId> {
        self.node_id.as_ref()
    }

    pub fn with_retry_after(mut self, retry_after: Duration) -> Self {
        self.retry_after = Some(retry_after);
        self
    }

    pub fn with_partial(mut self, partial: PartialGeneration) -> Self {
        self.partial = Some(Box::new(partial));
        self
    }

    pub fn with_source(mut self, source: Box<dyn std::error::Error + Send + Sync>) -> Self {
        self.source = Some(source);
        self
    }

    pub fn kind(&self) -> ErrorKind {
        self.kind
    }

    pub fn message(&self) -> &str {
        &self.message
    }

    pub fn request_id(&self) -> Option<&str> {
        self.request_id.as_deref()
    }

    pub fn retry_after(&self) -> Option<Duration> {
        self.retry_after
    }

    pub fn partial(&self) -> Option<&PartialGeneration> {
        self.partial.as_deref()
    }
}

/// Incomplete output for display or diagnosis, never a completed history message.
#[derive(Clone, Debug)]
pub struct PartialGeneration {
    parts: Vec<PartialPart>,
    usage: Usage,
}

impl PartialGeneration {
    pub fn new(parts: Vec<PartialPart>, usage: Usage) -> Self {
        Self { parts, usage }
    }

    pub fn parts(&self) -> &[PartialPart] {
        &self.parts
    }

    pub fn usage(&self) -> &Usage {
        &self.usage
    }
}

#[derive(Clone, Debug)]
pub enum PartialPart {
    Text { part: PartId, text: String },
}

#[cfg(test)]
mod tests {
    use std::error::Error as _;

    use super::*;

    #[test]
    fn preserves_typed_source_and_partial_diagnostics() {
        let error = Error::new(ErrorKind::Transport, "stream interrupted")
            .with_request_id("request-1".into())
            .with_node_id("node-1".into())
            .with_retry_after(Duration::from_secs(2))
            .with_partial(PartialGeneration::new(
                vec![PartialPart::Text {
                    part: 0,
                    text: "partial".into(),
                }],
                Usage::default(),
            ))
            .with_source(Box::new(std::io::Error::other("connection closed")));

        assert_eq!(error.kind(), ErrorKind::Transport);
        assert_eq!(error.to_string(), "stream interrupted");
        assert_eq!(error.request_id(), Some("request-1"));
        assert_eq!(error.node_id().map(String::as_str), Some("node-1"));
        assert_eq!(error.retry_after(), Some(Duration::from_secs(2)));
        assert!(error.source().unwrap().is::<std::io::Error>());
        assert!(matches!(
            &error.partial().unwrap().parts()[0],
            PartialPart::Text { part: 0, text } if text == "partial"
        ));
    }

    #[test]
    fn builder_preserves_node_context_and_source() {
        let error = Error::builder()
            .kind(ErrorKind::NodeExecution)
            .message("node execution failed")
            .node_id("node-1".to_owned())
            .source(Box::new(Error::new(ErrorKind::Timeout, "original")))
            .build();
        assert_eq!(error.node_id().map(String::as_str), Some("node-1"));
        let source = error.source().unwrap().downcast_ref::<Error>().unwrap();
        assert_eq!(source.kind(), ErrorKind::Timeout);
    }
}
