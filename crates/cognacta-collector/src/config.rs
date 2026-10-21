use crate::{Error, error::invalid};
use opentelemetry::KeyValue;
use opentelemetry_sdk::trace::Sampler;
use std::{collections::HashMap, time::Duration};

pub(crate) struct Signal {
    pub endpoint: String,
    pub headers: HashMap<String, String>,
    pub timeout: Duration,
}

pub(crate) struct Config {
    pub signals: [Option<Signal>; 3],
    pub sampler: Sampler,
    pub resource: Vec<KeyValue>,
}

pub(crate) fn environment() -> Result<HashMap<String, String>, Error> {
    std::env::vars_os()
        .filter_map(|(key, value)| {
            let key = key.into_string().ok()?;
            key.starts_with("OTEL_").then(|| {
                value
                    .into_string()
                    .map(|value| (key, value))
                    .map_err(|_| invalid("OTEL_*", "值必须为 Unicode"))
            })
        })
        .collect()
}

impl Config {
    pub fn parse(env: &HashMap<String, String>) -> Result<Self, Error> {
        let mut config = Self {
            signals: [None, None, None],
            sampler: Sampler::ParentBased(Box::new(Sampler::AlwaysOn)),
            resource: vec![],
        };
        match env.get("OTEL_SDK_DISABLED").map(String::as_str) {
            Some(v) if v.eq_ignore_ascii_case("true") => return Ok(config),
            None => {}
            Some(v) if v.eq_ignore_ascii_case("false") => {}
            _ => return Err(invalid("OTEL_SDK_DISABLED", "仅支持 true 或 false")),
        }
        for (index, signal) in ["LOGS", "TRACES", "METRICS"].into_iter().enumerate() {
            let endpoint = env.get(&format!("OTEL_EXPORTER_OTLP_{signal}_ENDPOINT"));
            let general = env.get("OTEL_EXPORTER_OTLP_ENDPOINT");
            let Some(raw) = endpoint.or(general) else {
                continue;
            };
            let mut url = url::Url::parse(raw).map_err(|source| Error::InvalidConfig {
                field: "OTEL_EXPORTER_OTLP_*_ENDPOINT",
                reason: "必须为 HTTP(S) 地址",
                source: Some(Box::new(source)),
            })?;
            if !matches!(url.scheme(), "http" | "https")
                || url.host_str().is_none()
                || !raw.contains("://")
                || raw.trim() != raw
                || raw.chars().any(char::is_control)
                || !url.username().is_empty()
                || url.password().is_some()
                || url.fragment().is_some()
                || raw
                    .split_once("://")
                    .is_some_and(|(_, s)| s.split('/').next().is_some_and(|s| s.contains('@')))
            {
                return Err(invalid(
                    "OTEL_EXPORTER_OTLP_*_ENDPOINT",
                    "地址不得含凭据、控制字符或 fragment",
                ));
            }
            if endpoint.is_none() {
                let path = format!(
                    "{}/v1/{}",
                    url.path().trim_end_matches('/'),
                    signal.to_ascii_lowercase()
                );
                url.set_path(&path);
            }
            let setting = |suffix| {
                env.get(&format!("OTEL_EXPORTER_OTLP_{signal}_{suffix}"))
                    .or_else(|| env.get(&format!("OTEL_EXPORTER_OTLP_{suffix}")))
            };
            if setting("PROTOCOL").is_some_and(|s| s != "http/protobuf") {
                return Err(invalid(
                    "OTEL_EXPORTER_OTLP_*_PROTOCOL",
                    "仅支持 http/protobuf",
                ));
            }
            let timeout = match setting("TIMEOUT") {
                Some(s) => s
                    .parse::<u64>()
                    .ok()
                    .filter(|ms| *ms > 0)
                    .map(Duration::from_millis)
                    .ok_or_else(|| invalid("OTEL_EXPORTER_OTLP_*_TIMEOUT", "必须为正整数毫秒"))?,
                None => Duration::from_secs(5),
            };
            let mut headers = HashMap::new();
            if let Some(raw) = setting("HEADERS") {
                for header in raw.split(',').filter(|s| !s.trim().is_empty()) {
                    let (key, value) = header.split_once('=').ok_or_else(|| {
                        invalid("OTEL_EXPORTER_OTLP_*_HEADERS", "必须为 key=value 列表")
                    })?;
                    let value = percent_encoding::percent_decode_str(value.trim())
                        .decode_utf8()
                        .map_err(|source| Error::InvalidConfig {
                            field: "OTEL_EXPORTER_OTLP_*_HEADERS",
                            reason: "值编码无效",
                            source: Some(Box::new(source)),
                        })?
                        .into_owned();
                    let key = http::header::HeaderName::from_bytes(key.trim().as_bytes()).map_err(
                        |source| Error::InvalidConfig {
                            field: "OTEL_EXPORTER_OTLP_*_HEADERS",
                            reason: "头名称无效",
                            source: Some(Box::new(source)),
                        },
                    )?;
                    http::HeaderValue::from_str(&value).map_err(|source| Error::InvalidConfig {
                        field: "OTEL_EXPORTER_OTLP_*_HEADERS",
                        reason: "头值无效",
                        source: Some(Box::new(source)),
                    })?;
                    // Protocol framing belongs to the exporter, never to authentication config.
                    if matches!(
                        key.as_str(),
                        "host" | "content-type" | "content-length" | "transfer-encoding"
                    ) {
                        return Err(invalid(
                            "OTEL_EXPORTER_OTLP_*_HEADERS",
                            "不得覆盖传输协议头",
                        ));
                    }
                    headers.insert(key.to_string(), value);
                }
            }
            config.signals[index] = Some(Signal {
                endpoint: url.into(),
                headers,
                timeout,
            });
        }
        if config.signals.iter().all(Option::is_none) {
            return Ok(config);
        }
        let ratio = || {
            env.get("OTEL_TRACES_SAMPLER_ARG")
                .and_then(|s| s.parse::<f64>().ok())
                .filter(|n| n.is_finite() && (0.0..=1.0).contains(n))
                .ok_or_else(|| invalid("OTEL_TRACES_SAMPLER_ARG", "必须在 0 到 1 之间"))
        };
        config.sampler = match env
            .get("OTEL_TRACES_SAMPLER")
            .map(String::as_str)
            .unwrap_or("parentbased_always_on")
        {
            "always_on" => Sampler::AlwaysOn,
            "always_off" => Sampler::AlwaysOff,
            "parentbased_always_on" => Sampler::ParentBased(Box::new(Sampler::AlwaysOn)),
            "parentbased_always_off" => Sampler::ParentBased(Box::new(Sampler::AlwaysOff)),
            "traceidratio" => Sampler::TraceIdRatioBased(ratio()?),
            "parentbased_traceidratio" => {
                Sampler::ParentBased(Box::new(Sampler::TraceIdRatioBased(ratio()?)))
            }
            _ => return Err(invalid("OTEL_TRACES_SAMPLER", "不支持的采样器")),
        };
        if let Some(raw) = env.get("OTEL_RESOURCE_ATTRIBUTES") {
            for attr in raw.split(',').filter(|s| !s.trim().is_empty()) {
                let (key, value) = attr
                    .split_once('=')
                    .filter(|(k, _)| !k.trim().is_empty())
                    .ok_or_else(|| invalid("OTEL_RESOURCE_ATTRIBUTES", "必须为 key=value 列表"))?;
                if !matches!(
                    key.trim(),
                    "service.name" | "service.instance.id" | "service.version"
                ) {
                    config.resource.push(KeyValue::new(
                        key.trim().to_owned(),
                        value.trim().to_owned(),
                    ));
                }
            }
        }
        Ok(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn env(entries: &[(&str, &str)]) -> HashMap<String, String> {
        entries
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }
    #[test]
    fn explicit_endpoints_and_overrides() {
        let local = Config::parse(&env(&[("OTEL_EXPORTER_OTLP_HEADERS", "key=secret")])).unwrap();
        assert!(local.signals.iter().all(Option::is_none));
        let config = Config::parse(&env(&[
            (
                "OTEL_EXPORTER_OTLP_ENDPOINT",
                "http://localhost:4318/prefix/",
            ),
            (
                "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
                "https://example.test/custom",
            ),
            ("OTEL_EXPORTER_OTLP_HEADERS", "key=general"),
            ("OTEL_EXPORTER_OTLP_LOGS_HEADERS", "key=local%20value"),
            ("OTEL_EXPORTER_OTLP_TIMEOUT", "12"),
        ]))
        .unwrap();
        assert_eq!(
            config.signals[0].as_ref().unwrap().endpoint,
            "https://example.test/custom"
        );
        assert_eq!(
            config.signals[1].as_ref().unwrap().endpoint,
            "http://localhost:4318/prefix/v1/traces"
        );
        assert_eq!(
            config.signals[0].as_ref().unwrap().headers["key"],
            "local value"
        );
        assert_eq!(
            config.signals[2].as_ref().unwrap().timeout,
            Duration::from_millis(12)
        );
    }
    #[test]
    fn rejects_invalid_remote_settings_without_disclosing_values() {
        for (key, value) in [
            (
                "OTEL_EXPORTER_OTLP_ENDPOINT",
                "https://user:secret@example.test",
            ),
            ("OTEL_EXPORTER_OTLP_PROTOCOL", "secret"),
            ("OTEL_EXPORTER_OTLP_HEADERS", "key=secret%0a"),
            ("OTEL_EXPORTER_OTLP_TIMEOUT", "0"),
            ("OTEL_TRACES_SAMPLER", "secret"),
            ("OTEL_SDK_DISABLED", "secret"),
        ] {
            let mut vars = env(&[("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318")]);
            vars.insert(key.into(), value.into());
            let error = Config::parse(&vars).err().unwrap();
            assert!(!error.to_string().contains("secret"));
        }
        let disabled = Config::parse(&env(&[
            ("OTEL_SDK_DISABLED", "true"),
            ("OTEL_EXPORTER_OTLP_ENDPOINT", "bad"),
        ]))
        .unwrap();
        assert!(disabled.signals.iter().all(Option::is_none));
    }
}
