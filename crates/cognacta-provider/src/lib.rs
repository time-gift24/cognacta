//! Runtime provider configuration, authentication, and streaming LLM adapters.
//!
//! Supply a shared [`reqwest::Client`] with automatic redirects and retries
//! disabled, then use [`build_models`] or assemble [`HttpAccess`] directly.
//! Protocol calls return [`cognacta_core::Error`]; configuration and HTTP access
//! return this crate's [`Error`].
//! With `rustls-no-provider`, callers must configure their client's TLS crypto
//! provider, for example with `ClientBuilder::tls_backend_preconfigured`.

mod auth;
mod config;
mod error;
mod http;
mod openai;
mod runtime;

pub use auth::{HeaderAuth, RequestAuth};
pub use config::{ApiKeyConfig, AuthConfig, ModelConfig, ProviderConfig, ProvidersConfig};
pub use error::Error;
pub use http::HttpAccess;
pub use openai::OpenAiChatCompletions;
pub use runtime::build_models;

#[cfg(test)]
#[path = "../tests/support/client.rs"]
mod test_support;

#[cfg(test)]
fn test_client() -> reqwest::Client {
    test_support::client_builder().build().unwrap()
}
