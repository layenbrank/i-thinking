use crate::clients::elasticsearch::EsClient;
use crate::services::search::schema::{HitR, QueryP, SearchR, WriteP, WriteR};
use crate::utils::response::{ErrorBody, external, request};

#[derive(Debug, thiserror::Error)]
pub enum SearchError {
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    #[error("Elasticsearch error: {0}")]
    EsError(String),
}

impl From<SearchError> for ErrorBody {
    fn from(err: SearchError) -> Self {
        match err {
            SearchError::InvalidParameter(msg) => {
                ErrorBody::custom(request::INVALID_PARAMETER_VALUE, msg)
            }
            SearchError::EsError(msg) => {
                ErrorBody::custom(external::THIRD_PARTY_API_ERROR, msg)
            }
        }
    }
}

pub struct SearchService;

impl SearchService {
    pub async fn toWrite(es: &EsClient, req: WriteP) -> Result<WriteR, SearchError> {
        if req.title.trim().is_empty() {
            return Err(SearchError::InvalidParameter("title 不能为空".into()));
        }
        if req.content.trim().is_empty() {
            return Err(SearchError::InvalidParameter("content 不能为空".into()));
        }

        let id = req.resolve_id();
        es.index_doc(&id, &req.title, &req.content)
            .await
            .map_err(|e| SearchError::EsError(e.to_string()))?;

        Ok(WriteR {
            id,
            index: es.index().to_string(),
        })
    }

    pub async fn toRead(es: &EsClient, req: QueryP) -> Result<SearchR, SearchError> {
        let q = req.q.trim();
        if q.is_empty() {
            return Err(SearchError::InvalidParameter("q 不能为空".into()));
        }
        let size = req.size.unwrap_or(10).clamp(1, 100);

        let body = es
            .search(q, size)
            .await
            .map_err(|e| SearchError::EsError(e.to_string()))?;

        let took = body.get("took").and_then(|v| v.as_i64()).unwrap_or(0);
        let total = body
            .pointer("/hits/total/value")
            .and_then(|v| v.as_i64())
            .or_else(|| body.pointer("/hits/total").and_then(|v| v.as_i64()))
            .unwrap_or(0);

        let hits = body
            .pointer("/hits/hits")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|hit| {
                        let id = hit.get("_id")?.as_str()?.to_string();
                        let score = hit.get("_score").and_then(|v| v.as_f64());
                        let source = hit.get("_source")?;
                        let title = source
                            .get("title")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        let content = source
                            .get("content")
                            .and_then(|v| v.as_str())
                            .unwrap_or("")
                            .to_string();
                        Some(HitR {
                            id,
                            score,
                            title,
                            content,
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        Ok(SearchR { took, total, hits })
    }
}
