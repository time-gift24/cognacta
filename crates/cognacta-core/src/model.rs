use std::{pin::Pin, sync::Arc};

use crate::observation::{Metrics, Observation};
use async_trait::async_trait;
use futures_core::Stream;
use tracing::Instrument;

use crate::{Error, ErrorKind, GenerationEvent, GenerationRequest, GenerationResponse};

/// A named HTTP(S) endpoint, independent of credentials and protocol implementations.
#[derive(Clone, Debug)]
pub struct Provider {
    name: String,
    base_url: String,
}

#[bon::bon]
impl Provider {
    #[builder(start_fn = builder)]
    pub fn new(name: impl Into<String>, base_url: impl Into<String>) -> Result<Self, Error> {
        let name = name.into();
        validate_name(&name, "provider name")?;
        let base_url = base_url.into();
        let url = url::Url::parse(&base_url).map_err(|source| {
            Error::new(ErrorKind::InvalidRequest, "invalid provider base URL")
                .with_source(Box::new(source))
        })?;
        let authority = base_url
            .split_once("://")
            .map(|(_, rest)| rest.split(['/', '?', '#']).next().unwrap_or_default());
        if !matches!(url.scheme(), "http" | "https")
            || url.host_str().is_none()
            || authority.is_none_or(|value| value.is_empty() || value.contains('@'))
            || !url.username().is_empty()
            || url.password().is_some()
            || url.query().is_some()
            || url.fragment().is_some()
            || base_url.trim() != base_url
            || base_url.chars().any(char::is_control)
        {
            return Err(Error::new(
                ErrorKind::InvalidRequest,
                "provider base URL must be absolute HTTP(S), without credentials, query, or fragment",
            ));
        }
        Ok(Self {
            name,
            base_url: url.into(),
        })
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn base_url(&self) -> &str {
        &self.base_url
    }
}

/// A runtime-selected model bound to one provider and protocol.
#[derive(Clone)]
pub struct Model {
    provider: Arc<Provider>,
    name: String,
    protocol: Arc<dyn Protocol>,
    metrics: Arc<Metrics>,
}

#[bon::bon]
impl Model {
    #[builder(start_fn = builder)]
    pub fn new(
        provider: Arc<Provider>,
        name: impl Into<String>,
        protocol: Arc<dyn Protocol>,
    ) -> Result<Self, Error> {
        let name = name.into();
        validate_name(&name, "model name")?;
        validate_name(protocol.name(), "protocol name")?;
        Ok(Self {
            provider,
            name,
            protocol,
            metrics: Arc::new(Metrics::new(opentelemetry::global::meter("cognacta-core"))),
        })
    }

    pub fn provider(&self) -> &Provider {
        &self.provider
    }

    pub fn name(&self) -> &str {
        &self.name
    }

    pub fn protocol(&self) -> &dyn Protocol {
        self.protocol.as_ref()
    }

    /// Observes one generation without changing protocol errors or response data.
    /// Construct the model after installing the application's telemetry provider.
    pub async fn generate(&self, request: GenerationRequest) -> Result<GenerationResponse, Error> {
        let mut observation = Observation::start(self, "generate", self.metrics.clone());
        let result = self
            .protocol
            .generate(&self.provider, &self.name, request)
            .instrument(observation.span())
            .await;
        match &result {
            Ok(response) => observation.success(response),
            Err(error) => observation.failure(error),
        }
        result
    }

    /// Observation follows consumption through Completed, error or drop, including
    /// consumer waiting time. Drop means local cancellation, not upstream billing
    /// cancellation. First-text latency excludes empty deltas; usage settles once
    /// from the latest reported cumulative values, leaving unknown counts unknown.
    pub async fn stream(&self, request: GenerationRequest) -> Result<EventStream, Error> {
        let mut observation = Observation::start(self, "stream", self.metrics.clone());
        match self
            .protocol
            .stream(&self.provider, &self.name, request)
            .instrument(observation.span())
            .await
        {
            Ok(stream) => Ok(observation.wrap(stream)),
            Err(error) => {
                observation.failure(&error);
                Err(error)
            }
        }
    }
}

fn validate_name(name: &str, field: &str) -> Result<(), Error> {
    if name.trim().is_empty() || name.chars().any(char::is_control) {
        return Err(Error::new(
            ErrorKind::InvalidRequest,
            format!("{field} must be nonblank and contain no control characters"),
        ));
    }
    Ok(())
}

/// An owned event stream. Dropping it cancels local consumption without retrying.
pub type EventStream = Pin<Box<dyn Stream<Item = Result<GenerationEvent, Error>> + Send + 'static>>;

#[async_trait]
pub trait Protocol: Send + Sync {
    fn name(&self) -> &'static str;

    async fn generate(
        &self,
        provider: &Provider,
        model_name: &str,
        request: GenerationRequest,
    ) -> Result<GenerationResponse, Error>;

    async fn stream(
        &self,
        provider: &Provider,
        model_name: &str,
        request: GenerationRequest,
    ) -> Result<EventStream, Error>;
}

#[cfg(test)]
mod tests {
    use futures_util::{StreamExt, stream};

    use crate::{
        AssistantMessage, Finish, FinishReason, GenerationMetadata, InputPart, Message, Usage,
    };

    use super::*;

    struct EchoProtocol;

    #[async_trait]
    impl Protocol for EchoProtocol {
        fn name(&self) -> &'static str {
            "test.echo"
        }

        async fn generate(
            &self,
            provider: &Provider,
            model_name: &str,
            request: GenerationRequest,
        ) -> Result<GenerationResponse, Error> {
            let Message::User(parts) = &request.messages()[0] else {
                panic!("test expects user text");
            };
            let InputPart::Text(text) = &parts[0];
            Ok(GenerationResponse::new(
                AssistantMessage::text(text),
                Finish::new(FinishReason::Stop, None),
                Usage::default(),
                GenerationMetadata::builder()
                    .provider_name(provider.name())
                    .protocol_name(self.name())
                    .requested_model(model_name)
                    .build(),
            ))
        }

        async fn stream(
            &self,
            provider: &Provider,
            model_name: &str,
            request: GenerationRequest,
        ) -> Result<EventStream, Error> {
            let response = self.generate(provider, model_name, request).await?;
            Ok(Box::pin(stream::iter([
                Ok(GenerationEvent::Started(response.metadata().clone())),
                Ok(GenerationEvent::Completed(response)),
            ])))
        }
    }

    #[tokio::test]
    async fn forwards_runtime_binding_and_returns_owned_stream() {
        let model = Model::builder()
            .provider(Arc::new(
                Provider::new("gateway", "https://example.test/v1").unwrap(),
            ))
            .name("actual-model")
            .protocol(Arc::new(EchoProtocol) as Arc<dyn Protocol>)
            .build()
            .unwrap();
        let request =
            GenerationRequest::new(vec![Message::User(vec![InputPart::Text("hello".into())])])
                .unwrap();
        let response = model.generate(request.clone()).await.unwrap();
        assert_eq!(response.assistant().text_content(), "hello");
        assert_eq!(response.metadata().provider_name(), "gateway");
        assert_eq!(response.metadata().requested_model(), "actual-model");
        assert_eq!(model.protocol().name(), "test.echo");
        let mut events = model.stream(request).await.unwrap();
        drop(model);
        assert!(matches!(
            events.next().await,
            Some(Ok(GenerationEvent::Started(_)))
        ));
        assert!(matches!(
            events.next().await,
            Some(Ok(GenerationEvent::Completed(_)))
        ));
        assert!(events.next().await.is_none());
    }

    #[test]
    fn validates_names_and_absolute_endpoint_without_discarding_prefix() {
        for invalid in [
            "relative/path",
            "ftp://example.test",
            "https:example.test",
            "https:///example.test",
            "https://user:secret@example.test/v1",
            "https://@example.test",
            "https://example.test?q=x",
            "https://example.test/#x",
            " https://example.test",
            "https://example.test\n/v1",
        ] {
            assert!(
                Provider::new("gateway", invalid).is_err(),
                "accepted {invalid:?}"
            );
        }
        for base_url in [
            "https://example.test/proxy/v1",
            "https://example.test/proxy/v1/",
        ] {
            assert_eq!(
                Provider::new("gateway", base_url).unwrap().base_url(),
                base_url
            );
        }
        assert!(Provider::new(" \t", "https://example.test").is_err());
        let provider = Arc::new(Provider::new("gateway", "https://example.test").unwrap());
        assert!(Model::new(provider, " ", Arc::new(EchoProtocol)).is_err());
    }
}

#[cfg(test)]
#[path = "observation_tests.rs"]
mod observation_tests;
