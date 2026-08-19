use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "uploads")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(column_type = "Text")]
    pub file_name: String,
    pub file_size: i64,
    #[sea_orm(column_type = "Text")]
    pub file_hash: String,
    #[sea_orm(column_type = "Text")]
    pub mime_type: String,
    pub chunk_size: i32,
    pub total_chunks: i32,
    pub uploaded_chunks: Vec<i32>,
    #[sea_orm(column_type = "Text")]
    pub status: String,
    #[sea_orm(column_type = "Text")]
    pub storage_path: Option<String>,
    pub uploader_id: Option<Uuid>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
    pub expires_at: Option<DateTimeWithTimeZone>,
}

impl ActiveModelBehavior for ActiveModel {}
