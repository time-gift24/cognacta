use std::process::{Command, Stdio};

#[cfg(feature = "cognacta-test")]
#[path = "../../cognacta-collector/tests/support/mod.rs"]
mod support;

fn command() -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_cognacta-cli"));
    command
        .env_clear()
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(feature = "cognacta-test")]
    support::clean_env(&mut command);
    command
}

#[test]
fn command_and_scenario_help_follow_feature_gate() {
    let help = command().arg("--help").output().unwrap();
    assert_eq!(help.status.code(), Some(0));
    assert_eq!(
        String::from_utf8_lossy(&help.stdout).contains("cluster-demo"),
        cfg!(feature = "cognacta-test")
    );
    let output = command().args(["cluster-demo", "--help"]).output().unwrap();
    if cfg!(feature = "cognacta-test") {
        assert_eq!(output.status.code(), Some(0));
        let help = String::from_utf8_lossy(&output.stdout);
        for name in [
            "chain",
            "branch-even",
            "branch-odd",
            "react-loop",
            "node-error",
            "delta-error",
            "input-error",
        ] {
            assert!(help.contains(name), "missing {name}: {help}");
        }
    } else {
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
        assert_eq!(
            command()
                .args(["cluster-demo", "chain"])
                .output()
                .unwrap()
                .status
                .code(),
            Some(2)
        );
    }
    for args in [vec!["cluster-demo"], vec!["cluster-demo", "unknown"]] {
        let output = command().args(args).output().unwrap();
        assert_eq!(output.status.code(), Some(2));
        assert!(output.stdout.is_empty());
    }
}

#[cfg(feature = "cognacta-test")]
const CASES: &[(&str, &str, i32, Option<&str>)] = &[
    ("chain", "status=completed length=5 output=len=5\n", 0, None),
    ("branch-even", "status=completed branch=even\n", 0, None),
    ("branch-odd", "status=completed branch=odd\n", 0, None),
    (
        "react-loop",
        "status=completed model_calls=2 tool_calls=1 answer=5\n",
        0,
        None,
    ),
    (
        "node-error",
        "status=failed node=fail value=1\n",
        1,
        Some("NodeExecution"),
    ),
    (
        "delta-error",
        "status=failed node=reject value=1\n",
        1,
        Some("StateDeltaRejected"),
    ),
    (
        "input-error",
        "status=failed node=typed_target value=1\n",
        1,
        Some("InputTypeMismatch"),
    ),
];

#[cfg(feature = "cognacta-test")]
#[test]
fn all_scenarios_have_exact_results_and_safe_errors_without_external_configuration() {
    for &(scenario, summary, code, kind) in CASES {
        for _ in 0..2 {
            let output =
                support::finish(command().args(["cluster-demo", scenario]).spawn().unwrap());
            assert_eq!(output.status.code(), Some(code), "{scenario}: {output:?}");
            assert_eq!(output.stdout, summary.as_bytes(), "{scenario}");
            let stderr = String::from_utf8_lossy(&output.stderr);
            assert!(!stderr.contains("SECRET"), "{scenario}: {stderr}");
            assert!(
                !stderr.contains(summary.trim()),
                "business summary became telemetry"
            );
            if let Some(kind) = kind {
                assert!(stderr.contains(kind), "{scenario}: {stderr}");
            }
        }
    }
}

#[cfg(feature = "cognacta-test")]
#[test]
fn telemetry_health_does_not_change_demo_results() {
    use std::time::{Duration, Instant};

    use opentelemetry_proto::tonic::collector::{
        logs::v1::ExportLogsServiceRequest, trace::v1::ExportTraceServiceRequest,
    };
    use prost::Message as _;

    for &(scenario, summary, code, kind) in CASES {
        for mode in ["off", "remote", "unavailable", "stalled"] {
            let receiver = support::Receiver::new(mode == "stalled", None);
            let mut command = command();
            command.args(["cluster-demo", scenario]);
            match mode {
                "off" => {
                    command.env("RUST_LOG", "off");
                }
                "remote" | "stalled" => {
                    command
                        .env("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint)
                        .env(
                            "OTEL_EXPORTER_OTLP_HEADERS",
                            "authorization=SECRET_TELEMETRY",
                        )
                        .env("RUST_LOG", "debug");
                }
                "unavailable" => {
                    command.env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:1");
                }
                _ => unreachable!(),
            }
            let start = Instant::now();
            let output = support::finish(command.spawn().unwrap());
            assert!(
                start.elapsed() < Duration::from_secs(5),
                "{scenario}/{mode}"
            );
            assert_eq!(
                output.status.code(),
                Some(code),
                "{scenario}/{mode}: {output:?}"
            );
            assert_eq!(output.stdout, summary.as_bytes(), "{scenario}/{mode}");
            let mut diagnostics = String::from_utf8_lossy(&output.stderr).into_owned();
            if let Some(kind) = kind {
                assert!(
                    diagnostics.contains(kind),
                    "{scenario}/{mode}: {diagnostics}"
                );
            }
            if mode == "remote" {
                let mut observed = false;
                for request in receiver.requests.try_iter() {
                    assert!(request.headers.contains("SECRET_TELEMETRY"));
                    match request.path.as_str() {
                        "/v1/traces" => {
                            diagnostics.push_str(&format!(
                                "{:?}",
                                ExportTraceServiceRequest::decode(request.body.as_slice()).unwrap()
                            ));
                            observed = true;
                        }
                        "/v1/logs" => {
                            diagnostics.push_str(&format!(
                                "{:?}",
                                ExportLogsServiceRequest::decode(request.body.as_slice()).unwrap()
                            ));
                            observed = true;
                        }
                        path => panic!("unexpected demo telemetry: {path}"),
                    }
                }
                assert!(observed, "no remote telemetry for {scenario}");
            }
            assert!(
                !diagnostics.contains("SECRET"),
                "{scenario}/{mode} leaked private content"
            );
        }
    }
}

#[cfg(all(feature = "cognacta-test", unix))]
#[test]
fn closed_summary_output_fails_once_after_graph_execution() {
    use std::os::unix::net::UnixStream;

    // A closed socket guarantees BrokenPipe before the child can write its one summary.
    let (reader, writer) = UnixStream::pair().unwrap();
    drop(reader);
    let mut command = command();
    command
        .args(["cluster-demo", "react-loop"])
        .env("RUST_LOG", "debug")
        .stdout(std::os::fd::OwnedFd::from(writer));
    let output = support::finish(command.spawn().unwrap());
    assert_eq!(output.status.code(), Some(1));
    assert!(output.stdout.is_empty());
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(stderr.contains("I/O"));
    assert_eq!(stderr.matches("cluster.run.started").count(), 1, "{stderr}");
}

#[cfg(all(feature = "cognacta-test", unix))]
#[test]
fn closed_diagnostic_output_keeps_failure_exit_and_summary() {
    use std::os::unix::net::UnixStream;

    let (reader, writer) = UnixStream::pair().unwrap();
    drop(reader);
    let output = support::finish(
        command()
            .args(["cluster-demo", "node-error"])
            .stderr(std::os::fd::OwnedFd::from(writer))
            .spawn()
            .unwrap(),
    );
    assert_eq!(output.status.code(), Some(1));
    assert_eq!(output.stdout, b"status=failed node=fail value=1\n");
}

#[cfg(all(feature = "cognacta-test", unix))]
fn saturated_socket() -> (
    std::os::unix::net::UnixStream,
    std::os::unix::net::UnixStream,
) {
    use std::{io::Write, os::unix::net::UnixStream};

    let (reader, mut writer) = UnixStream::pair().unwrap();
    writer.set_nonblocking(true).unwrap();
    loop {
        match writer.write(&[b'x'; 8192]) {
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => break,
            Err(error) => panic!("cannot fill stderr fixture: {error}"),
        }
    }
    writer.set_nonblocking(false).unwrap();
    (reader, writer)
}

#[cfg(all(feature = "cognacta-test", unix))]
#[test]
fn saturated_stderr_preserves_demo_exits_with_one_shutdown_budget() {
    use std::time::{Duration, Instant};

    for &(scenario, summary, code, _) in CASES
        .iter()
        .filter(|&&(scenario, _, code, _)| scenario == "react-loop" || code != 0)
    {
        for level in ["debug", "off"] {
            let (_reader, writer) = saturated_socket();
            let start = Instant::now();
            let output = support::finish(
                command()
                    .args(["cluster-demo", scenario])
                    .env("RUST_LOG", level)
                    .stderr(std::os::fd::OwnedFd::from(writer))
                    .spawn()
                    .unwrap(),
            );
            assert!(
                start.elapsed() < Duration::from_secs(5),
                "{scenario}/{level} exceeded the shared shutdown budget"
            );
            assert_eq!(output.status.code(), Some(code), "{scenario}/{level}");
            assert_eq!(output.stdout, summary.as_bytes(), "{scenario}/{level}");
        }
    }
}

#[cfg(all(feature = "cognacta-test", unix))]
#[test]
fn saturated_stderr_and_closed_summary_share_the_shutdown_budget() {
    use std::{
        os::unix::net::UnixStream,
        time::{Duration, Instant},
    };

    let (summary_reader, summary_writer) = UnixStream::pair().unwrap();
    drop(summary_reader);
    let (_reader, writer) = saturated_socket();
    let start = Instant::now();
    let output = support::finish(
        command()
            .args(["cluster-demo", "react-loop"])
            .env("RUST_LOG", "debug")
            .stdout(std::os::fd::OwnedFd::from(summary_writer))
            .stderr(std::os::fd::OwnedFd::from(writer))
            .spawn()
            .unwrap(),
    );
    assert!(start.elapsed() < Duration::from_secs(5));
    assert_eq!(output.status.code(), Some(1));
    assert!(output.stdout.is_empty());
}
