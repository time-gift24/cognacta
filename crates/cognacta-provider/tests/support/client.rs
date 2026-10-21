pub fn client_builder() -> reqwest::ClientBuilder {
    // These fixtures use local HTTP and do not need any trusted TLS roots.
    let tls = rustls::ClientConfig::builder_with_provider(
        rustls::crypto::ring::default_provider().into(),
    )
    .with_safe_default_protocol_versions()
    .unwrap()
    .with_root_certificates(rustls::RootCertStore::empty())
    .with_no_client_auth();
    reqwest::Client::builder().tls_backend_preconfigured(tls)
}
