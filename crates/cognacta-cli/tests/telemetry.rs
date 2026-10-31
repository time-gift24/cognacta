#[path = "../../cognacta-collector/tests/support/mod.rs"]
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
#[test]
fn normal_command_and_config_errors_preserve_exit_behavior() {
    let receiver = Receiver::new(false, None);
    let mut plain = command();
    let reference = finish(plain.spawn().unwrap());
    assert!(reference.status.success());
    let mut invalid = command();
    invalid
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", &receiver.endpoint)
        .env("OTEL_EXPORTER_OTLP_PROTOCOL", "invalid");
    let output = finish(invalid.spawn().unwrap());
    assert_eq!(reference.stdout, output.stdout);
    assert_eq!(reference.status, output.status);
    assert!(String::from_utf8_lossy(&output.stderr).contains("collector.local_only"));
    if let Ok(request) = receiver.requests.try_recv() {
        panic!(
            "unexpected request {} {} {:?}",
            request.path, request.headers, request.body
        );
    }
    let mut missing = command();
    missing.arg("--not-an-option");
    let baseline = finish(missing.spawn().unwrap());
    let mut remote = command();
    remote
        .arg("--not-an-option")
        .env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://127.0.0.1:1");
    let output = finish(remote.spawn().unwrap());
    assert_eq!(baseline.status, output.status);
    assert_eq!(baseline.stdout, output.stdout);
}
