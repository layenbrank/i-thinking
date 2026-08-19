use sea_orm_migration::{prelude::*, schema::*};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table(Uploads::Table)
                    .table(Users::Table)
                    .table(Alias::new("auth"))
                    .table(Alias::new("migration"))
                    .cascade()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Users::Table)
                    .if_not_exists()
                    .col(pk_uuid(Users::Id))
                    .col(text_uniq(Users::Username))
                    .col(text(Users::Password))
                    .col(text_null(Users::Email))
                    .col(integer_null(Users::Age))
                    .col(timestamp_with_time_zone(Users::CreatedAt))
                    .col(timestamp_with_time_zone(Users::UpdatedAt))
                    .to_owned(),
            )
            .await?;

        let mut uploaded_chunks = array(Uploads::UploadedChunks, ColumnType::Integer);
        uploaded_chunks.default("{}");

        manager
            .create_table(
                Table::create()
                    .table(Uploads::Table)
                    .if_not_exists()
                    .col(pk_uuid(Uploads::Id))
                    .col(text(Uploads::FileName))
                    .col(big_integer(Uploads::FileSize))
                    .col(text(Uploads::FileHash))
                    .col(text(Uploads::MimeType))
                    .col(integer(Uploads::ChunkSize))
                    .col(integer(Uploads::TotalChunks))
                    .col(uploaded_chunks)
                    .col(text(Uploads::Status))
                    .col(text_null(Uploads::StoragePath))
                    .col(uuid_null(Uploads::UploaderId))
                    .col(timestamp_with_time_zone(Uploads::CreatedAt))
                    .col(timestamp_with_time_zone(Uploads::UpdatedAt))
                    .col(timestamp_with_time_zone_null(Uploads::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_uploads_uploader_id")
                            .from(Uploads::Table, Uploads::UploaderId)
                            .to(Users::Table, Users::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_uploads_file_hash")
                    .table(Uploads::Table)
                    .col(Uploads::FileHash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_uploads_uploader_id")
                    .table(Uploads::Table)
                    .col(Uploads::UploaderId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(Uploads::Table).if_exists().to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Users::Table).if_exists().to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Users {
    Table,
    Id,
    Username,
    Password,
    Email,
    Age,
    CreatedAt,
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Uploads {
    Table,
    Id,
    FileName,
    FileSize,
    FileHash,
    MimeType,
    ChunkSize,
    TotalChunks,
    UploadedChunks,
    Status,
    StoragePath,
    UploaderId,
    CreatedAt,
    UpdatedAt,
    ExpiresAt,
}
