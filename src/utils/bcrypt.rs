use bcrypt::{DEFAULT_COST, hash, verify};

const SECRET: &str = "layen-secret";

pub fn encrypt(password: &str) -> Result<String, bcrypt::BcryptError> {
    hash(password, DEFAULT_COST)
}

pub fn decrypt(password: &str, hashed: &str) -> Result<bool, bcrypt::BcryptError> {
    verify(password, hashed)
}
