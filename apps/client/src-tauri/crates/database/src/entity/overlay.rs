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

    /// 标题：tile 与磁贴一致；texture 可用文件名
    #[serde(default)]
    pub title: String,

    /// 角标 / 缩写，可空
    pub mark: Option<String>,

    /// 缩放比例，默认 1.0
    pub scale: f64,

    // ── 通用 ──
    /// 软删除时间戳；仅贴图（texture）使用，磁贴（tile）为硬删除，此字段恒为 NULL。
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
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub mark: Option<String>,
    #[serde(default = "default_scale")]
    pub scale: f64,
}

fn default_scale() -> f64 {
    1.0
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
    pub title: Option<String>,
    pub mark: Option<String>,
    pub scale: Option<f64>,
}