use std::{
    io::Write,
    process::ExitCode,
    sync::mpsc,
    time::{Duration, Instant},
};

use clap::Parser;

#[derive(Debug, Parser)]
#[command(version, about = "Cognacta command line")]
struct Cli {}

#[derive(Debug, thiserror::Error)]
enum Error {
    #[error("{0}")]
    Observability(#[from] cognacta_collector::Error),
    #[error("{0}")]
    Arguments(#[from] clap::Error),
    #[error("终端 I/O 失败: {0}")]
    Io(#[from] std::io::Error),
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
        error => {
            let _ = writeln!(std::io::stderr().lock(), "错误: {error}");
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<(), Error> {
    Cli::try_parse()?;
    writeln!(
        std::io::stdout().lock(),
        "cognacta {}",
        env!("CARGO_PKG_VERSION")
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_help_and_arguments() {
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
        for command in ["chat", "cluster-demo", "--not-an-option"] {
            assert!(!help.contains(command));
            assert!(Cli::try_parse_from(["cognacta-cli", command]).is_err());
        }
    }
}
