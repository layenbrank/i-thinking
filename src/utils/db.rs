use sea_orm::{DbErr, RuntimeErr};

/// PostgreSQL unique_violation (SQLSTATE 23505).
pub fn is_unique_violation(err: &DbErr) -> bool {
    match err {
        DbErr::Exec(RuntimeErr::SqlxError(e)) | DbErr::Query(RuntimeErr::SqlxError(e)) => e
            .as_database_error()
            .and_then(|db| db.code())
            .is_some_and(|code| code == "23505"),
        _ => {
            let msg = err.to_string().to_lowercase();
            msg.contains("duplicate key") || msg.contains("unique constraint")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_duplicate_key_message() {
        let err = DbErr::Custom("duplicate key value violates unique constraint".into());
        assert!(is_unique_violation(&err));
    }

    #[test]
    fn ignores_unrelated_error() {
        let err = DbErr::Custom("connection reset".into());
        assert!(!is_unique_violation(&err));
    }
}
