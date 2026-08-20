use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WriteP {
    /// 文档 ID；省略则自动生成 UUID
    #[schema(example = "doc-1")]
    pub id: Option<String>,
    #[schema(example = "Rust 服务端")]
    pub title: String,
    #[schema(example = "接入 Redis 与 Elasticsearch")]
    pub content: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct QueryP {
    #[schema(example = "Redis")]
    pub q: String,
    #[schema(example = 10)]
    pub size: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct WriteR {
    pub id: String,
    pub index: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HitR {
    pub id: String,
    pub score: Option<f64>,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct SearchR {
    pub took: i64,
    pub total: i64,
    pub hits: Vec<HitR>,
}

impl WriteP {
    pub fn resolve_id(&self) -> String {
        self.id
            .clone()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| Uuid::new_v4().to_string())
    }
}
