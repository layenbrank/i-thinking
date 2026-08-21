use sea_orm::entity::prelude::*;

#[sea_orm::model]
#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "asset")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(column_type = "Text", nullable)]
    pub kind: Option<String>,
    #[sea_orm(column_type = "Text", indexed)]
    pub hash: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub sha: Option<String>,
    pub size: i64,
    #[sea_orm(column_type = "Text")]
    pub mime: String,
    #[sea_orm(column_type = "Text", nullable)]
    pub extension: Option<String>,
    #[sea_orm(column_type = "Text")]
    pub name: String,
    #[sea_orm(column_type = "Text")]
    pub status: String,
    /// 分片大小（字节）
    pub chunk: i32,
    /// 分片总数
    pub total: i32,
    #[sea_orm(column_name = "archivedAt", nullable)]
    pub archived_at: Option<DateTimeWithTimeZone>,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: DateTimeWithTimeZone,
    #[sea_orm(indexed)]
    pub creator: Option<Uuid>,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: DateTimeWithTimeZone,
    pub updater: Option<Uuid>,
    #[sea_orm(column_name = "expiresAt", nullable)]
    pub expires_at: Option<DateTimeWithTimeZone>,
    #[sea_orm(
        belongs_to,
        from = "creator",
        to = "id",
        relation_enum = "Creator",
        on_update = "Cascade",
        on_delete = "SetNull"
    )]
    pub created_by: HasOne<super::auth::Entity>,
    #[sea_orm(
        belongs_to,
        from = "updater",
        to = "id",
        relation_enum = "Updater",
        on_update = "Cascade",
        on_delete = "SetNull"
    )]
    pub updated_by: HasOne<super::auth::Entity>,
    #[sea_orm(has_many)]
    pub chunks: HasMany<super::chunk::Entity>,
}

impl ActiveModelBehavior for ActiveModel {}
