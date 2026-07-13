use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();
        db.execute_unprepared("PRAGMA journal_mode=WAL").await?;
        db.execute_unprepared("PRAGMA foreign_keys=ON").await?;

        manager
            .create_table(
                Table::create()
                    .table(Mirror::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Mirror::Id).string().not_null().primary_key())
                    .col(ColumnDef::new(Mirror::Title).string().not_null())
                    .col(ColumnDef::new(Mirror::Index).big_integer().not_null())
                    .col(ColumnDef::new(Mirror::Mark).string().not_null().default(""))
                    .col(
                        ColumnDef::new(Mirror::Description)
                            .string()
                            .not_null()
                            .default("暂无描述"),
                    )
                    .col(
                        ColumnDef::new(Mirror::Size)
                            .string()
                            .not_null()
                            .default("medium"),
                    )
                    .col(
                        ColumnDef::new(Mirror::Shape)
                            .string()
                            .not_null()
                            .default("rectangle"),
                    )
                    .col(
                        ColumnDef::new(Mirror::Direction)
                            .string()
                            .not_null()
                            .default("horizontal"),
                    )
                    .col(
                        ColumnDef::new(Mirror::Overlay)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Mirror::Background).string().null())
                    .col(ColumnDef::new(Mirror::Backdrop).string().null())
                    .col(ColumnDef::new(Mirror::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Mirror::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Application::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Application::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Application::Index).big_integer().not_null())
                    .col(ColumnDef::new(Application::Title).string().not_null())
                    .col(ColumnDef::new(Application::Url).string().null())
                    .col(ColumnDef::new(Application::Round).string().null())
                    .col(ColumnDef::new(Application::Mark).string().null())
                    .col(ColumnDef::new(Application::Component).string().not_null())
                    .col(ColumnDef::new(Application::Description).string().null())
                    .col(ColumnDef::new(Application::Background).string().null())
                    .col(ColumnDef::new(Application::Backdrop).string().null())
                    .col(ColumnDef::new(Application::MirrorID).string().not_null())
                    .col(ColumnDef::new(Application::TextSize).string().null())
                    .col(ColumnDef::new(Application::TextColor).string().null())
                    .col(ColumnDef::new(Application::CollectionID).string().null())
                    .col(
                        ColumnDef::new(Application::DownloadCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(
                        ColumnDef::new(Application::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Application::UpdatedAt)
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

        manager
            .create_table(
                Table::create()
                    .table(Countdown::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Countdown::Id).string().not_null().primary_key())
                    .col(
                        ColumnDef::new(Countdown::WorkStart)
                            .string()
                            .not_null()
                            .default("09:00"),
                    )
                    .col(
                        ColumnDef::new(Countdown::WorkEnd)
                            .string()
                            .not_null()
                            .default("18:00"),
                    )
                    .col(
                        ColumnDef::new(Countdown::WorkDays)
                            .string()
                            .not_null()
                            .default("[1,2,3,4,5]"),
                    )
                    .col(
                        ColumnDef::new(Countdown::MonthlySalary)
                            .double()
                            .not_null()
                            .default(0.0),
                    )
                    .col(
                        ColumnDef::new(Countdown::PayDay)
                            .integer()
                            .not_null()
                            .default(15),
                    )
                    .col(ColumnDef::new(Countdown::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Countdown::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        db.execute_unprepared(
            "INSERT OR IGNORE INTO countdown \
             (id, workStart, workEnd, workDays, monthlySalary, payDay, createdAt, updatedAt) \
             VALUES ('00000000-0000-0000-0000-000000000001', '09:00', '18:00', '[1,2,3,4,5]', 0.0, 15, \
             CAST(strftime('%s', 'now') AS INTEGER) * 1000, \
             CAST(strftime('%s', 'now') AS INTEGER) * 1000)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_app_mirror ON application (mirrorID)",
        )
        .await?;
        db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_asset_hash ON asset (hash)")
            .await?;
        db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_asset_path ON asset (filePath)")
            .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notification (tenantID)",
        )
        .await?;
        db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_cmt_tenant ON comment (tenantID)")
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Application::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Mirror::Table).to_owned())
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
            .drop_table(Table::drop().table(Countdown::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum Countdown {
    Table,
    Id,
    #[iden = "workStart"]
    WorkStart,
    #[iden = "workEnd"]
    WorkEnd,
    #[iden = "workDays"]
    WorkDays,
    #[iden = "monthlySalary"]
    MonthlySalary,
    #[iden = "payDay"]
    PayDay,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Mirror {
    Table,
    Id,
    Title,
    Index,
    Mark,
    Description,
    Size,
    Shape,
    Direction,
    Overlay,
    Background,
    Backdrop,

    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Application {
    Table,
    Id,
    Index,
    Title,
    Round,
    Url,
    Mark,
    Component,
    Description,
    Background,
    Backdrop,

    #[iden = "downloadCount"]
    DownloadCount,
    #[iden = "textSize"]
    TextSize,
    #[iden = "textColor"]
    TextColor,
    #[iden = "mirrorID"]
    MirrorID,
    #[iden = "collectionID"]
    CollectionID,
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
