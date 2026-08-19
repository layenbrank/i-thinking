use sea_orm_migration::{prelude::*, schema::*};

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "000001_20260819"
    }
}

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
                    .table(Alias::new("seaql_migrations"))
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
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
}

#[derive(DeriveIden)]
enum Uploads {
    Table,
    Id,
    #[sea_orm(iden = "fileName")]
    FileName,
    #[sea_orm(iden = "fileSize")]
    FileSize,
    #[sea_orm(iden = "fileHash")]
    FileHash,
    #[sea_orm(iden = "mimeType")]
    MimeType,
    #[sea_orm(iden = "chunkSize")]
    ChunkSize,
    #[sea_orm(iden = "totalChunks")]
    TotalChunks,
    #[sea_orm(iden = "uploadedChunks")]
    UploadedChunks,
    Status,
    #[sea_orm(iden = "storagePath")]
    StoragePath,
    #[sea_orm(iden = "uploaderID")]
    UploaderId,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}
