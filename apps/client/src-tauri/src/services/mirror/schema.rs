use sea_orm::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "mirror")]
#[serde(rename_all = "camelCase")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub title: String,
    pub index: i32,
    pub mark: String,
    pub description: String,
    pub size: Size,
    pub shape: Shape,
    pub direction: Direction,
    pub overlay: String,
    pub background: Option<String>,
    pub backdrop: Option<String>,

    #[sea_orm(column_name = "updatedAt")]
    pub updated_at: i64,

    #[sea_orm(column_name = "createdAt")]
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Background {
    color: Option<String>,
    image: Option<String>,
    repeat: Option<String>,
    size: Option<String>,
    position: Option<String>,
    attachment: Option<String>,
    clip: Option<String>,
    blend_mode: Option<String>,
    origin: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Backdrop {
    blur: Option<String>,
    brightness: Option<String>,
    contrast: Option<String>,
    drop_shadow: Option<String>,
    grayscale: Option<String>,
    hue_rotate: Option<String>,
    opacity: Option<String>,
    saturate: Option<String>,
    sepia: Option<String>,
    url: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum Shape {
    #[sea_orm(string_value = "square")]
    Square,
    #[sea_orm(string_value = "circle")]
    Circle,
    #[sea_orm(string_value = "rectangle")]
    Rectangle,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum Size {
    #[sea_orm(string_value = "mini")]
    Mini,
    #[sea_orm(string_value = "small")]
    Small,
    #[sea_orm(string_value = "medium")]
    Medium,
    #[sea_orm(string_value = "large")]
    Large,
    #[sea_orm(string_value = "huge")]
    Huge,
    #[sea_orm(string_value = "massive")]
    Massive,
    #[sea_orm(string_value = "ultra")]
    Ultra,
}

#[derive(Debug, Clone, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum Direction {
    #[sea_orm(string_value = "vertical")]
    Vertical,
    #[sea_orm(string_value = "horizontal")]
    Horizontal,
}

impl ActiveModelBehavior for ActiveModel {}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "crate::services::application::schema::Entity")]
    Application,
}

impl Related<crate::services::application::schema::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Application.def()
    }
}

// ==================== DTO ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Write {
    pub index: i32,
    pub title: String,
    pub mark: String,
    pub description: String,
    pub size: Size,
    pub shape: Shape,
    pub direction: Direction,
    pub overlay: String,
    pub background: Option<String>,
    pub backdrop: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum WriteP {
    One(Write),
    Many(Vec<Write>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Read {
    pub id: Option<String>,
    pub title: Option<String>,
    pub mark: Option<String>,
    pub size: Option<Size>,
    pub shape: Option<Shape>,
    pub direction: Option<Direction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ReadP {
    One(Read),
    Many(Vec<Read>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Change {
    pub index: Option<i32>,
    pub title: Option<String>,
    pub mark: Option<String>,
    pub description: Option<String>,
    pub size: Option<Size>,
    pub shape: Option<Shape>,
    pub direction: Option<Direction>,
    pub overlay: Option<String>,
    pub background: Option<String>,
    pub backdrop: Option<String>,
    pub updated_at: Option<i64>,
    pub created_at: Option<i64>,
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
