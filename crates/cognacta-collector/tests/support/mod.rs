// Local HTTP fixture shared by Collector and CLI integration targets. No external services.
use std::{
    io::{BufRead, BufReader, Read, Write},
    net::TcpListener,
    process::{Child, Command, Output},
    sync::{
        Arc,
        atomic::{AtomicBool, Ordering},
        mpsc,
    },
    thread,
    time::{Duration, Instant},
};

pub const LIMIT: Duration = Duration::from_secs(12);
#[derive(Debug)]
pub struct Request {
    pub path: String,
    pub headers: String,
    pub body: Vec<u8>,
}
pub struct Receiver {
    pub endpoint: String,
    pub requests: mpsc::Receiver<Request>,
    stop: Arc<AtomicBool>,
    worker: Option<thread::JoinHandle<()>>,
}
impl Receiver {
    pub fn new(stall: bool, response: Option<String>) -> Self {
        Self::with_response_bytes(stall, response.map(String::into_bytes))
    }
    pub fn with_response_bytes(stall: bool, response: Option<Vec<u8>>) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        listener.set_nonblocking(true).unwrap();
        let stop = Arc::new(AtomicBool::new(false));
        let stopped = stop.clone();
        let (tx, requests) = mpsc::channel();
        let worker = thread::spawn(move || {
            let mut workers = vec![];
            while !stopped.load(Ordering::Relaxed) {
                match listener.accept() {
                    Ok((mut stream, _)) => {
                        stream.set_nonblocking(false).unwrap();
                        stream.set_read_timeout(Some(LIMIT)).unwrap();
                        stream.set_write_timeout(Some(LIMIT)).unwrap();
                        let tx = tx.clone();
                        let stopped = stopped.clone();
                        let response = response.clone();
                        workers.push(thread::spawn(move || {
                            let mut reader=BufReader::new(stream.try_clone().unwrap()); let mut line=String::new();
                            if reader.read_line(&mut line).is_err() || line.is_empty() { return }
                            let path=line.split_whitespace().nth(1).unwrap().to_owned();
                            let mut headers=String::new();let mut length=0;
                            loop {
                                line.clear();reader.read_line(&mut line).unwrap();
                                if line=="\r\n" || line.is_empty() { break }
                                if let Some(n)=line.to_ascii_lowercase().strip_prefix("content-length:") { length=n.trim().parse::<usize>().unwrap(); }
                                headers.push_str(&line);
                            }
                            assert!(length<8*1024*1024);
                            let mut body=vec![0;length];reader.read_exact(&mut body).unwrap();
                            let _=tx.send(Request { path,headers,body });
                            if stall { while !stopped.load(Ordering::Relaxed) { thread::sleep(Duration::from_millis(5)); } return }
                            let response=response.unwrap_or_else(|| b"HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n".to_vec());
                            let _=stream.write_all(&response);
                        }));
                    }
                    Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                        thread::sleep(Duration::from_millis(2))
                    }
                    Err(e) => panic!("fixture accept failed: {e}"),
                }
            }
            for worker in workers {
                worker.join().unwrap();
            }
        });
        Self {
            endpoint,
            requests,
            stop,
            worker: Some(worker),
        }
    }
}
impl Drop for Receiver {
    fn drop(&mut self) {
        self.stop.store(true, Ordering::Relaxed);
        self.worker.take().unwrap().join().unwrap();
    }
}
pub fn clean_env(command: &mut Command) {
    for (key, _) in std::env::vars_os() {
        if key.to_string_lossy().starts_with("OTEL_") || key == "RUST_LOG" {
            command.env_remove(key);
        }
    }
    command.env("NO_PROXY", "127.0.0.1,localhost");
}
pub fn finish(mut child: Child) -> Output {
    let deadline = Instant::now() + LIMIT;
    loop {
        if child.try_wait().unwrap().is_some() {
            return child.wait_with_output().unwrap();
        }
        if Instant::now() >= deadline {
            let _ = child.kill();
            let output = child.wait_with_output().unwrap();
            panic!("child timeout: {output:?}");
        }
        thread::sleep(Duration::from_millis(5));
    }
}
