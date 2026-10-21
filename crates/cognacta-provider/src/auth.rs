use async_trait::async_trait;
use reqwest::{
    Request,
    header::{HeaderName, HeaderValue},
};
use sha2::{Digest, Sha256};

use crate::Error;

/// Applies authentication after the protocol body and custom headers are final.
#[async_trait]
pub trait RequestAuth: Send + Sync {
    /// Opaque account/tenant scope. Never return the raw credential here.
    fn replay_scope(&self) -> &str;

    async fn apply(&self, request: &mut Request) -> Result<(), Error>;
}

/// A validated, sensitive authentication header loaded once at assembly time.
pub struct HeaderAuth {
    name: HeaderName,
    value: HeaderValue,
    replay_scope: String,
}

impl HeaderAuth {
    pub fn new(name: HeaderName, mut value: HeaderValue) -> Self {
        value.set_sensitive(true);
        let replay_scope = fingerprint([
            b"header-auth".as_slice(),
            name.as_str().as_bytes(),
            value.as_bytes(),
        ]);
        Self {
            name,
            value,
            replay_scope,
        }
    }
}

#[async_trait]
impl RequestAuth for HeaderAuth {
    fn replay_scope(&self) -> &str {
        &self.replay_scope
    }

    async fn apply(&self, request: &mut Request) -> Result<(), Error> {
        request
            .headers_mut()
            .insert(self.name.clone(), self.value.clone());
        Ok(())
    }
}

pub(crate) fn fingerprint<'a>(parts: impl IntoIterator<Item = &'a [u8]>) -> String {
    let mut hash = Sha256::new();
    for part in parts {
        hash.update((part.len() as u64).to_be_bytes());
        hash.update(part);
    }
    hash.finalize()
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn header_auth_replaces_value_and_hides_credentials() {
        let auth = HeaderAuth::new(
            HeaderName::from_static("x-api-key"),
            HeaderValue::from_static("fake-key"),
        );
        let changed = HeaderAuth::new(
            HeaderName::from_static("x-api-key"),
            HeaderValue::from_static("other-key"),
        );
        assert_ne!(auth.replay_scope(), changed.replay_scope());
        assert!(!auth.replay_scope().contains("fake-key"));
        let mut request = Request::new(
            reqwest::Method::POST,
            "http://example.test/".parse().unwrap(),
        );
        request
            .headers_mut()
            .insert("x-api-key", HeaderValue::from_static("old"));
        auth.apply(&mut request).await.unwrap();
        assert_eq!(request.headers()["x-api-key"], "fake-key");
        assert!(request.headers()["x-api-key"].is_sensitive());
    }
}
