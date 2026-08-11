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
                        ColumnDef::new(Mirror::Overlay)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Mirror::Background).string().null())
                    .col(ColumnDef::new(Mirror::Backdrop).string().null())
                    .col(ColumnDef::new(Mirror::ArchivedAt).big_integer().null())
                    .col(ColumnDef::new(Mirror::CreatedAt).big_integer().not_null())
                    .col(ColumnDef::new(Mirror::UpdatedAt).big_integer().not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(MagneticTile::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(MagneticTile::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(MagneticTile::Index).big_integer().not_null())
                    .col(ColumnDef::new(MagneticTile::Title).string().not_null())
                    .col(ColumnDef::new(MagneticTile::Url).string().null())
                    .col(ColumnDef::new(MagneticTile::Round).string().null())
                    .col(ColumnDef::new(MagneticTile::Mark).string().null())
                    .col(ColumnDef::new(MagneticTile::Component).string().not_null())
                    .col(ColumnDef::new(MagneticTile::Description).string().null())
                    .col(ColumnDef::new(MagneticTile::Background).string().null())
                    .col(ColumnDef::new(MagneticTile::Backdrop).string().null())
                    .col(ColumnDef::new(MagneticTile::MirrorID).string().not_null())
                    .col(ColumnDef::new(MagneticTile::TextColor).string().null())
                    .col(ColumnDef::new(MagneticTile::CollectionID).string().null())
                    .col(
                        ColumnDef::new(MagneticTile::Size)
                            .integer()
                            .not_null()
                            .default(3),
                    )
                    .col(
                        ColumnDef::new(MagneticTile::Shape)
                            .string()
                            .not_null()
                            .default("rectangle"),
                    )
                    .col(
                        ColumnDef::new(MagneticTile::Direction)
                            .string()
                            .not_null()
                            .default("horizontal"),
                    )
                    .col(
                        ColumnDef::new(MagneticTile::DownloadCount)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(MagneticTile::ArchivedAt).big_integer().null())
                    .col(
                        ColumnDef::new(MagneticTile::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(MagneticTile::UpdatedAt)
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
                    .col(
                        ColumnDef::new(Countdown::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
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
                    .col(ColumnDef::new(Countdown::ArchivedAt).big_integer().null())
                    .col(
                        ColumnDef::new(Countdown::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Countdown::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        // reminder must exist before calendar (FK)
        manager
            .create_table(
                Table::create()
                    .table(Reminder::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Reminder::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Reminder::Title).string().not_null())
                    .col(
                        ColumnDef::new(Reminder::Notes)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Reminder::DueAt).big_integer().null())
                    .col(ColumnDef::new(Reminder::EndAt).big_integer().null())
                    .col(ColumnDef::new(Reminder::FireTime).string().null())
                    .col(
                        ColumnDef::new(Reminder::WeekDays)
                            .string()
                            .not_null()
                            .default("[]"),
                    )
                    .col(
                        ColumnDef::new(Reminder::EntireDay)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Reminder::Enabled)
                            .boolean()
                            .not_null()
                            .default(true),
                    )
                    .col(ColumnDef::new(Reminder::SnoozeUntil).big_integer().null())
                    .col(ColumnDef::new(Reminder::LastFiredAt).big_integer().null())
                    .col(
                        ColumnDef::new(Reminder::Priority)
                            .integer()
                            .not_null()
                            .default(0),
                    )
                    .col(ColumnDef::new(Reminder::ArchivedAt).big_integer().null())
                    .col(
                        ColumnDef::new(Reminder::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Reminder::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Calendar::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Calendar::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Calendar::Title).string().not_null())
                    .col(
                        ColumnDef::new(Calendar::Notes)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(ColumnDef::new(Calendar::StartAt).big_integer().not_null())
                    .col(ColumnDef::new(Calendar::EndAt).big_integer().not_null())
                    .col(
                        ColumnDef::new(Calendar::EntireDay)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Calendar::Color).string().null())
                    .col(ColumnDef::new(Calendar::ReminderID).string().null())
                    .col(ColumnDef::new(Calendar::ArchivedAt).big_integer().null())
                    .col(
                        ColumnDef::new(Calendar::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Calendar::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_calendar_reminder")
                            .from(Calendar::Table, Calendar::ReminderID)
                            .to(Reminder::Table, Reminder::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        db.execute_unprepared(
            "INSERT OR IGNORE INTO countdown \
             (id, workStart, workEnd, workDays, monthlySalary, payDay, archivedAt, createdAt, updatedAt) \
             VALUES ('00000000-0000-0000-0000-000000000001', '09:00', '18:00', '[1,2,3,4,5]', 0.0, 15, NULL, \
             CAST(strftime('%s', 'now') AS INTEGER) * 1000, \
             CAST(strftime('%s', 'now') AS INTEGER) * 1000)",
        )
        .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_magnetic_tile_mirror ON magneticTile (mirrorID)",
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
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_reminder_dueAt ON reminder (dueAt)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_reminder_fireTime ON reminder (fireTime)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_reminder_enabled ON reminder (enabled)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_reminder_archivedAt ON reminder (archivedAt)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_calendar_startAt ON calendar (startAt)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_calendar_reminderID ON calendar (reminderID)",
        )
        .await?;

        // ── overlay（浮层项，逐行结构化存储，kind 区分 texture/tile） ──
        manager
            .create_table(
                Table::create()
                    .table(Overlay::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Overlay::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Overlay::Kind).string().not_null())
                    .col(ColumnDef::new(Overlay::X).double().not_null())
                    .col(ColumnDef::new(Overlay::Y).double().not_null())
                    .col(ColumnDef::new(Overlay::W).double().not_null())
                    .col(ColumnDef::new(Overlay::H).double().not_null())
                    .col(ColumnDef::new(Overlay::Z).big_integer().not_null())
                    .col(ColumnDef::new(Overlay::Src).string().null())
                    .col(ColumnDef::new(Overlay::Opacity).double().null())
                    .col(ColumnDef::new(Overlay::TenantId).string().null())
                    .col(ColumnDef::new(Overlay::Component).string().null())
                    .col(ColumnDef::new(Overlay::Size).integer().null())
                    .col(ColumnDef::new(Overlay::Shape).string().null())
                    .col(ColumnDef::new(Overlay::Direction).string().null())
                    .col(ColumnDef::new(Overlay::Round).string().null())
                    .col(ColumnDef::new(Overlay::Background).string().null())
                    .col(
                        ColumnDef::new(Overlay::Scale)
                            .double()
                            .not_null()
                            .default(1.0),
                    )
                    .col(ColumnDef::new(Overlay::ArchivedAt).big_integer().null())
                    .col(
                        ColumnDef::new(Overlay::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Overlay::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await?;

        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_overlay_archivedAt ON overlay (archivedAt)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_overlay_tenantID ON overlay (tenantID)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Calendar::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Reminder::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(MagneticTile::Table).to_owned())
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
        manager
            .drop_table(Table::drop().table(Overlay::Table).to_owned())
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
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Reminder {
    Table,
    Id,
    Title,
    Notes,
    #[iden = "dueAt"]
    DueAt,
    #[iden = "endAt"]
    EndAt,
    #[iden = "fireTime"]
    FireTime,
    #[iden = "weekDays"]
    WeekDays,
    #[iden = "entireDay"]
    EntireDay,
    Enabled,
    #[iden = "snoozeUntil"]
    SnoozeUntil,
    #[iden = "lastFiredAt"]
    LastFiredAt,
    Priority,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum Calendar {
    Table,
    Id,
    Title,
    Notes,
    #[iden = "startAt"]
    StartAt,
    #[iden = "endAt"]
    EndAt,
    #[iden = "entireDay"]
    EntireDay,
    Color,
    #[iden = "reminderID"]
    ReminderID,
    #[iden = "archivedAt"]
    ArchivedAt,
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
    Overlay,
    Background,
    Backdrop,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum MagneticTile {
    #[iden = "magneticTile"]
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
    Size,
    Shape,
    Direction,

    #[iden = "downloadCount"]
    DownloadCount,
    #[iden = "textColor"]
    TextColor,
    #[iden = "mirrorID"]
    MirrorID,
    #[iden = "collectionID"]
    CollectionID,
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

#[derive(Iden)]
enum Overlay {
    Table,
    Id,
    Kind,
    X,
    Y,
    W,
    H,
    Z,
    Src,
    Opacity,
    #[iden = "tenantID"]
    TenantId,
    Component,
    Size,
    Shape,
    Direction,
    Round,
    Background,
    Scale,
    #[iden = "archivedAt"]
    ArchivedAt,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}
