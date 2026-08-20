use chrono::{Duration, Utc};
use jsonwebtoken::{
    DecodingKey, EncodingKey, Header, Validation, decode, encode, errors::ErrorKind,
};
use serde::{Deserialize, Serialize};

use crate::guards::permission::Role;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    /// USER / ADMIN
    #[serde(default)]
    pub role: String,
    pub exp: i64,
    pub iat: i64,
}

impl Claims {
    pub fn role(&self) -> Role {
        Role::parse(&self.role).unwrap_or(Role::User)
    }
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
pub fn generate_token(
    user_id: &str,
    username: &str,
    role: Role,
    secret: &str,
    expiration_hours: Option<u64>,
) -> Result<String, JwtError> {
    let now = Utc::now();
    let exp = now + Duration::hours(expiration_hours.unwrap_or(24) as i64);

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.as_str().to_string(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
    };

    let header = Header::default();
    let encoding_key = EncodingKey::from_secret(secret.as_ref());

    encode(&header, &claims, &encoding_key).map_err(|e| JwtError::EncodingError(e.to_string()))
}

/// 验证 JWT token；过期映射为 [`JwtError::InvalidToken`]。
pub fn verify_token(token: &str, secret: &str) -> Result<Claims, JwtError> {
    let decoding_key = DecodingKey::from_secret(secret.as_ref());
    let validation = Validation::default();

    let token_data =
        decode::<Claims>(token, &decoding_key, &validation).map_err(|e| match e.kind() {
            ErrorKind::ExpiredSignature => JwtError::InvalidToken,
            _ => JwtError::DecodingError(e.to_string()),
        })?;

    Ok(token_data.claims)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_and_verify_token() {
        let secret = "test-secret-key-at-least-32-characters-long";
        let user_id = "123456";
        let username = "testuser";

        let token = generate_token(user_id, username, Role::Admin, secret, Some(1)).unwrap();
        assert!(!token.is_empty());

        let claims = verify_token(&token, secret).unwrap();
        assert_eq!(claims.sub, user_id);
        assert_eq!(claims.username, username);
        assert_eq!(claims.role(), Role::Admin);
    }

    #[test]
    fn test_invalid_token() {
        let secret = "test-secret-key-at-least-32-characters-long";
        let invalid_token = "invalid.token.here";

        let result = verify_token(invalid_token, secret);
        assert!(matches!(result, Err(JwtError::DecodingError(_))));
    }

    #[test]
    fn expired_token_maps_to_invalid_token() {
        let secret = "test-secret-key-at-least-32-characters-long";
        let now = Utc::now();
        let claims = Claims {
            sub: "u1".into(),
            username: "alice".into(),
            role: "USER".into(),
            exp: (now - Duration::hours(1)).timestamp(),
            iat: (now - Duration::hours(2)).timestamp(),
        };
        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .unwrap();

        assert!(matches!(
            verify_token(&token, secret),
            Err(JwtError::InvalidToken)
        ));
    }

    #[test]
    fn missing_role_defaults_to_user() {
        let secret = "test-secret-key-at-least-32-characters-long";
        let now = Utc::now();
        #[derive(Serialize)]
        struct Legacy {
            sub: String,
            username: String,
            exp: i64,
            iat: i64,
        }
        let token = encode(
            &Header::default(),
            &Legacy {
                sub: "u1".into(),
                username: "a".into(),
                exp: (now + Duration::hours(1)).timestamp(),
                iat: now.timestamp(),
            },
            &EncodingKey::from_secret(secret.as_ref()),
        )
        .unwrap();
        let claims = verify_token(&token, secret).unwrap();
        assert_eq!(claims.role(), Role::User);
    }
}
