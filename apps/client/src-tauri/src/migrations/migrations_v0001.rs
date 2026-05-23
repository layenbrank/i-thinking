use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(Classify::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Classify::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Classify::Index).big_integer().not_null())
                    .col(ColumnDef::new(Classify::Title).string().not_null())
                    .col(
                        ColumnDef::new(Classify::Description)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Classify::Remark)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Classify::Status).string().not_null())
                    .col(
                        ColumnDef::new(Classify::Version)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Classify::DeviceId).string().not_null())
                    .col(ColumnDef::new(Classify::ArchivedAt).big_integer().null())
                    .col(ColumnDef::new(Classify::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Classify::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Assignment::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Assignment::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Assignment::TenantId).string().null())
                    .col(ColumnDef::new(Assignment::Index).big_integer().not_null())
                    .col(ColumnDef::new(Assignment::Title).string().not_null())
                    .col(
                        ColumnDef::new(Assignment::Description)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Assignment::Remark)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Assignment::Status).string().not_null())
                    .col(ColumnDef::new(Assignment::Priority).string().not_null())
                    .col(
                        ColumnDef::new(Assignment::Proposer)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Assignment::Assignee)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Assignment::Reviewer)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(Assignment::Version)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Assignment::DeviceId).string().not_null())
                    .col(ColumnDef::new(Assignment::ArchivedAt).big_integer().null())
                    .col(
                        ColumnDef::new(Assignment::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Assignment::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Asset::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Asset::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(Asset::TenantId).string().null())
                    .col(ColumnDef::new(Asset::Kind).string().null())
                    .col(ColumnDef::new(Asset::Hash).string().not_null())
                    .col(
                        ColumnDef::new(Asset::Sha)
                            .string()
                            .not_null()
                            .default("sha256"),
                    )
                    .col(ColumnDef::new(Asset::Size).big_integer().not_null())
                    .col(
                        ColumnDef::new(Asset::Index)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Asset::Mime).string().not_null())
                    .col(ColumnDef::new(Asset::Extension).string().null())
                    .col(ColumnDef::new(Asset::FileName).string().not_null())
                    .col(ColumnDef::new(Asset::FilePath).string().not_null())
                    .col(ColumnDef::new(Asset::Metadata).string().null())
                    .col(
                        ColumnDef::new(Asset::Status)
                            .string()
                            .not_null()
                            .default("001"),
                    )
                    .col(
                        ColumnDef::new(Asset::Version)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Asset::DeviceId).string().not_null())
                    .col(ColumnDef::new(Asset::ArchivedAt).big_integer().null())
                    .col(ColumnDef::new(Asset::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Asset::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(User::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(User::Username).string().not_null())
                    .col(ColumnDef::new(User::Password).string().not_null())
                    .col(ColumnDef::new(User::Avatar).string().not_null().default(""))
                    .col(
                        ColumnDef::new(User::Version)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(User::DeviceId).string().not_null())
                    .col(ColumnDef::new(User::ArchivedAt).big_integer().null())
                    .col(ColumnDef::new(User::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(User::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Notification::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Notification::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Notification::Type).string().not_null())
                    .col(ColumnDef::new(Notification::Title).string().not_null())
                    .col(ColumnDef::new(Notification::Body).string().not_null())
                    .col(ColumnDef::new(Notification::TenantId).string().null())
                    .col(
                        ColumnDef::new(Notification::Version)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Notification::DeviceId).string().not_null())
                    .col(
                        ColumnDef::new(Notification::ArchivedAt)
                            .big_integer()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(Notification::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Notification::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Comment::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Comment::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Comment::TenantId).string().not_null())
                    .col(ColumnDef::new(Comment::Username).string().not_null())
                    .col(
                        ColumnDef::new(Comment::Avatar)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Comment::Description).string().not_null())
                    .col(
                        ColumnDef::new(Comment::Version)
                            .big_integer()
                            .not_null()
                            .default(1),
                    )
                    .col(ColumnDef::new(Comment::DeviceId).string().not_null())
                    .col(ColumnDef::new(Comment::ArchivedAt).big_integer().null())
                    .col(ColumnDef::new(Comment::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Comment::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        // ── 同步基础设施表 ──
        let db = manager.get_connection();

        // 全局序列表 ── 单行存储当前最大版本号（Lamport Clock）
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS unify_sequence (
                key TEXT NOT NULL PRIMARY KEY,
                value INTEGER NOT NULL DEFAULT 0
            )",
        )
        .await?;

        // 墓碑表 ── 记录已删除记录的 ID、表名、版本号
        db.execute_unprepared(
            "CREATE TABLE IF NOT EXISTS unify_tombstone (
                id TEXT NOT NULL,
                sheet TEXT NOT NULL,
                version INTEGER NOT NULL,
                deleted_at INTEGER NOT NULL,
                PRIMARY KEY (id, sheet)
            )",
        )
        .await?;

        // 索引：按 (sheet, version) 加速同步拉取
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_tombstone_sheet_version
             ON unify_tombstone (sheet, version)",
        )
        .await?;

        // 初始化序列值为现有所有表的最大 version（向后兼容）
        db.execute_unprepared(
            "INSERT OR IGNORE INTO unify_sequence (key, value) VALUES ('seq',
                COALESCE((SELECT MAX(mv) FROM (
                    SELECT COALESCE(MAX(version), 0) AS mv FROM asset
                    UNION ALL SELECT COALESCE(MAX(version), 0) AS mv FROM assignment
                    UNION ALL SELECT COALESCE(MAX(version), 0) AS mv FROM classify
                    UNION ALL SELECT COALESCE(MAX(version), 0) AS mv FROM comment
                    UNION ALL SELECT COALESCE(MAX(version), 0) AS mv FROM notification
                    UNION ALL SELECT COALESCE(MAX(version), 0) AS mv FROM user
                )), 0)
            )",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("DROP TABLE IF EXISTS unify_tombstone")
            .await?;
        db.execute_unprepared("DROP TABLE IF EXISTS unify_sequence")
            .await?;
        manager
            .drop_table(Table::drop().table(Comment::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Notification::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Asset::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Assignment::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Classify::Table).to_owned())
            .await?;
        Ok(())
    }
}

#[derive(Iden)]
enum Assignment {
    Table,
    Id,
    #[iden = "tenantID"]
    TenantId,
    Index,
    Title,
    Description,
    Remark,
    Status,
    Priority,
    Proposer,
    Assignee,
    Reviewer,
    Version,
    #[iden = "deviceID"]
    DeviceId,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Classify {
    Table,
    Id,
    Index,
    Title,
    Description,
    Remark,
    Status,
    Version,
    #[iden = "deviceID"]
    DeviceId,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Asset {
    Table,
    Id,
    #[iden = "tenantID"]
    TenantId,
    Kind,
    Hash,
    Sha,
    Size,
    Index,
    Mime,
    Extension,
    #[iden = "fileName"]
    FileName,
    #[iden = "filePath"]
    FilePath,
    Metadata,
    Status,
    Version,
    #[iden = "deviceID"]
    DeviceId,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum User {
    Table,
    Id,
    Username,
    Password,
    Avatar,
    Version,
    #[iden = "deviceID"]
    DeviceId,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Notification {
    Table,
    Id,
    Type,
    Title,
    Body,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "tenantID"]
    TenantId,
    Version,
    #[iden = "deviceID"]
    DeviceId,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Comment {
    Table,
    Id,
    #[iden = "tenantID"]
    TenantId,
    Username,
    Avatar,
    Description,
    Version,
    #[iden = "deviceID"]
    DeviceId,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}
