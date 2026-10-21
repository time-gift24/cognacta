use std::sync::Arc;
use tracing::Instrument;

use reqwest::{
    Client, Request, Response,
    header::{ACCEPT, CONTENT_TYPE, HeaderMap},
};

use crate::{Error, RequestAuth, auth::fingerprint};

/// Shared transport and authentication for a provider.
///
/// The caller must disable automatic redirects and retries on `client` before
/// construction. A prebuilt reqwest client does not expose these policies.
pub struct HttpAccess {
    client: Client,
    headers: HeaderMap,
    auth: Option<Arc<dyn RequestAuth>>,
    replay_scope: String,
}

#[bon::bon]
impl HttpAccess {
    #[builder(start_fn = builder)]
    pub fn new(
        client: Client,
        #[builder(default)] mut headers: HeaderMap,
        auth: Option<Arc<dyn RequestAuth>>,
    ) -> Result<Self, Error> {
        validate_protocol_headers(&headers, false)?;
        for value in headers.values_mut() {
            value.set_sensitive(true);
        }
        let mut entries: Vec<_> = headers
            .iter()
            .map(|(name, value)| (name.as_str(), value.as_bytes()))
            .collect();
        entries.sort_unstable();
        let scope = auth.as_ref().map_or("none", |auth| auth.replay_scope());
        let replay_scope = fingerprint(
            [b"http-access".as_slice(), scope.as_bytes()]
                .into_iter()
                .chain(
                    entries
                        .iter()
                        .flat_map(|(name, value)| [name.as_bytes(), *value]),
                ),
        );
        Ok(Self {
            client,
            headers,
            auth,
            replay_scope,
        })
    }

    pub fn replay_scope(&self) -> &str {
        &self.replay_scope
    }

    /// Merges configured headers and applies authentication before sending once.
    /// Non-success HTTP responses remain available to the protocol adapter.
    pub async fn send(&self, mut request: Request) -> Result<Response, Error> {
        request.headers_mut().extend(self.headers.clone());
        if let Some(auth) = &self.auth {
            auth.apply(&mut request).await?;
        }
        // Read-only validation: never change a request after it may be signed.
        validate_protocol_headers(request.headers(), true)?;
        let span = tracing::info_span!(
            "provider.http",
            http.request.method = request.method().as_str(),
            http.response.status_code = tracing::field::Empty
        );
        let result = self.client.execute(request).instrument(span.clone()).await;
        if let Ok(response) = &result {
            span.record("http.response.status_code", response.status().as_u16());
        }
        result.map_err(Error::Transport)
    }
}

pub(crate) fn validate_protocol_headers(headers: &HeaderMap, required: bool) -> Result<(), Error> {
    for (name, expected) in [
        (CONTENT_TYPE, "application/json"),
        (ACCEPT, "text/event-stream"),
    ] {
        let values: Vec<_> = headers.get_all(&name).iter().collect();
        if values.is_empty() && !required {
            continue;
        }
        let valid = values.len() == 1
            && values[0].to_str().is_ok_and(|value| {
                if name == CONTENT_TYPE {
                    value
                        .split(';')
                        .next()
                        .is_some_and(|media| media.trim().eq_ignore_ascii_case(expected))
                } else {
                    value.trim().eq_ignore_ascii_case(expected)
                }
            });
        if !valid {
            return Err(Error::InvalidConfig {
                field: format!("headers.{name}"),
                message: format!("必须使用 {expected}"),
            });
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use reqwest::header::HeaderValue;

    use super::*;

    #[test]
    fn constructor_and_builder_reject_conflicting_headers() {
        let mut headers = HeaderMap::new();
        headers.insert(ACCEPT, HeaderValue::from_static("application/json"));
        assert!(matches!(
            HttpAccess::new(crate::test_client(), headers.clone(), None),
            Err(Error::InvalidConfig { .. })
        ));
        assert!(matches!(
            HttpAccess::builder()
                .client(crate::test_client())
                .headers(headers)
                .build(),
            Err(Error::InvalidConfig { .. })
        ));
        assert!(
            HttpAccess::builder()
                .client(crate::test_client())
                .build()
                .is_ok()
        );
    }

    #[test]
    fn scope_includes_tenant_headers() {
        let mut headers = HeaderMap::new();
        headers.insert("x-tenant", HeaderValue::from_static("tenant-a"));
        let a = HttpAccess::new(crate::test_client(), headers.clone(), None).unwrap();
        headers.insert("x-tenant", HeaderValue::from_static("tenant-b"));
        let b = HttpAccess::new(crate::test_client(), headers, None).unwrap();
        assert_ne!(a.replay_scope(), b.replay_scope());
        assert!(!a.replay_scope().contains("tenant-a"));
    }
}
