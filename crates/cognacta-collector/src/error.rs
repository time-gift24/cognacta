/// Collector failures. Display is safe; sources may contain private configuration.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("可观测配置项 {field} 无效: {reason}")]
    InvalidConfig {
        field: &'static str,
        reason: &'static str,
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    #[error("可观测系统已初始化或存在全局订阅配置")]
    AlreadyInitialized {
        #[source]
        source: Option<Box<dyn std::error::Error + Send + Sync>>,
    },
    #[error("无法初始化可观测组件 {component}")]
    Initialization {
        component: &'static str,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("无法关闭可观测组件 {component}")]
    Shutdown {
        component: &'static str,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },
    #[error("可观测系统关闭超过总时间预算 {timeout:?}")]
    ShutdownTimeout { timeout: std::time::Duration },
}

pub(crate) fn invalid(field: &'static str, reason: &'static str) -> Error {
    Error::InvalidConfig {
        field,
        reason,
        source: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::error::Error as _;

    #[test]
    fn safe_display_preserves_original_source() {
        let error = Error::Initialization {
            component: "http",
            source: Box::new(std::io::Error::other("secret")),
        };
        assert!(!error.to_string().contains("secret"));
        assert!(error.source().unwrap().is::<std::io::Error>());
    }
}
