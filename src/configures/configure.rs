use std::env;

#[derive(Debug, Clone, PartialEq)]
pub enum Encryption {
    Aes,
    Argon2,
}

impl Encryption {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "aes" => Encryption::Aes,
            "argon2" => Encryption::Argon2,
            _ => Encryption::Argon2, // 默认使用 Argon2
        }
    }
}

#[derive(Debug, Clone)]
pub struct Configure {
    pub host: String,
    pub port: u16,
    pub database_uri: String,
    pub secret: String,
    pub encryption: Encryption,
    pub jwt_secret: String,
    pub aes_key: Option<String>,
    pub redis_url: String,
    pub redis_pool_size: usize,
    pub elasticsearch_url: String,
    pub elasticsearch_index: String,
    pub elasticsearch_api_key: Option<String>,
    pub elasticsearch_username: Option<String>,
    pub elasticsearch_password: Option<String>,
    pub elasticsearch_cloud_id: Option<String>,
    pub elasticsearch_insecure: bool,
    /// 允许的 CORS Origin 列表；空 = 见 [`crate::middlewares::cors::cors`]
    pub cors_origins: Vec<String>,
}

impl Configure {
    pub fn is_production(&self) -> bool {
        env::var("RUST_ENV")
            .or_else(|_| env::var("APP_ENV"))
            .ok()
            .is_some_and(|v| matches!(v.to_ascii_lowercase().as_str(), "production" | "prod"))
    }

    pub fn from_env() -> Result<Self, env::VarError> {
        let encryption = env::var("ENCRYPTION").unwrap_or_else(|_| "argon2".to_string());

        let aes_key = if encryption.to_lowercase() == "aes" {
            Some(env::var("AES_KEY")?)
        } else {
            env::var("AES_KEY").ok()
        };

        let redis_pool_size = env::var("REDIS_POOL_SIZE")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(8)
            .max(1);

        let elasticsearch_insecure = env::var("ELASTICSEARCH_INSECURE")
            .map(|v| v == "true" || v == "1")
            .unwrap_or(false);

        let cors_origins = env::var("CORS_ORIGINS")
            .ok()
            .map(|raw| {
                raw.split(',')
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .map(str::to_string)
                    .collect()
            })
            .unwrap_or_default();

        Ok(Configure {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),

            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .unwrap_or(3000),

            database_uri: env::var("DATABASE_URL").unwrap_or_else(|_| {
                "postgres://postgres:postgres@localhost:5432/i-thinking?sslmode=disable".to_string()
            }),

            secret: env::var("SECRET").unwrap_or_else(|_| "secret".to_string()),

            encryption: Encryption::from_str(&encryption),

            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| {
                "your-secret-key-should-be-at-least-32-characters-long".to_string()
            }),

            aes_key,

            redis_url: env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://127.0.0.1:6379".to_string()),

            redis_pool_size,

            elasticsearch_url: env::var("ELASTICSEARCH_URL")
                .unwrap_or_else(|_| "https://127.0.0.1:9200".to_string()),

            elasticsearch_index: env::var("ELASTICSEARCH_INDEX")
                .unwrap_or_else(|_| "corex_docs".to_string()),

            elasticsearch_api_key: env::var("ELASTICSEARCH_API_KEY")
                .ok()
                .filter(|s| !s.is_empty()),

            elasticsearch_username: env::var("ELASTICSEARCH_USERNAME")
                .ok()
                .filter(|s| !s.is_empty()),

            elasticsearch_password: env::var("ELASTICSEARCH_PASSWORD")
                .ok()
                .filter(|s| !s.is_empty()),

            elasticsearch_cloud_id: env::var("ELASTICSEARCH_CLOUD_ID")
                .ok()
                .filter(|s| !s.is_empty()),

            elasticsearch_insecure,

            cors_origins,
        })
    }
}
