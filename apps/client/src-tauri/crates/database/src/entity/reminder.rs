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
    pub due_at: i64,
    #[sea_orm(column_name = "endAt")]
    pub end_at: Option<i64>,
    #[sea_orm(column_name = "isAllDay")]
    pub is_all_day: bool,
    #[sea_orm(column_name = "isCompleted")]
    pub is_completed: bool,
    #[sea_orm(column_name = "completedAt")]
    pub completed_at: Option<i64>,
    pub priority: i32,
    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,
    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "crate::entity::calendar_event::Entity")]
    CalendarEvent,
}

impl Related<crate::entity::calendar_event::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::CalendarEvent.def()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Read {
    pub id: Option<String>,
    pub title: Option<String>,
    pub is_completed: Option<bool>,
    /// Inclusive lower bound for dueAt (epoch ms).
    pub due_from: Option<i64>,
    /// Exclusive upper bound for dueAt (epoch ms).
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
    pub due_at: i64,
    pub end_at: Option<i64>,
    #[serde(default)]
    pub is_all_day: bool,
    #[serde(default)]
    pub is_completed: bool,
    pub completed_at: Option<i64>,
    #[serde(default)]
    pub priority: i32,
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
    pub due_at: Option<i64>,
    pub end_at: Option<Option<i64>>,
    pub is_all_day: Option<bool>,
    pub is_completed: Option<bool>,
    pub completed_at: Option<Option<i64>>,
    pub priority: Option<i32>,
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
