use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

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
                    .col(ColumnDef::new(Reminder::DueAt).big_integer().not_null())
                    .col(ColumnDef::new(Reminder::EndAt).big_integer().null())
                    .col(
                        ColumnDef::new(Reminder::IsAllDay)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(Reminder::IsCompleted)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(Reminder::CompletedAt).big_integer().null())
                    .col(
                        ColumnDef::new(Reminder::Priority)
                            .integer()
                            .not_null()
                            .default(0),
                    )
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
                    .table(CalendarEvent::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(CalendarEvent::Id)
                            .string()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(CalendarEvent::Title).string().not_null())
                    .col(
                        ColumnDef::new(CalendarEvent::Notes)
                            .string()
                            .not_null()
                            .default(""),
                    )
                    .col(
                        ColumnDef::new(CalendarEvent::StartAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CalendarEvent::EndAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CalendarEvent::IsAllDay)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(ColumnDef::new(CalendarEvent::Color).string().null())
                    .col(ColumnDef::new(CalendarEvent::ReminderID).string().null())
                    .col(
                        ColumnDef::new(CalendarEvent::CreatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(CalendarEvent::UpdatedAt)
                            .big_integer()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_calendar_event_reminder")
                            .from(CalendarEvent::Table, CalendarEvent::ReminderID)
                            .to(Reminder::Table, Reminder::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        db.execute_unprepared("CREATE INDEX IF NOT EXISTS idx_reminder_dueAt ON reminder (dueAt)")
            .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_calendarEvent_startAt ON calendarEvent (startAt)",
        )
        .await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_calendarEvent_reminderID ON calendarEvent (reminderID)",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(CalendarEvent::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Reminder::Table).to_owned())
            .await?;
        Ok(())
    }
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
    #[iden = "isAllDay"]
    IsAllDay,
    #[iden = "isCompleted"]
    IsCompleted,
    #[iden = "completedAt"]
    CompletedAt,
    Priority,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}

#[derive(Iden)]
enum CalendarEvent {
    #[iden = "calendarEvent"]
    Table,
    Id,
    Title,
    Notes,
    #[iden = "startAt"]
    StartAt,
    #[iden = "endAt"]
    EndAt,
    #[iden = "isAllDay"]
    IsAllDay,
    Color,
    #[iden = "reminderID"]
    ReminderID,
    #[iden = "createdAt"]
    CreatedAt,
    #[iden = "updatedAt"]
    UpdatedAt,
}
