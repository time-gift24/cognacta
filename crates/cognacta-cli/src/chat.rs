use std::{
    io::{BufRead, Write},
    path::PathBuf,
    time::Duration,
};

use cognacta_core::{
    ErrorKind, GenerationEvent, GenerationRequest, InputPart, Message, Model, PartDelta,
};
use cognacta_provider::{ProvidersConfig, build_models};
use futures_util::StreamExt;
use rustls_platform_verifier::BuilderVerifierExt;

use crate::Error;

#[derive(Debug, clap::Args)]
pub(crate) struct ChatArgs {
    /// TOML provider configuration file.
    #[arg(long)]
    config: PathBuf,
    /// Provider name from the configuration.
    #[arg(long)]
    provider: String,
    /// Actual upstream model name from the configuration.
    #[arg(long)]
    model: String,
}

pub(crate) async fn run(args: ChatArgs) -> Result<(), Error> {
    let config = ProvidersConfig::load(args.config).inspect_err(|_| {
        tracing::warn!(
            event = "configuration.failed",
            stage = "load",
            "provider configuration failed"
        )
    })?;
    let client = http_client()?;
    let models = build_models(config, client).inspect_err(|_| {
        tracing::warn!(
            event = "configuration.failed",
            stage = "build",
            "provider configuration failed"
        )
    })?;
    let key = (args.provider, args.model);
    let model = models.get(&key).ok_or_else(|| Error::UnknownModel {
        provider: key.0.clone(),
        model: key.1.clone(),
    })?;
    interact(
        model,
        &mut std::io::stdin().lock(),
        &mut std::io::stdout().lock(),
    )
    .await
}

fn http_client() -> Result<reqwest::Client, Error> {
    let mut tls = rustls::ClientConfig::builder_with_provider(
        rustls::crypto::ring::default_provider().into(),
    )
    .with_safe_default_protocol_versions()
    .and_then(|builder| builder.with_platform_verifier())
    .map_err(Error::Tls)?
    .with_no_client_auth();
    tls.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];
    reqwest::Client::builder()
        .tls_backend_preconfigured(tls)
        .redirect(reqwest::redirect::Policy::none())
        .retry(reqwest::retry::never())
        .connect_timeout(Duration::from_secs(10))
        .read_timeout(Duration::from_secs(60))
        .timeout(Duration::from_secs(300))
        .build()
        .map_err(Error::HttpClient)
}

async fn interact(
    model: &Model,
    input: &mut impl BufRead,
    output: &mut impl Write,
) -> Result<(), Error> {
    let mut history = Vec::new();
    let mut line = String::new();
    loop {
        write!(output, "> ")?;
        output.flush()?;
        line.clear();
        if input.read_line(&mut line)? == 0 {
            return Ok(());
        }
        if line.ends_with('\n') {
            line.pop();
            if line.ends_with('\r') {
                line.pop();
            }
        }
        if line == "/exit" {
            return Ok(());
        }
        if line.trim().is_empty() {
            continue;
        }
        run_turn(model, &mut history, line.clone(), output).await?;
    }
}

async fn run_turn(
    model: &Model,
    history: &mut Vec<Message>,
    text: String,
    output: &mut impl Write,
) -> Result<(), Error> {
    let user = Message::User(vec![InputPart::Text(text)]);
    let mut messages = history.clone();
    messages.push(user.clone());
    let mut events = model.stream(GenerationRequest::new(messages)?).await?;
    let mut completed = None;
    while let Some(event) = events.next().await {
        let event = event?;
        if completed.is_some() {
            return Err(cognacta_core::Error::new(
                ErrorKind::InvalidResponse,
                "Completed 后收到额外流式事件",
            )
            .into());
        }
        match event {
            GenerationEvent::Delta {
                delta: PartDelta::Text(text),
                ..
            } => {
                write!(output, "{text}")?;
                output.flush()?;
            }
            GenerationEvent::Completed(response) => {
                completed = Some(response.assistant().clone());
            }
            _ => {}
        }
    }
    let assistant = completed
        .ok_or_else(|| cognacta_core::Error::new(ErrorKind::Truncated, "事件流缺少 Completed"))?;
    writeln!(output)?;
    output.flush()?;
    history.extend([user, Message::Assistant(assistant)]);
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::{
        collections::VecDeque,
        sync::{Arc, Mutex},
    };

    use async_trait::async_trait;
    use cognacta_core::{
        AssistantMessage, EventStream, Finish, FinishReason, GenerationMetadata,
        GenerationResponse, Protocol, Provider, Usage,
    };

    use super::*;

    #[test]
    fn http_client_does_not_require_or_install_a_global_tls_provider() {
        assert!(rustls::crypto::CryptoProvider::get_default().is_none());
        http_client().unwrap();
        assert!(rustls::crypto::CryptoProvider::get_default().is_none());
    }

    struct FakeProtocol {
        requests: Mutex<Vec<GenerationRequest>>,
        replies: Mutex<VecDeque<Vec<Result<GenerationEvent, cognacta_core::Error>>>>,
    }

    #[async_trait]
    impl Protocol for FakeProtocol {
        fn name(&self) -> &'static str {
            "fake"
        }

        async fn generate(
            &self,
            _: &Provider,
            _: &str,
            _: GenerationRequest,
        ) -> Result<GenerationResponse, cognacta_core::Error> {
            Err(cognacta_core::Error::new(
                ErrorKind::Unsupported,
                "stream only",
            ))
        }

        async fn stream(
            &self,
            _: &Provider,
            _: &str,
            request: GenerationRequest,
        ) -> Result<EventStream, cognacta_core::Error> {
            self.requests.lock().unwrap().push(request);
            let events = self.replies.lock().unwrap().pop_front().unwrap();
            Ok(Box::pin(futures_util::stream::iter(events)))
        }
    }

    fn completion(text: &str) -> Result<GenerationEvent, cognacta_core::Error> {
        Ok(GenerationEvent::Completed(GenerationResponse::new(
            AssistantMessage::text(text),
            Finish::new(FinishReason::Stop, None),
            Usage::default(),
            GenerationMetadata::builder()
                .provider_name("fixture")
                .protocol_name("fake")
                .requested_model("test")
                .build(),
        )))
    }

    fn delta(text: &str) -> Result<GenerationEvent, cognacta_core::Error> {
        Ok(GenerationEvent::Delta {
            part: 0,
            delta: PartDelta::Text(text.into()),
        })
    }

    fn model(
        replies: Vec<Vec<Result<GenerationEvent, cognacta_core::Error>>>,
    ) -> (Model, Arc<FakeProtocol>) {
        let protocol = Arc::new(FakeProtocol {
            requests: Mutex::new(Vec::new()),
            replies: Mutex::new(replies.into()),
        });
        let model = Model::new(
            Arc::new(Provider::new("fixture", "https://example.test/v1").unwrap()),
            "test",
            protocol.clone(),
        )
        .unwrap();
        (model, protocol)
    }

    #[tokio::test]
    async fn commits_completed_assistant_and_keeps_failed_round_out_of_history() {
        let (model, protocol) = model(vec![
            vec![delta("displayed"), completion("canonical assistant")],
            vec![
                delta("partial"),
                Err(cognacta_core::Error::new(ErrorKind::Truncated, "cut off")),
            ],
        ]);
        let mut history = Vec::new();
        let mut output = Vec::new();
        run_turn(&model, &mut history, "first".into(), &mut output)
            .await
            .unwrap();
        assert_eq!(history.len(), 2);
        let Message::Assistant(assistant) = &history[1] else {
            panic!("missing committed assistant")
        };
        assert_eq!(assistant.text_content(), "canonical assistant");
        assert!(
            run_turn(&model, &mut history, "second".into(), &mut output)
                .await
                .is_err()
        );
        assert_eq!(history.len(), 2);
        let requests = protocol.requests.lock().unwrap();
        assert_eq!(requests.len(), 2);
        assert_eq!(requests[1].messages().len(), 3);
        let Message::Assistant(assistant) = &requests[1].messages()[1] else {
            panic!("missing assistant history")
        };
        assert_eq!(assistant.text_content(), "canonical assistant");
        assert_eq!(String::from_utf8(output).unwrap(), "displayed\npartial");
    }

    #[tokio::test]
    async fn incomplete_or_failed_terminal_stream_never_commits() {
        for reply in [
            vec![delta("partial")],
            vec![
                completion("not committed"),
                Err(cognacta_core::Error::new(ErrorKind::Transport, "broken")),
            ],
            vec![completion("not committed"), completion("duplicate")],
        ] {
            let (model, _) = model(vec![reply]);
            let mut history = Vec::new();
            assert!(
                run_turn(&model, &mut history, "question".into(), &mut Vec::new())
                    .await
                    .is_err()
            );
            assert!(history.is_empty());
        }
    }

    #[tokio::test]
    async fn blank_lines_and_exit_leave_model_unused() {
        let (model, protocol) = model(Vec::new());
        for input in ["", " \n\t\r\n", "/exit\n"] {
            interact(&model, &mut input.as_bytes(), &mut Vec::new())
                .await
                .unwrap();
        }
        assert!(protocol.requests.lock().unwrap().is_empty());
    }
}
