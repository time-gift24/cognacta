use std::{path::PathBuf, time::Duration};

/// Errors from configuration, authentication, and provider transport boundaries.
/// Messages must contain safe diagnostics, never credentials or raw request data.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("无法读取配置文件 {path}", path = .path.display())]
    ConfigRead {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },
    #[error("TOML 配置解析失败")]
    ConfigParse(#[source] toml::de::Error),
    #[error("配置项 {field} 无效: {message}")]
    InvalidConfig { field: String, message: String },
    #[error("不支持协议 {protocol}")]
    UnsupportedProtocol { protocol: String },
    #[error("无法读取凭据环境变量 {name}")]
    Environment {
        name: String,
        #[source]
        source: std::env::VarError,
    },
    #[error("请求头 {name} 无效")]
    InvalidHeader {
        name: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("鉴权失败: {message}")]
    Authentication {
        message: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    #[error("HTTP 传输失败")]
    Transport(#[source] reqwest::Error),
    #[error("上游 HTTP {status}: {message}")]
    Http {
        status: u16,
        message: String,
        request_id: Option<String>,
        retry_after: Option<Duration>,
        /// A diagnostic body read failure does not replace the HTTP status.
        #[source]
        source: Option<reqwest::Error>,
    },
    #[error("响应无效: {message}")]
    InvalidResponse {
        message: String,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    #[error("流式响应缺少终止标志")]
    Truncated,
    #[error("领域对象校验失败: {0}")]
    Domain(#[source] cognacta_core::Error),
}
