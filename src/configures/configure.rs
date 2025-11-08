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
    pub mongodb_uri: String,
    pub secret: String,
    pub encryption: Encryption,
    pub jwt_secret: String,
    pub aes_key: Option<String>,
}

impl Configure {
    pub fn from_env() -> Result<Self, env::VarError> {
        let encryption = env::var("ENCRYPTION")
            .unwrap_or_else(|_| "argon2".to_string());

        let aes_key = if encryption.to_lowercase() == "aes" {
            Some(env::var("AES_KEY")?)
        } else {
            env::var("AES_KEY").ok()
        };

        Ok(Configure {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),

            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .unwrap_or(3000),

            mongodb_uri: env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),

            secret: env::var("SECRET").unwrap_or_else(|_| "secret".to_string()),

            encryption: Encryption::from_str(&encryption),

            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "your-secret-key-should-be-at-least-32-characters-long".to_string()),

            aes_key,
        })
    }
}
