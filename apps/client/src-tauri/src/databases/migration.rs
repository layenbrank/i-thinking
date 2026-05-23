use crate::databases::connection::DbConn;
use crate::migrations::migrations_v0001;
use sea_orm::DbErr;
use sea_orm_migration::MigratorTrait;
use tracing::{error, info};

/// 迁移器
pub struct AppMigrator;

impl MigratorTrait for AppMigrator {
    fn migrations() -> Vec<Box<dyn sea_orm_migration::MigrationTrait>> {
        vec![Box::new(migrations_v0001::Migration)]
    }
}
