use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub mongodb_uri: String,
    pub secret: String,
}

impl Config {
    pub fn from_env() -> Result<Self, env::VarError> {
        Ok(Config {
            host: env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),

            port: env::var("PORT")
                .unwrap_or_else(|_| "3000".to_string())
                .parse()
                .unwrap_or(3000),

            mongodb_uri: env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),

            secret: env::var("SECRET").unwrap_or_else(|_| "secret".to_string()),
        })
    }
}
