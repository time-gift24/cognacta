#[allow(dead_code)]
mod support;

use std::process::{Command, Stdio};
use support::*;

fn command() -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_cognacta-cli"));
    clean_env(&mut command);
    command
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    command
}

#[cfg(not(feature = "dev"))]
#[test]
fn default_build_hides_and_rejects_graph_check() {
    let help = finish(command().arg("--help").spawn().unwrap());
    assert!(help.status.success());
    assert!(!String::from_utf8_lossy(&help.stdout).contains("graph-check"));
    let output = finish(command().arg("graph-check").arg("all").spawn().unwrap());
    assert_eq!(output.status.code(), Some(2));
}

#[cfg(feature = "dev")]
#[test]
fn dev_help_arguments_all_and_expected_failures() {
    let help = finish(command().arg("graph-check").arg("--help").spawn().unwrap());
    assert!(help.status.success());
    let help = String::from_utf8_lossy(&help.stdout);
    for scenario in [
        "chain",
        "diamond",
        "branch",
        "fanout",
        "transition",
        "settlement",
        "all",
    ] {
        assert!(help.contains(scenario), "missing {scenario} in {help}");
    }
    for arguments in [vec!["graph-check"], vec!["graph-check", "unknown"]] {
        let output = finish(command().args(arguments).spawn().unwrap());
        assert_eq!(output.status.code(), Some(2));
    }

    let branch = finish(command().args(["graph-check", "branch"]).spawn().unwrap());
    assert!(branch.status.success(), "{branch:?}");
    let branch = String::from_utf8_lossy(&branch.stdout);
    assert!(branch.contains("case=branch/all run=failed check=PASS waves=2"));

    let all = finish(command().args(["graph-check", "all"]).spawn().unwrap());
    assert!(all.status.success(), "{all:?}");
    let all = String::from_utf8_lossy(&all.stdout);
    assert_eq!(all.matches("case=").count(), 16);
    assert!(all.contains("summary cases=16 passed=16 failed=0"));
}

#[cfg(feature = "dev")]
#[test]
fn telemetry_failure_does_not_change_graph_report() {
    let baseline = finish(command().args(["graph-check", "chain"]).spawn().unwrap());
    let mut remote = command();
    remote
        .args(["graph-check", "chain"])
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:1");
    let unavailable = finish(remote.spawn().unwrap());
    assert_eq!(baseline.status, unavailable.status);
    assert_eq!(baseline.stdout, unavailable.stdout);
}

#[cfg(all(feature = "dev", unix))]
#[test]
fn report_io_failure_exits_one() {
    let mut child = command().args(["graph-check", "chain"]).spawn().unwrap();
    drop(child.stdout.take());
    let output = finish(child);
    assert_eq!(output.status.code(), Some(1));
}

#[cfg(feature = "dev")]
#[test]
fn stderr_backpressure_does_not_change_graph_report() {
    let baseline = finish(command().args(["graph-check", "chain"]).spawn().unwrap());
    let mut remote = command();
    remote
        .args(["graph-check", "chain"])
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:1")
        .env("OTEL_EXPORTER_OTLP_PROTOCOL", "invalid");
    let mut child = remote.spawn().unwrap();
    drop(child.stderr.take());
    let output = finish(child);
    assert_eq!(baseline.status, output.status);
    assert_eq!(baseline.stdout, output.stdout);
}
