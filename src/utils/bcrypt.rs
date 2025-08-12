use bcrypt::{DEFAULT_COST, hash, verify};

const SECRET: &str = "layen-secret";

fn encrypt(password: &str) -> String {
    hash(password, DEFAULT_COST).unwrap()
}

fn decrypt(password: &str, hashed: &str) -> bool {
    verify(password, hashed).unwrap()
}
