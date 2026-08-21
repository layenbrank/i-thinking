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
                    .table(Chunk::Table)
                    .table(Asset::Table)
                    .table(Auth::Table)
                    .cascade()
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Auth::Table)
                    .if_not_exists()
                    .col(pk_uuid(Auth::Id))
                    .col(text_uniq(Auth::Username))
                    .col(text(Auth::Password))
                    .col(text_null(Auth::Email))
                    .col(text_null(Auth::Phone))
                    .col(integer_null(Auth::Age))
                    .col(text_null(Auth::Gender))
                    .col(date_null(Auth::Birthday))
                    .col(uuid_null(Auth::Avatar))
                    .col(text(Auth::Role).default("USER"))
                    .col(text(Auth::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(Auth::ArchivedAt))
                    .col(timestamp_with_time_zone(Auth::CreatedAt))
                    .col(uuid_null(Auth::Creator))
                    .col(timestamp_with_time_zone(Auth::UpdatedAt))
                    .col(uuid_null(Auth::Updater))
                    .col(timestamp_with_time_zone_null(Auth::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_auth_creator")
                            .from(Auth::Table, Auth::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_auth_updater")
                            .from(Auth::Table, Auth::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Asset::Table)
                    .if_not_exists()
                    .col(pk_uuid(Asset::Id))
                    .col(text_null(Asset::Kind))
                    .col(text(Asset::Hash))
                    .col(text_null(Asset::Sha))
                    .col(big_integer(Asset::Size))
                    .col(text(Asset::Mime))
                    .col(text_null(Asset::Extension))
                    .col(text(Asset::Name))
                    .col(text(Asset::Status))
                    .col(integer(Asset::Chunk))
                    .col(integer(Asset::Total))
                    .col(timestamp_with_time_zone_null(Asset::ArchivedAt))
                    .col(timestamp_with_time_zone(Asset::CreatedAt))
                    .col(uuid_null(Asset::Creator))
                    .col(timestamp_with_time_zone(Asset::UpdatedAt))
                    .col(uuid_null(Asset::Updater))
                    .col(timestamp_with_time_zone_null(Asset::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_asset_creator")
                            .from(Asset::Table, Asset::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_asset_updater")
                            .from(Asset::Table, Asset::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Chunk::Table)
                    .if_not_exists()
                    .col(pk_uuid(Chunk::Id))
                    .col(uuid(Chunk::AssetId))
                    .col(integer(Chunk::Index))
                    .col(text(Chunk::Hash))
                    .col(big_integer(Chunk::Size))
                    .col(timestamp_with_time_zone(Chunk::CreatedAt))
                    .col(uuid_null(Chunk::Creator))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_asset")
                            .from(Chunk::Table, Chunk::AssetId)
                            .to(Asset::Table, Asset::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_creator")
                            .from(Chunk::Table, Chunk::Creator)
                            .to(Auth::Table, Auth::Id)
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
                    .name("idx_asset_hash")
                    .table(Asset::Table)
                    .col(Asset::Hash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_creator")
                    .table(Asset::Table)
                    .col(Asset::Creator)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_chunk_asset_index")
                    .table(Chunk::Table)
                    .col(Chunk::AssetId)
                    .col(Chunk::Index)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_chunk_hash")
                    .table(Chunk::Table)
                    .col(Chunk::Hash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_auth_phone")
                    .table(Auth::Table)
                    .col(Auth::Phone)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_auth_avatar")
                    .from(Auth::Table, Auth::Avatar)
                    .to(Asset::Table, Asset::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_foreign_key(
                ForeignKey::drop()
                    .name("fk_auth_avatar")
                    .table(Auth::Table)
                    .to_owned(),
            )
            .await?;

        manager
            .drop_table(Table::drop().table(Chunk::Table).if_exists().to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Asset::Table).if_exists().to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Auth::Table).if_exists().to_owned())
            .await?;
        Ok(())
    }
}

#[derive(DeriveIden)]
enum Auth {
    Table,
    Id,
    Username,
    Password,
    Email,
    Phone,
    Age,
    Gender,
    Birthday,
    Avatar,
    Role,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Asset {
    Table,
    Id,
    Kind,
    Hash,
    Sha,
    Size,
    Mime,
    Extension,
    Name,
    Status,
    Chunk,
    Total,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Chunk {
    Table,
    Id,
    #[sea_orm(iden = "assetId")]
    AssetId,
    Index,
    Hash,
    Size,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
}
