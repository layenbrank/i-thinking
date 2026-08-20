use std::time::Duration;

use anyhow::{Context, Result};
use migration::{Migrator, MigratorTrait};
use sea_orm::{ConnectOptions, Database, DatabaseConnection};

#[derive(Clone)]
pub struct Storage {
    pub db: DatabaseConnection,
    pub database: String,
}

impl Storage {
    pub async fn new(uri: &str) -> Result<Self> {
        let database = database_name(uri);

        let mut opt = ConnectOptions::new(uri.to_owned());
        opt.max_connections(20)
            .min_connections(2)
            .connect_timeout(Duration::from_secs(8))
            .acquire_timeout(Duration::from_secs(8))
            .idle_timeout(Duration::from_secs(8))
            .max_lifetime(Duration::from_secs(1800))
            .sqlx_logging(true)
            .sqlx_logging_level(log::LevelFilter::Debug);

        let db = Database::connect(opt)
            .await
            .context("Failed to connect to PostgreSQL")?;

        db.ping().await.context("PostgreSQL ping failed")?;

        Migrator::up(&db, None)
            .await
            .context("Failed to migrate PostgreSQL schema")?;

        Ok(Storage { db, database })
    }
}

fn database_name(uri: &str) -> String {
    uri.rsplit('/')
        .next()
        .and_then(|tail| tail.split('?').next())
        .filter(|name| !name.is_empty())
        .unwrap_or("i-thinking")
        .to_string()
}
