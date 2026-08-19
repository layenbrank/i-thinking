use crate::configures::configure::Encryption;
use aes_gcm::{
    Aes256Gcm, Key, Nonce,
    aead::{Aead, Generate, KeyInit},
};
use argon2::password_hash::{SaltString, rand_core::OsRng};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use base64::{Engine, engine::general_purpose::STANDARD};

#[derive(Debug, thiserror::Error)]
pub enum EncryptionError {
    #[error("AES encryption error: {0}")]
    AesError(String),
    #[error("Argon2 error: {0}")]
    Argon2Error(String),
    #[error("Base64 decode error: {0}")]
    Base64Error(String),
    #[error("Invalid key length")]
    InvalidKeyLength,
}

/// 加密密码
///
/// 根据加密方法选择使用 AES 或 Argon2
pub fn encrypt_password(
    password: &str,
    method: &Encryption,
    aes_key: Option<&str>,
) -> Result<String, EncryptionError> {
    match method {
        Encryption::Aes => {
            encrypt_with_aes(password, aes_key.ok_or(EncryptionError::InvalidKeyLength)?)
        }
        Encryption::Argon2 => encrypt_with_argon2(password),
    }
}

/// 验证密码
///
/// 根据加密方法选择相应的验证方式
pub fn verify_password(
    password: &str,
    encrypted: &str,
    method: &Encryption,
    aes_key: Option<&str>,
) -> Result<bool, EncryptionError> {
    match method {
        Encryption::Aes => verify_with_aes(
            password,
            encrypted,
            aes_key.ok_or(EncryptionError::InvalidKeyLength)?,
        ),
        Encryption::Argon2 => verify_with_argon2(password, encrypted),
    }
}

/// 使用 AES-256-GCM 加密密码
fn encrypt_with_aes(password: &str, key_str: &str) -> Result<String, EncryptionError> {
    // 解码 base64 密钥
    let key_bytes = STANDARD
        .decode(key_str)
        .map_err(|e| EncryptionError::Base64Error(e.to_string()))?;

    if key_bytes.len() != 32 {
        return Err(EncryptionError::InvalidKeyLength);
    }

    // 使用 Into trait 替代已弃用的 from_slice
    let key_array: [u8; 32] = key_bytes
        .try_into()
        .map_err(|_| EncryptionError::InvalidKeyLength)?;
    let key: &Key<Aes256Gcm> = (&key_array).into();
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::generate();

    // 加密
    let ciphertext = cipher
        .encrypt(&nonce, password.as_bytes())
        .map_err(|e| EncryptionError::AesError(e.to_string()))?;

    // 将 nonce 和 ciphertext 组合并编码为 base64
    let mut combined = nonce.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(STANDARD.encode(&combined))
}

/// 使用 AES-256-GCM 验证密码
fn verify_with_aes(
    password: &str,
    encrypted: &str,
    key_str: &str,
) -> Result<bool, EncryptionError> {
    // 解码 base64 密钥
    let key_bytes = STANDARD
        .decode(key_str)
        .map_err(|e| EncryptionError::Base64Error(e.to_string()))?;

    if key_bytes.len() != 32 {
        return Err(EncryptionError::InvalidKeyLength);
    }

    // 使用 Into trait 替代已弃用的 from_slice
    let key_array: [u8; 32] = key_bytes
        .try_into()
        .map_err(|_| EncryptionError::InvalidKeyLength)?;
    let key: &Key<Aes256Gcm> = (&key_array).into();
    let cipher = Aes256Gcm::new(key);

    // 解码加密数据
    let combined = STANDARD
        .decode(encrypted)
        .map_err(|e| EncryptionError::Base64Error(e.to_string()))?;

    if combined.len() < 12 {
        return Ok(false);
    }

    // 提取 nonce (前 12 字节) 和 ciphertext
    let nonce_bytes: [u8; 12] = combined[..12]
        .try_into()
        .map_err(|_| EncryptionError::AesError("Invalid nonce length".to_string()))?;
    let nonce = Nonce::from(nonce_bytes);
    let ciphertext = &combined[12..];

    // 解密（需要传递 nonce 的引用）
    let decrypted = cipher
        .decrypt(&nonce, ciphertext)
        .map_err(|_| EncryptionError::AesError("Decryption failed".to_string()))?;

    // 比较密码
    Ok(decrypted == password.as_bytes())
}

/// 使用 Argon2id 哈希密码
fn encrypt_with_argon2(password: &str) -> Result<String, EncryptionError> {
    let salt = SaltString::generate(&mut OsRng);

    // 配置 Argon2id 参数
    // 这些参数可以根据需要调整：
    // - m_cost: 内存成本 (KB)
    // - t_cost: 时间成本 (迭代次数)
    // - p_cost: 并行度
    let argon2 = Argon2::default();

    let password_hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| EncryptionError::Argon2Error(e.to_string()))?;

    Ok(password_hash.to_string())
}

/// 使用 Argon2id 验证密码
fn verify_with_argon2(password: &str, hashed: &str) -> Result<bool, EncryptionError> {
    let parsed_hash =
        PasswordHash::new(hashed).map_err(|e| EncryptionError::Argon2Error(e.to_string()))?;

    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed_hash) {
        Ok(()) => Ok(true),
        Err(_) => Ok(false),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{Engine, engine::general_purpose::STANDARD};

    #[test]
    fn test_argon2_encryption() {
        let password = "test_password_123";
        let encrypted = encrypt_with_argon2(password).unwrap();

        // 验证加密后的字符串不等于原密码
        assert_ne!(encrypted, password);

        // 验证密码
        assert!(verify_with_argon2(password, &encrypted).unwrap());

        // 验证错误密码
        assert!(!verify_with_argon2("wrong_password", &encrypted).unwrap());
    }

    #[test]
    fn test_aes_encryption() {
        // 生成 32 字节密钥并编码为 base64
        let key_bytes: [u8; 32] = [0u8; 32]; // 测试用密钥
        let key_str = STANDARD.encode(key_bytes);

        let password = "test_password_123";
        let encrypted = encrypt_with_aes(password, &key_str).unwrap();

        // 验证加密后的字符串不等于原密码
        assert_ne!(encrypted, password);

        // 验证密码
        assert!(verify_with_aes(password, &encrypted, &key_str).unwrap());

        // 验证错误密码
        assert!(!verify_with_aes("wrong_password", &encrypted, &key_str).unwrap());
    }
}
