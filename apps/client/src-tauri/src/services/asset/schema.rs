use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq, Serialize, Deserialize)]
#[sea_orm(table_name = "asset")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,

    #[serde(rename = "tenantID")]
    #[sea_orm(column_name = "tenantID")]
    pub tenant_id: Option<String>,

    pub kind: Option<String>,
    pub hash: String,
    pub sha: String,
    pub size: i64,
    pub index: i64,
    pub mime: String,
    pub extension: Option<String>,

    #[sea_orm(column_name = "fileName")]
    pub file_name: String,

    #[sea_orm(column_name = "filePath")]
    pub file_path: String,

    pub metadata: Option<String>,
    pub status: String,

    #[serde(rename = "deviceID")]
    #[sea_orm(column_name = "deviceID")]
    pub device_id: String,

    #[sea_orm(column_name = "archivedAt")]
    pub archived_at: Option<i64>,

    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,

    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

/// 与 `asset.d.ts` `Read.Payload` 一致。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadP {
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub id: Option<String>,
    pub hash: Option<String>,
    pub mime: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "deviceID")]
    pub device_id: Option<String>,
    pub extension: Option<String>,
    #[serde(rename = "fileName")]
    pub file_name: Option<String>,
}

/// `ReadsP`：在 `ReadP` 上增加分页。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadsP {
    #[serde(flatten)]
    pub filter: ReadP,
    pub limit: Option<u64>,
    pub offset: Option<u64>,
}

/// 与 `asset.d.ts` `Insert.Payload` 一致；`index` 由服务默认。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertP {
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub hash: String,
    pub sha: Option<String>,
    pub size: i64,
    pub index: Option<i64>,
    pub mime: String,
    #[serde(default)]
    pub extension: String,
    #[serde(rename = "fileName")]
    pub file_name: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub metadata: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "deviceID")]
    pub device_id: String,
    #[serde(rename = "archivedAt")]
    pub archived_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsertR {
    pub id: String,
}

pub type UpdateP = InsertP;

/// 与 `asset.d.ts` `Update.Payload`：`{ id, updates }`
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateBody {
    pub id: String,
    pub updates: UpdateP,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedAtFilter {
    pub operator: String,
    pub value: i64,
}

/// 与 `asset.d.ts` `Remove.Payload` 一致。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveP {
    pub id: Option<String>,
    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,
    pub kind: Option<String>,
    pub hash: Option<String>,
    pub mime: Option<String>,
    pub extension: Option<String>,
    #[serde(rename = "fileName")]
    pub file_name: Option<String>,
    pub status: Option<String>,
    #[serde(rename = "deviceID")]
    pub device_id: Option<String>,
    #[serde(rename = "archivedAt")]
    pub archived_at: Option<ArchivedAtFilter>,
}
