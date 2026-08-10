use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "overlay")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,

    /// 浮层项类型：`texture` | `tile`
    pub kind: String,

    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub z: i64,

    // ── texture 专属 ──
    pub src: Option<String>,
    pub opacity: Option<f64>,

    // ── tile 专属 ──
    #[serde(rename = "tenantID")]
    #[sea_orm(column_name = "tenantID")]
    pub tenant_id: Option<String>,

    pub component: Option<String>,
    pub size: Option<i32>,
    pub shape: Option<String>,
    pub direction: Option<String>,
    pub round: Option<String>,

    /// 背景配置 JSON 字符串
    pub background: Option<String>,

    // ── 通用 ──
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

/// 写入体；不传 `id`，服务端生成（tile 用 `tenantID` 作 id）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Write {
    pub kind: String,

    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
    pub z: i64,

    pub src: Option<String>,
    pub opacity: Option<f64>,

    #[serde(rename = "tenantID")]
    pub tenant_id: Option<String>,

    pub component: Option<String>,
    pub size: Option<i32>,
    pub shape: Option<String>,
    pub direction: Option<String>,
    pub round: Option<String>,
    pub background: Option<String>,
}

/// 更新 patch；仅更新 `Some` 的字段。
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Update {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub z: Option<i64>,

    pub src: Option<String>,
    pub opacity: Option<f64>,

    pub component: Option<String>,
    pub size: Option<i32>,
    pub shape: Option<String>,
    pub direction: Option<String>,
    pub round: Option<String>,
    pub background: Option<String>,
}
