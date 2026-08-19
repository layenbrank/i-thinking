use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // 用户 ID (subject)
    pub username: String, // 用户名
    pub exp: i64,         // 过期时间 (expiration time)
    pub iat: i64,         // 签发时间 (issued at)
}

#[derive(Debug, thiserror::Error)]
pub enum JwtError {
    #[error("JWT encoding error: {0}")]
    EncodingError(String),
    #[error("JWT decoding error: {0}")]
    DecodingError(String),
    #[error("Invalid token")]
    InvalidToken,
}

/// 生成 JWT token
///
/// # 参数
/// - `user_id`: 用户 ID
/// - `username`: 用户名
/// - `secret`: JWT 密钥
/// - `expiration_hours`: 过期时间（小时），默认 24 小时
///
/// # 返回
/// 返回生成的 JWT token 字符串
pub fn generate_token(
    user_id: &str,
    username: &str,
    secret: &str,
    expiration_hours: Option<u64>,
) -> Result<String, JwtError> {
    let now = Utc::now();
    let exp = now + Duration::hours(expiration_hours.unwrap_or(24) as i64);

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
    };

    let header = Header::default();
    let encoding_key = EncodingKey::from_secret(secret.as_ref());

    encode(&header, &claims, &encoding_key).map_err(|e| JwtError::EncodingError(e.to_string()))
}

/// 验证 JWT token
///
/// # 参数
/// - `token`: JWT token 字符串
/// - `secret`: JWT 密钥
///
/// # 返回
/// 返回解析后的 Claims，如果验证失败则返回错误
pub fn verify_token(token: &str, secret: &str) -> Result<Claims, JwtError> {
    let decoding_key = DecodingKey::from_secret(secret.as_ref());
    let validation = Validation::default();

    let token_data = decode::<Claims>(token, &decoding_key, &validation)
        .map_err(|e| JwtError::DecodingError(e.to_string()))?;

    // 检查 token 是否过期
    let now = Utc::now().timestamp();
    if token_data.claims.exp < now {
        return Err(JwtError::InvalidToken);
    }

    Ok(token_data.claims)
}

/// 从 token 中提取用户 ID
pub fn extract_user_id(token: &str, secret: &str) -> Result<String, JwtError> {
    let claims = verify_token(token, secret)?;
    Ok(claims.sub)
}

/// 从 token 中提取用户名
pub fn extract_username(token: &str, secret: &str) -> Result<String, JwtError> {
    let claims = verify_token(token, secret)?;
    Ok(claims.username)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_verify_token() {
        let secret = "test-secret-key-at-least-32-characters-long";
        let user_id = "123456";
        let username = "testuser";

        // 生成 token
        let token = generate_token(user_id, username, secret, Some(1)).unwrap();
        assert!(!token.is_empty());

        // 验证 token
        let claims = verify_token(&token, secret).unwrap();
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.username, username);
    }

    #[test]
    fn test_invalid_token() {
        let secret = "test-secret-key-at-least-32-characters-long";
        let invalid_token = "invalid.token.here";

        let result = verify_token(invalid_token, secret);
        assert!(result.is_err());
    }
}
