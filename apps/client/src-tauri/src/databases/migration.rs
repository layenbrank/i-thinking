use crate::databases::storage::Connection;
use crate::migrations::migrations_v001;
use sea_orm::DbErr;
use sea_orm::sea_query::IntoIden;
use sea_orm_migration::MigratorTrait;
use tracing::{error, info};

/// 迁移器
pub struct AppMigrator;

impl MigratorTrait for AppMigrator {
    /// 自定义迁移记录表名（默认 `seaql_migrations`）
    fn migration_table_name() -> sea_orm::DynIden {
        sea_orm::sea_query::Alias::new("migrations").into_iden()
    }

    fn migrations() -> Vec<Box<dyn sea_orm_migration::MigrationTrait>> {
        vec![
            Box::new(migrations_v001::Migration),
        ]
    }
}

/// 执行数据库迁移
pub async fn run(db: &Connection) -> Result<(), DbErr> {
    info!("开始执行数据库迁移...");
    match AppMigrator::up(&**db, None).await {
        Ok(_) => info!("数据库迁移完成"),
        Err(e) => {
            error!("数据库迁移失败: {}", e);
            return Err(e);
        }
    }
    Ok(())
}

/// 回滚迁移
pub async fn rollback(db: &Connection, steps: u32) -> Result<(), DbErr> {
    AppMigrator::down(&**db, Some(steps)).await
}

/// 检查迁移状态
pub async fn check(db: &Connection) -> Result<(), DbErr> {
    let status = AppMigrator::get_migration_with_status(&**db).await?;
    info!("迁移状态条目数量: {}", status.len());
    Ok(())
}
