use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "reminder")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub title: String,
    pub notes: String,
    #[sea_orm(column_name = "dueAt")]
    pub due_at: Option<i64>,
    #[sea_orm(column_name = "endAt")]
    pub end_at: Option<i64>,
    #[sea_orm(column_name = "fireTime")]
    pub fire_time: Option<String>,
    #[sea_orm(column_name = "weekDays")]
    pub week_days: String,
    #[sea_orm(column_name = "entireDay")]
    pub entire_day: bool,
    pub enabled: bool,
    #[sea_orm(column_name = "snoozeUntil")]
    pub snooze_until: Option<i64>,
    #[sea_orm(column_name = "lastFiredAt")]
    pub last_fired_at: Option<i64>,
    pub priority: i32,
    #[sea_orm(column_name = "archivedAt")]
    pub archived_at: Option<i64>,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "crate::entity::calendar::Entity")]
    Calendar,
}

impl Related<crate::entity::calendar::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Calendar.def()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Read {
    pub id: Option<String>,
    pub title: Option<String>,
    pub enabled: Option<bool>,
    /// When true, include rows with archivedAt set. Default: active only.
    #[serde(default)]
    pub archived: bool,
    pub due_from: Option<i64>,
    pub due_to: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ReadP {
    One(Read),
    Many(Vec<Read>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Write {
    pub title: String,
    #[serde(default)]
    pub notes: String,
    pub due_at: Option<i64>,
    pub end_at: Option<i64>,
    pub fire_time: Option<String>,
    #[serde(default = "default_week_days")]
    pub week_days: String,
    #[serde(default)]
    pub entire_day: bool,
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub snooze_until: Option<i64>,
    #[serde(default)]
    pub priority: i32,
}

fn default_week_days() -> String {
    "[]".to_string()
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum WriteP {
    One(Write),
    Many(Vec<Write>),
}

/// Client-facing change; lastFiredAt is intentionally omitted.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Change {
    pub title: Option<String>,
    pub notes: Option<String>,
    pub due_at: Option<Option<i64>>,
    pub end_at: Option<Option<i64>>,
    pub fire_time: Option<Option<String>>,
    pub week_days: Option<String>,
    pub entire_day: Option<bool>,
    pub enabled: Option<bool>,
    pub snooze_until: Option<Option<i64>>,
    pub priority: Option<i32>,
    pub archived_at: Option<Option<i64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Update {
    pub key: String,
    pub change: Change,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum UpdateP {
    One(Update),
    Many(Vec<Update>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum RemoveP {
    One(String),
    Many(Vec<String>),
}
