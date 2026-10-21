use std::{collections::BTreeMap, fmt, path::Path};

use cognacta_core::Provider;
use serde::Deserialize;

use crate::Error;

/// Parsed configuration; call [`crate::build_models`] to validate the whole catalog.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProvidersConfig {
    pub providers: Vec<ProviderConfig>,
    pub models: Vec<ModelConfig>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ProviderConfig {
    pub name: String,
    pub base_url: String,
    #[serde(default)]
    pub headers: BTreeMap<String, String>,
    /// Sends `Authorization: Bearer <key>`; cannot be combined with custom auth.
    pub api_key: Option<ApiKeyConfig>,
    #[serde(default)]
    pub auth: AuthConfig,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ModelConfig {
    /// Explicitly references [`ProviderConfig::name`], independent of TOML order.
    pub provider: String,
    pub name: String,
    pub protocol: String,
}

/// A literal API key or an environment variable resolved by [`crate::build_models`].
#[derive(Deserialize)]
#[serde(untagged, deny_unknown_fields)]
pub enum ApiKeyConfig {
    Literal(String),
    Env { env: String },
}

impl fmt::Debug for ApiKeyConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Literal(_) => f.write_str("Literal([REDACTED])"),
            Self::Env { env } => f.debug_struct("Env").field("env", env).finish(),
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum AuthConfig {
    #[default]
    None,
    HeaderEnv {
        name: String,
        #[serde(default)]
        prefix: String,
        env: String,
    },
}

impl ProvidersConfig {
    /// Reads TOML without resolving credentials or making network requests.
    pub fn load(path: impl AsRef<Path>) -> Result<Self, Error> {
        let path = path.as_ref();
        let text = std::fs::read_to_string(path).map_err(|source| Error::ConfigRead {
            path: path.to_owned(),
            source,
        })?;
        Self::from_toml(&text)
    }

    pub fn from_toml(text: &str) -> Result<Self, Error> {
        toml::from_str(text).map_err(Error::ConfigParse)
    }
}

impl TryFrom<&ProviderConfig> for Provider {
    type Error = Error;

    fn try_from(config: &ProviderConfig) -> Result<Self, Self::Error> {
        Provider::new(config.name.clone(), config.base_url.clone()).map_err(Error::Domain)
    }
}

#[cfg(test)]
mod tests {
    use std::error::Error as _;

    use super::*;

    const CONFIG: &str = r#"
[[providers]]
name = "gateway"
base_url = "https://example.test/proxy/v1"
auth = { type = "header_env", name = "authorization", env = "UNRESOLVED_TEST_KEY" }
[[models]]
provider = "gateway"
name = "model-a"
protocol = "openai.chat-completions"
"#;

    #[test]
    fn parsing_and_conversion_do_not_resolve_credentials() {
        let config = ProvidersConfig::from_toml(CONFIG).unwrap();
        let provider = Provider::try_from(&config.providers[0]).unwrap();
        assert_eq!(provider.name(), "gateway");
        assert!(provider.base_url().contains("/proxy/v1"));
        assert_eq!(config.models[0].provider, "gateway");
        assert_eq!(config.models[0].name, "model-a");
    }

    #[test]
    fn api_key_accepts_literal_or_env_and_redacts_literal_debug() {
        let auth = r#"auth = { type = "header_env", name = "authorization", env = "UNRESOLVED_TEST_KEY" }"#;
        let literal =
            ProvidersConfig::from_toml(&CONFIG.replace(auth, r#"api_key = "fake-secret-key""#))
                .unwrap();
        assert!(matches!(
            &literal.providers[0].api_key,
            Some(ApiKeyConfig::Literal(key)) if key == "fake-secret-key"
        ));
        assert!(matches!(literal.providers[0].auth, AuthConfig::None));
        assert!(!format!("{literal:?}").contains("fake-secret-key"));

        let env = ProvidersConfig::from_toml(
            &CONFIG.replace(auth, r#"api_key = { env = "UNRESOLVED_TEST_KEY" }"#),
        )
        .unwrap();
        assert!(matches!(
            &env.providers[0].api_key,
            Some(ApiKeyConfig::Env { env }) if env == "UNRESOLVED_TEST_KEY"
        ));
        for invalid in [
            "api_key = 42",
            "api_key = {}",
            r#"api_key = { env = "KEY", value = "fake-secret-key" }"#,
        ] {
            let error = ProvidersConfig::from_toml(&CONFIG.replace(auth, invalid)).unwrap_err();
            assert!(matches!(error, Error::ConfigParse(_)));
            assert!(!error.to_string().contains("fake-secret-key"));
        }
    }

    #[test]
    fn rejects_unknown_duplicate_missing_and_malformed_fields() {
        for text in [
            CONFIG.replace("name = \"gateway\"", "name = \"gateway\"\nunknown = true"),
            CONFIG.replace("name = \"gateway\"", "name = \"gateway\"\nname = \"other\""),
            CONFIG.replace("protocol = \"openai.chat-completions\"", ""),
            CONFIG.replace("provider = \"gateway\"", ""),
            CONFIG.replace("[[models]]", "[[providers.models]]"),
            CONFIG.replace("auth = {", "auth = { unexpected = true,"),
            "providers = [".into(),
        ] {
            let error = ProvidersConfig::from_toml(&text).unwrap_err();
            assert!(matches!(error, Error::ConfigParse(_)));
            assert!(error.source().is_some());
        }
        let mut config = ProvidersConfig::from_toml(CONFIG).unwrap();
        config.providers[0].base_url = "https://user:secret@example.test/v1".into();
        let error = Provider::try_from(&config.providers[0]).unwrap_err();
        assert!(matches!(error, Error::Domain(_)));
        assert!(error.source().is_some());
        assert!(!error.to_string().contains("secret"));
    }
}
