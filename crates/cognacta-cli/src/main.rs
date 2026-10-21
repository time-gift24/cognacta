use std::{
    io::Write,
    process::ExitCode,
    sync::mpsc,
    time::{Duration, Instant},
};

use clap::Parser;

#[cfg(feature = "cognacta-test")]
mod chat;
#[cfg(feature = "cognacta-test")]
mod cluster_demo;

#[derive(Debug, Parser)]
#[command(version, about = "Cognacta command line")]
struct Cli {
    #[cfg(feature = "cognacta-test")]
    #[command(subcommand)]
    command: Option<Command>,
}

#[cfg(feature = "cognacta-test")]
#[derive(Debug, clap::Subcommand)]
enum Command {
    /// Chat with a configured model using streaming text.
    Chat(chat::ChatArgs),
    /// Run a deterministic Scheduler graph without external business services.
    ClusterDemo(cluster_demo::DemoArgs),
}

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("{0}")]
    Observability(#[from] cognacta_collector::Error),
    #[error("{0}")]
    Arguments(#[from] clap::Error),
    #[error("终端或运行时 I/O 失败: {0}")]
    Io(#[from] std::io::Error),
    #[cfg(feature = "cognacta-test")]
    #[error("{0}")]
    Provider(#[from] cognacta_provider::Error),
    #[cfg(feature = "cognacta-test")]
    #[error("{0}")]
    Core(#[from] cognacta_core::Error),
    #[cfg(feature = "cognacta-test")]
    #[error("无法创建 HTTP 客户端")]
    HttpClient(#[source] reqwest::Error),
    #[cfg(feature = "cognacta-test")]
    #[error("无法配置 HTTP 客户端 TLS")]
    Tls(#[source] rustls::Error),
    #[cfg(feature = "cognacta-test")]
    #[error("未配置 Provider {provider} 下的模型 {model}")]
    UnknownModel { provider: String, model: String },
}

fn main() -> ExitCode {
    let collector = cognacta_collector::Collector::init_from_env("cognacta-cli");
    if let Err(error) = &collector {
        tracing::warn!(event = "collector.initialization_failed", diagnostic = %error, "telemetry unavailable");
    }
    let result = run();
    let deadline = Instant::now() + Duration::from_secs(3);
    let code = exit_code(result, deadline);
    if let Ok(collector) = collector
        && let Err(error) = collector.shutdown(deadline.saturating_duration_since(Instant::now()))
    {
        let error = Error::Observability(error);
        tracing::warn!(event = "collector.shutdown_failed", diagnostic = %error, "telemetry shutdown incomplete");
    }
    code
}

fn exit_code(result: Result<(), Error>, deadline: Instant) -> ExitCode {
    let Err(error) = result else {
        return ExitCode::SUCCESS;
    };
    let (sent, done) = mpsc::sync_channel(1);
    // ponytail: one final diagnostic worker; detach on timeout so stderr backpressure
    // cannot hold up process exit or consume a second shutdown budget.
    if std::thread::Builder::new()
        .name("cli-diagnostic".into())
        .spawn(move || {
            let _ = sent.send(report_error(error));
        })
        .is_err()
    {
        return ExitCode::FAILURE;
    }
    done.recv_timeout(deadline.saturating_duration_since(Instant::now()))
        .unwrap_or(ExitCode::FAILURE)
}

fn report_error(error: Error) -> ExitCode {
    match error {
        Error::Arguments(error) => {
            let code = if error.use_stderr() {
                ExitCode::from(2)
            } else {
                ExitCode::SUCCESS
            };
            if error.print().is_err() {
                return ExitCode::FAILURE;
            }
            code
        }
        #[cfg(feature = "cognacta-test")]
        Error::Core(error) if scheduler_error(error.kind()) => {
            let _ = write_scheduler_error(&mut std::io::stderr().lock(), &error);
            ExitCode::FAILURE
        }
        error => {
            let _ = writeln!(std::io::stderr().lock(), "错误: {error}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(feature = "cognacta-test")]
fn scheduler_error(kind: cognacta_core::ErrorKind) -> bool {
    use cognacta_core::ErrorKind;
    matches!(
        kind,
        ErrorKind::DuplicateNode
            | ErrorKind::UnknownNode
            | ErrorKind::InputTypeMismatch
            | ErrorKind::RunNotReady
            | ErrorKind::NodeExecution
            | ErrorKind::StateDeltaRejected
    )
}

#[cfg(feature = "cognacta-test")]
fn write_scheduler_error(
    output: &mut impl Write,
    error: &cognacta_core::Error,
) -> std::io::Result<()> {
    write!(output, "错误: {:?}", error.kind())?;
    if let Some(node_id) = error.node_id() {
        let mut safe = String::new();
        for character in node_id.chars() {
            let encoded = if character.is_control() {
                character.escape_default().to_string()
            } else {
                character.to_string()
            };
            if safe.len() + encoded.len() > 256 {
                break;
            }
            safe.push_str(&encoded);
        }
        write!(output, " node={safe}")?;
    }
    writeln!(output)
}

fn run() -> Result<(), Error> {
    let cli = Cli::try_parse()?;
    #[cfg(feature = "cognacta-test")]
    if let Some(command) = cli.command {
        return tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?
            .block_on(async {
                match command {
                    Command::Chat(args) => chat::run(args).await,
                    Command::ClusterDemo(args) => cluster_demo::run(args).await,
                }
            });
    }
    #[cfg(not(feature = "cognacta-test"))]
    let _ = cli;
    writeln!(
        std::io::stdout().lock(),
        "cognacta {}",
        cognacta_core::version()
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_help_and_feature_gate() {
        assert!(Cli::try_parse_from(["cognacta-cli"]).is_ok());
        for (flag, kind) in [
            ("--help", clap::error::ErrorKind::DisplayHelp),
            ("--version", clap::error::ErrorKind::DisplayVersion),
        ] {
            assert_eq!(
                Cli::try_parse_from(["cognacta-cli", flag])
                    .unwrap_err()
                    .kind(),
                kind
            );
        }
        let help = Cli::try_parse_from(["cognacta-cli", "--help"])
            .unwrap_err()
            .to_string();
        assert_eq!(help.contains("chat"), cfg!(feature = "cognacta-test"));
        assert_eq!(
            help.contains("cluster-demo"),
            cfg!(feature = "cognacta-test")
        );
        let parsed = Cli::try_parse_from([
            "cognacta-cli",
            "chat",
            "--config",
            "test.toml",
            "--provider",
            "gateway",
            "--model",
            "model",
        ]);
        assert_eq!(parsed.is_ok(), cfg!(feature = "cognacta-test"));
        assert!(Cli::try_parse_from(["cognacta-cli", "chat"]).is_err());
        for scenario in [
            "chain",
            "branch-even",
            "branch-odd",
            "react-loop",
            "node-error",
            "delta-error",
            "input-error",
        ] {
            assert_eq!(
                Cli::try_parse_from(["cognacta-cli", "cluster-demo", scenario]).is_ok(),
                cfg!(feature = "cognacta-test")
            );
        }
        for args in [vec!["cluster-demo"], vec!["cluster-demo", "unknown"]] {
            assert!(Cli::try_parse_from(std::iter::once("cognacta-cli").chain(args)).is_err());
        }
    }

    #[cfg(feature = "cognacta-test")]
    #[test]
    fn scheduler_diagnostics_exclude_error_text_and_bound_node_ids() {
        use cognacta_core::{Error, ErrorKind};
        let error = Error::new(ErrorKind::NodeExecution, "SECRET_BODY")
            .with_node_id(format!("a\n{}", "界".repeat(100)))
            .with_source(Box::new(std::io::Error::other("SECRET_SOURCE")));
        let mut output = Vec::new();
        write_scheduler_error(&mut output, &error).unwrap();
        let output = String::from_utf8(output).unwrap();
        assert!(output.starts_with("错误: NodeExecution node=a\\n"));
        assert!(!output.contains("SECRET"));
        assert_eq!(output.lines().count(), 1);
        assert!(output.trim_end().split_once("node=").unwrap().1.len() <= 256);
    }
}
