use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "uploads")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(column_name = "fileName", column_type = "Text")]
    pub file_name: String,
    #[sea_orm(column_name = "fileSize")]
    pub file_size: i64,
    #[sea_orm(column_name = "fileHash", column_type = "Text", indexed)]
    pub file_hash: String,
    #[sea_orm(column_name = "mimeType", column_type = "Text")]
    pub mime_type: String,
    #[sea_orm(column_name = "chunkSize")]
    pub chunk_size: i32,
    #[sea_orm(column_name = "totalChunks")]
    pub total_chunks: i32,
    #[sea_orm(column_name = "uploadedChunks", default_value = "{}")]
    pub uploaded_chunks: Vec<i32>,
    #[sea_orm(column_type = "Text")]
    pub status: String,
    #[sea_orm(column_name = "storagePath", column_type = "Text", nullable)]
    pub storage_path: Option<String>,
    #[sea_orm(column_name = "uploaderID", indexed)]
    pub uploader_id: Option<Uuid>,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: DateTimeWithTimeZone,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: DateTimeWithTimeZone,
    #[sea_orm(column_name = "expiresAt", nullable)]
    pub expires_at: Option<DateTimeWithTimeZone>,
    #[sea_orm(
        belongs_to,
        from = "uploader_id",
        to = "id",
        on_update = "Cascade",
        on_delete = "SetNull"
    )]
    pub uploader: HasOne<super::users::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
