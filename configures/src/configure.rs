use std::path::PathBuf;

use anyhow::{bail, Context, Result};
use serde::Deserialize;

use super::loader::{load_merged_config, resolve_profile};
use super::runtime;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Encryption {
    Aes,
    Argon2,
}

impl Encryption {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "aes" => Encryption::Aes,
            "argon2" => Encryption::Argon2,
            _ => Encryption::Argon2,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct AppConfig {
    pub env: String,
    pub swagger: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            env: "development".to_string(),
            swagger: true,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 3000,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct DatabaseConfig {
    pub url: String,
}

impl Default for DatabaseConfig {
    fn default() -> Self {
        Self {
            url: "postgres://machenike:Li33333.@127.0.0.1:5432/i-thinking".to_string(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct RedisConfig {
    pub url: String,
    pub pool_size: usize,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: "redis://127.0.0.1:6379".to_string(),
            pool_size: 8,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct ElasticsearchConfig {
    pub url: String,
    pub index: String,
    pub insecure: bool,
    pub username: Option<String>,
    pub password: Option<String>,
    pub api_key: Option<String>,
    pub cloud_id: Option<String>,
}

impl Default for ElasticsearchConfig {
    fn default() -> Self {
        Self {
            url: "http://127.0.0.1:9200".to_string(),
            index: "corex_docs".to_string(),
            insecure: false,
            username: None,
            password: None,
            api_key: None,
            cloud_id: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct SecurityConfig {
    pub secret: String,
    pub jwt_secret: String,
    pub encryption: String,
    pub aes_key: Option<String>,
}

impl Default for SecurityConfig {
    fn default() -> Self {
        Self {
            secret: "change-me-secret".to_string(),
            jwt_secret: "change-me-jwt-secret-at-least-32-characters-long".to_string(),
            encryption: "argon2".to_string(),
            aes_key: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct CaptchaConfig {
    pub base_url: String,
    pub api_key: String,
    pub kind: String,
    pub timeout_ms: u64,
    pub ip_rate_limit: u32,
}

impl Default for CaptchaConfig {
    fn default() -> Self {
        Self {
            base_url: "http://127.0.0.1:8080".to_string(),
            api_key: String::new(),
            kind: "slide-default".to_string(),
            timeout_ms: 5000,
            ip_rate_limit: 30,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct OtpConfig {
    pub ttl_secs: u64,
    pub cooldown_secs: u64,
    pub max_attempts: u32,
    pub lock_secs: u64,
    pub mock: bool,
}

impl Default for OtpConfig {
    fn default() -> Self {
        Self {
            ttl_secs: 300,
            cooldown_secs: 60,
            max_attempts: 5,
            lock_secs: 900,
            mock: true,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct SigninConfig {
    pub max_failures: u32,
}

impl Default for SigninConfig {
    fn default() -> Self {
        Self { max_failures: 5 }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct AuthRateLimitConfig {
    pub enabled: bool,
    pub burst_size: u32,
    pub requests_per_minute: u64,
}

impl Default for AuthRateLimitConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            burst_size: 20,
            requests_per_minute: 30,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct AuthConfig {
    pub captcha: CaptchaConfig,
    pub otp: OtpConfig,
    pub signin: SigninConfig,
    pub rate_limit: AuthRateLimitConfig,
    pub trust_proxy: bool,
}

impl Default for AuthConfig {
    fn default() -> Self {
        Self {
            captcha: CaptchaConfig::default(),
            otp: OtpConfig::default(),
            signin: SigninConfig::default(),
            rate_limit: AuthRateLimitConfig::default(),
            trust_proxy: false,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct LoggingConfig {
    pub filter: String,
    pub dir: String,
    pub retention_days: u64,
    pub format: String,
    pub body_max: usize,
}

impl Default for LoggingConfig {
    fn default() -> Self {
        Self {
            filter: "info".to_string(),
            dir: "logs".to_string(),
            retention_days: 14,
            format: "pretty".to_string(),
            body_max: 8192,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct AliyunGatewayConfig {
    pub base_url: String,
    pub api_key: String,
    pub timeout_ms: u64,
    pub sms_template_code: String,
}

impl Default for AliyunGatewayConfig {
    fn default() -> Self {
        Self {
            base_url: "http://127.0.0.1:8090".to_string(),
            api_key: String::new(),
            timeout_ms: 10_000,
            sms_template_code: String::new(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct AliyunConfig {
    pub gateway: AliyunGatewayConfig,
}

impl Default for AliyunConfig {
    fn default() -> Self {
        Self {
            gateway: AliyunGatewayConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct CorsConfig {
    pub origins: Vec<String>,
}

impl Default for CorsConfig {
    fn default() -> Self {
        Self { origins: vec![] }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(default)]
pub struct Configure {
    pub app: AppConfig,
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub redis: RedisConfig,
    pub elasticsearch: ElasticsearchConfig,
    pub security: SecurityConfig,
    pub auth: AuthConfig,
    pub aliyun: AliyunConfig,
    pub logging: LoggingConfig,
    pub cors: CorsConfig,
    /// 合并时使用的 profile（`resolve_profile()`）。
    #[serde(skip)]
    pub profile: String,
    /// 配置目录（用于日志）。
    #[serde(skip)]
    pub config_dir: PathBuf,
}

impl Default for Configure {
    fn default() -> Self {
        Self {
            app: AppConfig::default(),
            server: ServerConfig::default(),
            database: DatabaseConfig::default(),
            redis: RedisConfig::default(),
            elasticsearch: ElasticsearchConfig::default(),
            security: SecurityConfig::default(),
            auth: AuthConfig::default(),
            aliyun: AliyunConfig::default(),
            logging: LoggingConfig::default(),
            cors: CorsConfig::default(),
            profile: "development".to_string(),
            config_dir: PathBuf::from("."),
        }
    }
}

impl Configure {
    pub fn load() -> Result<Self> {
        let profile = resolve_profile();
        let config_dir = super::loader::config_dir();
        let merged = load_merged_config(&profile)?;
        let mut cfg: Configure = merged
            .try_deserialize()
            .context("failed to deserialize configuration")?;
        cfg.profile = profile;
        cfg.config_dir = config_dir;

        if cfg.is_production() {
            cfg.auth.otp.mock = false;
        }

        cfg.validate()?;
        runtime::init(cfg.is_production());
        Ok(cfg)
    }

    pub fn validate(&self) -> Result<()> {
        if self.security.jwt_secret.len() < 32 {
            bail!("security.jwt_secret must be at least 32 characters");
        }

        let encryption = Encryption::from_str(&self.security.encryption);
        if encryption == Encryption::Aes && self.security.aes_key.as_ref().is_none_or(|k| k.is_empty())
        {
            bail!("security.aes_key is required when security.encryption is aes");
        }

        if self.is_production() {
            if is_placeholder_secret(&self.security.secret) {
                bail!("security.secret must not use placeholder values in production");
            }
            if is_placeholder_secret(&self.security.jwt_secret) {
                bail!("security.jwt_secret must not use placeholder values in production");
            }
        }

        Ok(())
    }

    pub fn is_production(&self) -> bool {
        matches!(self.app.env.to_ascii_lowercase().as_str(), "production" | "prod")
    }

    pub fn is_development_details(&self) -> bool {
        !self.is_production()
    }

    pub fn host(&self) -> &str {
        &self.server.host
    }

    pub fn port(&self) -> u16 {
        self.server.port
    }

    pub fn database_uri(&self) -> &str {
        &self.database.url
    }

    pub fn redis_url(&self) -> &str {
        &self.redis.url
    }

    pub fn redis_pool_size(&self) -> usize {
        self.redis.pool_size.max(1)
    }

    pub fn jwt_secret(&self) -> &str {
        &self.security.jwt_secret
    }

    pub fn secret(&self) -> &str {
        &self.security.secret
    }

    pub fn encryption(&self) -> Encryption {
        Encryption::from_str(&self.security.encryption)
    }

    pub fn aes_key(&self) -> Option<&str> {
        self.security.aes_key.as_deref()
    }

    pub fn cors_origins(&self) -> &[String] {
        &self.cors.origins
    }

    pub fn elasticsearch_url(&self) -> &str {
        &self.elasticsearch.url
    }

    pub fn elasticsearch_index(&self) -> &str {
        &self.elasticsearch.index
    }

    pub fn elasticsearch_api_key(&self) -> Option<&str> {
        self.elasticsearch.api_key.as_deref().filter(|s| !s.is_empty())
    }

    pub fn elasticsearch_username(&self) -> Option<&str> {
        self.elasticsearch.username.as_deref().filter(|s| !s.is_empty())
    }

    pub fn elasticsearch_password(&self) -> Option<&str> {
        self.elasticsearch.password.as_deref().filter(|s| !s.is_empty())
    }

    pub fn elasticsearch_cloud_id(&self) -> Option<&str> {
        self.elasticsearch.cloud_id.as_deref().filter(|s| !s.is_empty())
    }

    pub fn elasticsearch_insecure(&self) -> bool {
        self.elasticsearch.insecure
    }

    pub fn captcha_base_url(&self) -> &str {
        &self.auth.captcha.base_url
    }

    pub fn captcha_api_key(&self) -> &str {
        &self.auth.captcha.api_key
    }

    pub fn captcha_kind(&self) -> &str {
        &self.auth.captcha.kind
    }

    pub fn captcha_timeout_ms(&self) -> u64 {
        self.auth.captcha.timeout_ms.max(1)
    }

    pub fn captcha_ip_rate_limit(&self) -> u32 {
        self.auth.captcha.ip_rate_limit.max(1)
    }

    pub fn aliyun_gateway_base_url(&self) -> &str {
        &self.aliyun.gateway.base_url
    }

    pub fn aliyun_gateway_api_key(&self) -> &str {
        &self.aliyun.gateway.api_key
    }

    pub fn aliyun_gateway_timeout_ms(&self) -> u64 {
        self.aliyun.gateway.timeout_ms.max(1)
    }

    pub fn aliyun_sms_template_code(&self) -> &str {
        &self.aliyun.gateway.sms_template_code
    }

    /// 测试与守卫用构造器。
    pub fn test(jwt_secret: impl Into<String>) -> Self {
        let mut cfg = Configure::default();
        cfg.security.jwt_secret = jwt_secret.into();
        cfg
    }
}

fn is_placeholder_secret(value: &str) -> bool {
    let lower = value.to_ascii_lowercase();
    lower.contains("change-me") || lower == "secret" || lower.starts_with("your-")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn load_merges_development_profile() {
        let cfg = Configure::load().expect("load config");
        assert_eq!(cfg.profile, "development");
        assert_eq!(cfg.app.env, "development");
        assert!(cfg.auth.otp.mock);
    }

    #[test]
    fn validate_rejects_short_jwt() {
        let mut cfg = Configure::default();
        cfg.security.jwt_secret = "short".into();
        assert!(cfg.validate().is_err());
    }
}
