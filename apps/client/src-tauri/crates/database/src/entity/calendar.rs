use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "calendar")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub title: String,
    pub notes: String,
    #[sea_orm(column_name = "startAt")]
    pub start_at: i64,
    #[sea_orm(column_name = "endAt")]
    pub end_at: i64,
    #[sea_orm(column_name = "entireDay")]
    pub entire_day: bool,
    pub color: Option<String>,
    #[serde(rename = "reminderID")]
    #[sea_orm(column_name = "reminderID")]
    pub reminder_id: Option<String>,
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
    #[sea_orm(
        belongs_to = "crate::entity::reminder::Entity",
        from = "Column::ReminderId",
        to = "crate::entity::reminder::Column::Id",
        on_delete = "SetNull",
        on_update = "Cascade"
    )]
    Reminder,
}

impl Related<crate::entity::reminder::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Reminder.def()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Read {
    pub id: Option<String>,
    pub title: Option<String>,
    #[serde(rename = "reminderID")]
    pub reminder_id: Option<String>,
    pub include_archived: Option<bool>,
    pub range_from: Option<i64>,
    pub range_to: Option<i64>,
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
    pub start_at: i64,
    pub end_at: i64,
    #[serde(default)]
    pub entire_day: bool,
    pub color: Option<String>,
    #[serde(rename = "reminderID")]
    pub reminder_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum WriteP {
    One(Write),
    Many(Vec<Write>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Change {
    pub title: Option<String>,
    pub notes: Option<String>,
    pub start_at: Option<i64>,
    pub end_at: Option<i64>,
    pub entire_day: Option<bool>,
    pub color: Option<Option<String>>,
    #[serde(rename = "reminderID")]
    pub reminder_id: Option<Option<String>>,
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
