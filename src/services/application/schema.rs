use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum Size {
    Mini,
    Small,
    Medium,
    Large,
    Huge,
    Massive,
    Ultra,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum Shape {
    Square,
    Circle,
    Rectangle,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum Component {
    Bookmark,
    Calendar,
    Markdown,
    Settings,
    Clipchamp,
    Intelligence,
    Navigation,
    Marketplace,
    Developer,
    Collection,
    Signboard,
    Clock,
    Gallery,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum Direction {
    Horizontal,
    Vertical,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct App {
    pub id: String,
    pub index: u32,
    pub name: String,
    pub url: Option<String>,
    pub size: Size,
    pub width: Option<String>,
    pub round: Option<String>,
    pub shape: Shape,
    pub height: Option<String>,
    pub marker: Option<String>,
    pub mirror_id: String,
    pub text_size: Option<String>,
    pub updated_at: i64,
    pub created_at: i64,
    pub text_color: Option<String>,
    pub component: Component,
    pub direction: Direction,
    pub description: String,
    pub collection_id: Option<String>,
    pub download_count: u32,
    pub background_color: Option<String>,
    pub background_image: Option<String>,
}
