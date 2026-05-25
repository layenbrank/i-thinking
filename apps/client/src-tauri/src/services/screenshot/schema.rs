use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Deserialize, Serialize)]
#[sea_orm(table_name = "screenshot")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    #[serde(rename = "tenantID")]
    #[sea_orm(column_name = "tenantID")]
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub hash: String,
    pub size: i64,
    pub mime: String,
    pub extension: Option<String>,
    #[serde(rename = "fileName")]
    #[sea_orm(column_name = "fileName")]
    pub file_name: String,
    #[serde(rename = "filePath")]
    #[sea_orm(column_name = "filePath")]
    pub file_path: String,
    pub metadata: Option<String>,
    #[serde(rename = "deviceID")]
    #[sea_orm(column_name = "deviceID")]
    pub device_id: String,
    pub archived: Option<bool>,
    #[serde(rename = "archivedAt")]
    #[sea_orm(column_name = "archivedAt")]
    pub archived_at: Option<i64>,
    #[serde(rename = "createdAt")]
    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,
    #[serde(rename = "updatedAt")]
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Clone, Copy, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertP {
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub hash: String,
    pub size: i64,
    pub mime: String,
    pub extension: String,
    pub file_name: String,
    pub metadata: Option<String>,
    pub device_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertR {
    pub id: String,
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub hash: String,
    pub size: i64,
    pub mime: String,
    pub extension: Option<String>,
    pub file_name: String,
    pub metadata: Option<String>,
    pub device_id: String,
    pub archived_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadP {}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadR {
    pub id: String,
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub hash: String,
    pub size: i64,
    pub mime: String,
    pub extension: Option<String>,
    pub file_name: String,
    pub file_path: String,
    pub metadata: Option<String>,
    pub device_id: String,
    pub archived: bool,
    pub archived_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}
