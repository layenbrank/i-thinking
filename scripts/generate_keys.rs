use base64::{engine::general_purpose::STANDARD, Engine};
use rand::{Rng, RngCore};

fn main() {
    println!("=== 生成 Auth 系统所需的密钥 ===\n");

    // 生成 JWT_SECRET (至少 32 字符的随机字符串)
    let jwt_secret = generate_jwt_secret();
    println!("JWT_SECRET={}", jwt_secret);

    // 生成 AES_KEY (32 字节的随机密钥，base64 编码)
    let aes_key = generate_aes_key();
    println!("AES_KEY={}", aes_key);

    println!("\n=== 使用说明 ===");
    println!("1. 将上述密钥添加到 .env 文件中");
    println!("2. JWT_SECRET: 用于 JWT token 的签名和验证");
    println!("3. AES_KEY: 仅在使用 AES 加密方式时需要");
    println!("4. 建议在生产环境中使用更安全的密钥管理方式");
}

/// 生成 JWT_SECRET (64 字符的随机字符串)
fn generate_jwt_secret() -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let mut rng = rand::rng();
    (0..64)
        .map(|_| {
            let idx = rng.random_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

/// 生成 AES_KEY (32 字节的随机密钥，base64 编码)
fn generate_aes_key() -> String {
    let mut key = [0u8; 32];
    rand::rng().fill_bytes(&mut key);
    STANDARD.encode(&key)
}
