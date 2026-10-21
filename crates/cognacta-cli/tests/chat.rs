#![cfg(feature = "cognacta-test")]

// All HTTP responses and credentials in these tests are hand-written fixtures.
use std::{
    fs,
    io::{BufRead, BufReader, Read, Write},
    net::{TcpListener, TcpStream},
    path::PathBuf,
    process::{Child, Command, ExitStatus, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc::{self, Receiver},
    },
    thread,
    time::{Duration, Instant},
};

use serde_json::{Value, json};

const LIMIT: Duration = Duration::from_secs(10);

#[derive(Clone, Copy)]
enum Auth {
    HeaderEnv,
    ApiKey,
    ApiKeyEnv,
}

struct ConfigFile {
    path: PathBuf,
    use_env_auth: bool,
}

impl ConfigFile {
    fn new(address: std::net::SocketAddr) -> Self {
        Self::with_auth(address, Auth::HeaderEnv)
    }

    fn with_auth(address: std::net::SocketAddr, auth: Auth) -> Self {
        static NEXT: AtomicU64 = AtomicU64::new(0);
        let directory = std::env::temp_dir().join(format!(
            "cognacta-cli-test-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory.join("providers.toml");
        let use_env_auth = !matches!(auth, Auth::ApiKey);
        let auth = match auth {
            Auth::HeaderEnv => {
                r#"auth = { type = "header_env", name = "authorization", prefix = "Bearer ", env = "COGNACTA_CLI_FIXTURE_KEY" }"#
            }
            Auth::ApiKey => r#"api_key = "not-a-real-key""#,
            Auth::ApiKeyEnv => r#"api_key = { env = "COGNACTA_CLI_FIXTURE_KEY" }"#,
        };
        fs::write(
            &path,
            format!(
                r#"[[providers]]
name = "fixture"
base_url = "http://{address}/prefix/v1"
headers = {{ x-tenant-id = "fixture-tenant" }}
{auth}
[[models]]
provider = "fixture"
name = "fixture-model"
protocol = "openai.chat-completions"
"#
            ),
        )
        .unwrap();
        Self { path, use_env_auth }
    }
}

impl Drop for ConfigFile {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(self.path.parent().unwrap());
    }
}

struct CliProcess {
    child: Child,
    stdout: Receiver<u8>,
    stderr: Receiver<String>,
    captured: Vec<u8>,
}

impl CliProcess {
    fn start(config: &ConfigFile, input: &str) -> Self {
        let mut command = Command::new(env!("CARGO_BIN_EXE_cognacta-cli"));
        for (key, _) in std::env::vars_os() {
            if key.to_string_lossy().starts_with("OTEL_") || key == "RUST_LOG" {
                command.env_remove(key);
            }
        }
        command
            .args(["chat", "--config"])
            .arg(&config.path)
            .args(["--provider", "fixture", "--model", "fixture-model"])
            .env_remove("COGNACTA_CLI_FIXTURE_KEY")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if config.use_env_auth {
            command.env("COGNACTA_CLI_FIXTURE_KEY", "not-a-real-key");
        }
        let mut child = command.spawn().unwrap();
        child
            .stdin
            .take()
            .unwrap()
            .write_all(input.as_bytes())
            .unwrap();
        let mut stdout = child.stdout.take().unwrap();
        let (stdout_tx, stdout_rx) = mpsc::channel();
        thread::spawn(move || {
            let mut byte = [0];
            while stdout.read_exact(&mut byte).is_ok() {
                if stdout_tx.send(byte[0]).is_err() {
                    break;
                }
            }
        });
        let mut stderr = child.stderr.take().unwrap();
        let (stderr_tx, stderr_rx) = mpsc::channel();
        thread::spawn(move || {
            let mut text = String::new();
            stderr.read_to_string(&mut text).unwrap();
            let _ = stderr_tx.send(text);
        });
        Self {
            child,
            stdout: stdout_rx,
            stderr: stderr_rx,
            captured: Vec::new(),
        }
    }

    fn wait_for_output(&mut self, expected: &str) {
        let deadline = Instant::now() + LIMIT;
        while !String::from_utf8_lossy(&self.captured).contains(expected) {
            let remaining = deadline.saturating_duration_since(Instant::now());
            self.captured.push(
                self.stdout
                    .recv_timeout(remaining)
                    .expect("first delta was not flushed before response completion"),
            );
        }
    }

    fn finish(mut self) -> (ExitStatus, String, String) {
        let deadline = Instant::now() + LIMIT;
        let status = loop {
            if let Some(status) = self.child.try_wait().unwrap() {
                break status;
            }
            assert!(Instant::now() < deadline, "CLI did not terminate");
            thread::sleep(Duration::from_millis(5));
        };
        loop {
            match self.stdout.recv_timeout(LIMIT) {
                Ok(byte) => self.captured.push(byte),
                Err(mpsc::RecvTimeoutError::Disconnected) => break,
                Err(mpsc::RecvTimeoutError::Timeout) => panic!("CLI stdout did not close"),
            }
        }
        let stderr = self.stderr.recv_timeout(LIMIT).unwrap();
        (
            status,
            String::from_utf8_lossy(&self.captured).into_owned(),
            stderr,
        )
    }
}

impl Drop for CliProcess {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

fn accept(listener: &TcpListener) -> TcpStream {
    listener.set_nonblocking(true).unwrap();
    let deadline = Instant::now() + LIMIT;
    loop {
        match listener.accept() {
            Ok((stream, _)) => {
                // Accepted sockets inherit nonblocking mode on macOS.
                stream.set_nonblocking(false).unwrap();
                stream.set_read_timeout(Some(LIMIT)).unwrap();
                stream.set_write_timeout(Some(LIMIT)).unwrap();
                return stream;
            }
            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                assert!(Instant::now() < deadline, "CLI did not send request");
                thread::sleep(Duration::from_millis(5));
            }
            Err(error) => panic!("accept failed: {error}"),
        }
    }
}

fn read_request(stream: &TcpStream) -> Value {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).unwrap();
    assert_eq!(line, "POST /prefix/v1/chat/completions HTTP/1.1\r\n");
    let mut headers = Vec::new();
    loop {
        line.clear();
        reader.read_line(&mut line).unwrap();
        if line == "\r\n" {
            break;
        }
        assert!(!line.is_empty(), "unexpected request EOF");
        if let Some((name, value)) = line.trim_end().split_once(':')
            && name.eq_ignore_ascii_case("authorization")
        {
            assert_eq!(value.trim_start(), "Bearer not-a-real-key");
        }
        headers.push(line.trim_end().to_ascii_lowercase());
    }
    assert!(
        headers
            .iter()
            .any(|line| line == "authorization: bearer not-a-real-key")
    );
    assert!(
        headers
            .iter()
            .any(|line| line == "x-tenant-id: fixture-tenant")
    );
    let length: usize = headers
        .iter()
        .find_map(|line| line.strip_prefix("content-length: "))
        .unwrap()
        .parse()
        .unwrap();
    let mut body = vec![0; length];
    reader.read_exact(&mut body).unwrap();
    let body: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(body["model"], "fixture-model");
    assert_eq!(body["stream"], true);
    body
}

fn begin_response(stream: &mut TcpStream) {
    stream
        .write_all(
            b"HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n",
        )
        .unwrap();
}

fn delta(stream: &mut TcpStream, text: &str) {
    let chunk = json!({
        "id": "fixture-response", "model": "fixture-model", "created": 0,
        "choices": [{"index": 0, "delta": {"content": text}, "finish_reason": null}]
    });
    write!(stream, "data: {chunk}\n\n").unwrap();
    stream.flush().unwrap();
}

fn complete(stream: &mut TcpStream) {
    let chunk = json!({
        "id": "fixture-response", "model": "fixture-model", "created": 0,
        "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}]
    });
    write!(stream, "data: {chunk}\n\ndata: [DONE]\n\n").unwrap();
    stream.flush().unwrap();
}

#[test]
fn two_turns_flush_before_completion_and_preserve_history() {
    for auth in [Auth::HeaderEnv, Auth::ApiKey, Auth::ApiKeyEnv] {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let config = ConfigFile::with_auth(listener.local_addr().unwrap(), auth);
        let (ack_tx, ack_rx) = mpsc::channel();
        let (done_tx, done_rx) = mpsc::channel();
        let server = thread::spawn(move || {
            let mut first = accept(&listener);
            let body = read_request(&first);
            assert_eq!(
                body["messages"],
                json!([{"role": "user", "content": "  第一问  "}])
            );
            begin_response(&mut first);
            delta(&mut first, "第一段");
            // Only the parent observing CLI stdout unlocks the rest of the response.
            ack_rx
                .recv_timeout(LIMIT)
                .expect("CLI buffered the first delta");
            delta(&mut first, "完整回复");
            complete(&mut first);
            drop(first);
            let mut second = accept(&listener);
            let body = read_request(&second);
            assert_eq!(
                body["messages"],
                json!([
                    {"role": "user", "content": "  第一问  "},
                    {"role": "assistant", "content": "第一段完整回复"},
                    {"role": "user", "content": "第二问"}
                ])
            );
            begin_response(&mut second);
            delta(&mut second, "第二轮回复");
            complete(&mut second);
            done_tx.send(()).unwrap();
        });
        let mut cli = CliProcess::start(&config, "\n \t\n  第一问  \r\n第二问\n/exit\n");
        cli.wait_for_output("第一段");
        ack_tx.send(()).unwrap();
        let (status, stdout, stderr) = cli.finish();
        assert!(status.success(), "{stderr}");
        assert!(stdout.contains("第一段完整回复"));
        assert!(stdout.contains("第二轮回复"));
        assert!(stderr.contains("generation.completed"));
        assert!(!stderr.contains("第一段完整回复"));
        assert!(!stderr.contains("not-a-real-key"));
        done_rx.recv_timeout(LIMIT).unwrap();
        server.join().unwrap();
    }
}

#[test]
fn http_and_truncated_stream_errors_exit_without_next_turn() {
    for auth in [Auth::HeaderEnv, Auth::ApiKey, Auth::ApiKeyEnv] {
        for truncated in [false, true] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let config = ConfigFile::with_auth(listener.local_addr().unwrap(), auth);
            let (done_tx, done_rx) = mpsc::channel();
            let server = thread::spawn(move || {
                let mut stream = accept(&listener);
                read_request(&stream);
                if truncated {
                    begin_response(&mut stream);
                    delta(&mut stream, "部分回复");
                } else {
                    let body = r#"{"error":{"message":"fixture denied not-a-real-key","type":"invalid_request_error"}}"#;
                    write!(stream, "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len()).unwrap();
                }
                drop(stream);
                done_tx.send(listener).unwrap();
            });
            let (status, stdout, stderr) =
                CliProcess::start(&config, "第一问\n不应发送第二问\n").finish();
            assert!(!status.success());
            assert!(!stderr.is_empty());
            assert!(!stderr.contains("not-a-real-key"));
            assert_eq!(stdout.contains("部分回复"), truncated);
            let listener = done_rx.recv_timeout(LIMIT).unwrap();
            assert!(
                matches!(listener.accept(), Err(error) if error.kind() == std::io::ErrorKind::WouldBlock)
            );
            server.join().unwrap();
        }
    }
}

#[test]
fn input_eof_and_exit_do_not_send_a_request() {
    for input in ["", "/exit\n", "  \n"] {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        listener.set_nonblocking(true).unwrap();
        let config = ConfigFile::new(listener.local_addr().unwrap());
        let (status, _, stderr) = CliProcess::start(&config, input).finish();
        assert!(status.success(), "{stderr}");
        assert!(
            matches!(listener.accept(), Err(error) if error.kind() == std::io::ErrorKind::WouldBlock)
        );
    }
}
