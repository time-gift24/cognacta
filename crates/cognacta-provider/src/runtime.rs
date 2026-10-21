use std::{collections::HashMap, env::VarError, sync::Arc};

use cognacta_core::{Model, Protocol, Provider};
use reqwest::{
    Client,
    header::{HeaderMap, HeaderName, HeaderValue},
};

use crate::{
    ApiKeyConfig, AuthConfig, Error, HeaderAuth, HttpAccess, OpenAiChatCompletions,
    ProvidersConfig, RequestAuth,
};

/// Validates the entire catalog and resolves credentials once, without sending
/// requests. The shared client must have automatic retry and redirects disabled.
pub fn build_models(
    config: ProvidersConfig,
    client: Client,
) -> Result<HashMap<(String, String), Model>, Error> {
    build_with_env(config, client, |name| std::env::var(name))
}

fn invalid(field: &str, message: &str) -> Error {
    Error::InvalidConfig {
        field: field.into(),
        message: message.into(),
    }
}

fn build_with_env(
    config: ProvidersConfig,
    client: Client,
    lookup: impl Fn(&str) -> Result<String, VarError>,
) -> Result<HashMap<(String, String), Model>, Error> {
    if config.providers.is_empty() {
        return Err(invalid("providers", "至少需要一个 Provider"));
    }
    if config.models.is_empty() {
        return Err(invalid("models", "至少需要一个模型"));
    }
    let mut providers = HashMap::new();
    for config in config.providers {
        let provider = Arc::new(Provider::try_from(&config)?);
        if providers.contains_key(&config.name) {
            return Err(invalid("providers.name", "Provider 名称重复"));
        }
        let mut headers = HeaderMap::new();
        for (name, value) in &config.headers {
            let parsed_name = header_name(name)?;
            if headers.contains_key(&parsed_name) {
                return Err(invalid("providers.headers", "头名称不区分大小写，不得重复"));
            }
            let mut value = header_value(name, value)?;
            value.set_sensitive(true);
            headers.insert(parsed_name, value);
        }
        let credential = match (&config.api_key, &config.auth) {
            (Some(_), AuthConfig::HeaderEnv { .. }) => {
                return Err(invalid("providers.api_key", "不能与自定义 auth 同时配置"));
            }
            (Some(key), AuthConfig::None) => {
                let value = match key {
                    ApiKeyConfig::Literal(value) => value.clone(),
                    ApiKeyConfig::Env { env } => {
                        resolve_env(env, "providers.api_key.env", &lookup)?
                    }
                };
                Some(("authorization", "Bearer ", value, "providers.api_key"))
            }
            (None, AuthConfig::HeaderEnv { name, prefix, env }) => Some((
                name.as_str(),
                prefix.as_str(),
                resolve_env(env, "providers.auth.env", &lookup)?,
                "providers.auth.env",
            )),
            (None, AuthConfig::None) => None,
        };
        let auth: Option<Arc<dyn RequestAuth>> =
            if let Some((name, prefix, value, field)) = credential {
                if value.trim().is_empty() {
                    return Err(invalid(field, "凭据不能为空"));
                }
                let name_parsed = header_name(name)?;
                let value = header_value(name, &format!("{prefix}{value}"))?;
                let mut final_headers = headers.clone();
                final_headers.insert(name_parsed.clone(), value.clone());
                crate::http::validate_protocol_headers(&final_headers, false)?;
                Some(Arc::new(HeaderAuth::new(name_parsed, value)))
            } else {
                None
            };
        let http = Arc::new(HttpAccess::new(client.clone(), headers, auth)?);
        let protocol: Arc<dyn Protocol> = Arc::new(OpenAiChatCompletions::new(http));
        providers.insert(config.name, (provider, protocol));
    }
    let mut result = HashMap::new();
    for config in config.models {
        let (provider, protocol) = providers
            .get(&config.provider)
            .ok_or_else(|| invalid("models.provider", "模型必须关联已定义的 Provider"))?;
        let key = (config.provider, config.name);
        if result.contains_key(&key) {
            return Err(invalid("models.name", "同 Provider 下模型名称重复"));
        }
        if config.protocol != "openai.chat-completions" {
            return Err(Error::UnsupportedProtocol {
                protocol: config.protocol,
            });
        }
        let model =
            Model::new(provider.clone(), key.1.clone(), protocol.clone()).map_err(Error::Domain)?;
        result.insert(key, model);
    }
    Ok(result)
}

fn resolve_env(
    env: &str,
    field: &str,
    lookup: &impl Fn(&str) -> Result<String, VarError>,
) -> Result<String, Error> {
    if env.trim().is_empty() || env.contains(['=', '\0']) {
        return Err(invalid(field, "环境变量名无效"));
    }
    lookup(env).map_err(|source| Error::Environment {
        name: env.into(),
        source,
    })
}

fn header_name(name: &str) -> Result<HeaderName, Error> {
    HeaderName::from_bytes(name.as_bytes()).map_err(|source| Error::InvalidHeader {
        name: name.into(),
        source: Box::new(source),
    })
}

fn header_value(name: &str, value: &str) -> Result<HeaderValue, Error> {
    HeaderValue::from_str(value).map_err(|source| Error::InvalidHeader {
        name: name.into(),
        source: Box::new(source),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{ModelConfig, ProviderConfig};

    fn config() -> ProvidersConfig {
        ProvidersConfig {
            providers: vec![ProviderConfig {
                name: "test".into(),
                base_url: "http://127.0.0.1:1/v1/".into(),
                headers: Default::default(),
                api_key: None,
                auth: AuthConfig::None,
            }],
            models: vec![ModelConfig {
                provider: "test".into(),
                name: "model".into(),
                protocol: "openai.chat-completions".into(),
            }],
        }
    }

    #[test]
    fn catalog_rejects_empty_duplicate_and_unsupported_bindings() {
        let mut cases = Vec::new();
        cases.push(ProvidersConfig {
            providers: vec![],
            models: vec![],
        });
        let mut empty = config();
        empty.models.clear();
        cases.push(empty);
        let mut duplicate = config();
        duplicate.providers.extend(config().providers);
        cases.push(duplicate);
        let mut duplicate_model = config();
        duplicate_model.models.push(ModelConfig {
            provider: "test".into(),
            name: "model".into(),
            protocol: "openai.chat-completions".into(),
        });
        cases.push(duplicate_model);
        let mut blank = config();
        blank.models[0].name = " ".into();
        cases.push(blank);
        let mut unknown = config();
        unknown.models[0].protocol = "unknown".into();
        cases.push(unknown);
        for reference in ["", " ", "missing"] {
            let mut unknown_provider = config();
            unknown_provider.models[0].provider = reference.into();
            assert!(matches!(
                build_models(unknown_provider, crate::test_client()),
                Err(Error::InvalidConfig { field, .. }) if field == "models.provider"
            ));
        }
        for config in cases {
            assert!(build_models(config, crate::test_client()).is_err());
        }
        let mut shared_names = config();
        let mut other = config().providers.remove(0);
        other.name = "other".into();
        shared_names.providers.push(other);
        shared_names.models.insert(
            0,
            ModelConfig {
                provider: "other".into(),
                name: "model".into(),
                protocol: "openai.chat-completions".into(),
            },
        );
        let models = build_models(shared_names, crate::test_client()).unwrap();
        assert_eq!(models.len(), 2);
        for provider in ["test", "other"] {
            assert_eq!(
                models[&(provider.into(), "model".into())].provider().name(),
                provider
            );
        }
    }

    #[test]
    fn credentials_are_checked_without_mutating_process_environment() {
        for credential in [
            Err(VarError::NotPresent),
            Ok(String::new()),
            Ok("\nsecret".into()),
        ] {
            let mut config = config();
            config.providers[0].auth = AuthConfig::HeaderEnv {
                name: "authorization".into(),
                prefix: "Bearer ".into(),
                env: "TEST_KEY".into(),
            };
            let result = build_with_env(config, crate::test_client(), |_| credential.clone());
            let error = result.err().unwrap();
            assert!(!error.to_string().contains("secret"));
        }
        let mut config = config();
        config.providers[0].auth = AuthConfig::HeaderEnv {
            name: "x-api-key".into(),
            prefix: String::new(),
            env: "TEST_KEY".into(),
        };
        assert!(build_with_env(config, crate::test_client(), |_| Ok("fake-key".into())).is_ok());
    }

    #[test]
    fn api_key_resolves_only_requested_env_and_validates_credentials() {
        for key in [
            ApiKeyConfig::Literal("fake-key".into()),
            ApiKeyConfig::Env {
                env: "TEST_KEY".into(),
            },
        ] {
            let literal = matches!(key, ApiKeyConfig::Literal(_));
            let mut config = config();
            config.providers[0].api_key = Some(key);
            assert!(
                build_with_env(config, crate::test_client(), |name| {
                    assert!(!literal, "literal keys must not read environment variables");
                    assert_eq!(name, "TEST_KEY");
                    Ok("fake-key".into())
                })
                .is_ok()
            );
        }
        for key in [
            ApiKeyConfig::Literal(String::new()),
            ApiKeyConfig::Literal("  ".into()),
            ApiKeyConfig::Literal("fake-secret\nheader".into()),
            ApiKeyConfig::Env { env: String::new() },
            ApiKeyConfig::Env {
                env: "BAD=KEY".into(),
            },
            ApiKeyConfig::Env {
                env: "MISSING_KEY".into(),
            },
            ApiKeyConfig::Env {
                env: "EMPTY_KEY".into(),
            },
            ApiKeyConfig::Env {
                env: "INVALID_KEY".into(),
            },
        ] {
            let mut config = config();
            config.providers[0].api_key = Some(key);
            let error = build_with_env(config, crate::test_client(), |name| match name {
                "MISSING_KEY" => Err(VarError::NotPresent),
                "EMPTY_KEY" => Ok(String::new()),
                "INVALID_KEY" => Ok("fake-secret\r\nheader".into()),
                _ => panic!("invalid environment names must not be resolved"),
            })
            .err()
            .unwrap();
            assert!(!error.to_string().contains("fake-secret"));
        }
        let mut config = config();
        config.providers[0].api_key = Some(ApiKeyConfig::Literal("fake-secret".into()));
        config.providers[0].auth = AuthConfig::HeaderEnv {
            name: "authorization".into(),
            prefix: "Bearer ".into(),
            env: "TEST_KEY".into(),
        };
        assert!(matches!(
            build_with_env(config, crate::test_client(), |_| panic!(
                "conflict must be rejected first"
            )),
            Err(Error::InvalidConfig { .. })
        ));
    }

    #[test]
    fn rejects_invalid_headers_and_auth_protocol_conflicts_before_sending() {
        for (name, value) in [
            ("bad header", "x"),
            ("x-tenant", "a\nb"),
            ("accept", "application/json"),
        ] {
            let mut config = config();
            config.providers[0]
                .headers
                .insert(name.into(), value.into());
            assert!(build_models(config, crate::test_client()).is_err());
        }
        let mut config = config();
        config.providers[0].auth = AuthConfig::HeaderEnv {
            name: "accept".into(),
            prefix: String::new(),
            env: "TEST_KEY".into(),
        };
        assert!(matches!(
            build_with_env(config, crate::test_client(), |_| Ok(
                "application/json".into()
            )),
            Err(Error::InvalidConfig { .. })
        ));
    }
}
