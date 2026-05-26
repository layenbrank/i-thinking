use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "application")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub index: u32,
    pub title: String,
    pub url: Option<String>,
    pub round: Option<String>,
    pub mark: Option<String>,
    pub component: String,
    pub description: Option<String>,
    pub background: Option<String>,
    pub backdrop: Option<String>,

    #[serde(rename = "mirrorID")]
    #[sea_orm(column_name = "mirrorID")]
    pub mirror_id: String,

    #[sea_orm(column_name = "textSize")]
    pub text_size: Option<String>,

    #[sea_orm(column_name = "textColor")]
    pub text_color: Option<String>,

    #[serde(rename = "collectionID")]
    #[sea_orm(column_name = "collectionID")]
    pub collection_id: Option<String>,

    #[sea_orm(column_name = "downloadCount")]
    pub download_count: i32,

    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,

    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "crate::services::mirror::schema::Entity",
        from = "Column::MirrorId",
        to = "crate::services::mirror::schema::Column::Id"
    )]
    Mirror,
}

impl Related<crate::services::mirror::schema::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Mirror.def()
    }
}

#[derive(Iden)]
pub enum Application {}
