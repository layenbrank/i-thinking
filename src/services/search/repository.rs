//! Search 领域的 Elasticsearch 索引/检索（不放在 clients 层）

use anyhow::{Context, Result, bail};
use elasticsearch::{
    IndexParts, SearchParts,
    indices::{IndicesCreateParts, IndicesExistsParts},
};
use serde_json::{Value, json};

use crate::clients::elasticsearch::EsClient;

pub async fn ensure_index(es: &EsClient) -> Result<()> {
    let index = es.index();
    let exists = es
        .client()
        .indices()
        .exists(IndicesExistsParts::Index(&[index]))
        .send()
        .await
        .context("elasticsearch index exists failed")?;

    if exists.status_code().is_success() {
        return Ok(());
    }

    let response = es
        .client()
        .indices()
        .create(IndicesCreateParts::Index(index))
        .body(json!({
            "mappings": {
                "properties": {
                    "title": { "type": "text" },
                    "content": { "type": "text" },
                    "createdAt": { "type": "date" }
                }
            }
        }))
        .send()
        .await
        .context("elasticsearch create index failed")?;

    if !response.status_code().is_success() && response.status_code().as_u16() != 400 {
        let status = response.status_code().as_u16();
        let body = response.text().await.unwrap_or_default();
        bail!("elasticsearch create index status {status}: {body}");
    }
    Ok(())
}

pub async fn index_doc(es: &EsClient, id: &str, title: &str, content: &str) -> Result<()> {
    let response = es
        .client()
        .index(IndexParts::IndexId(es.index(), id))
        .body(json!({
            "title": title,
            "content": content,
            "createdAt": chrono::Utc::now().to_rfc3339(),
        }))
        .refresh(elasticsearch::params::Refresh::True)
        .send()
        .await
        .context("elasticsearch index failed")?;

    if !response.status_code().is_success() {
        let status = response.status_code().as_u16();
        let body = response.text().await.unwrap_or_default();
        bail!("elasticsearch index status {status}: {body}");
    }
    Ok(())
}

pub async fn search(es: &EsClient, query: &str, size: i64) -> Result<Value> {
    let response = es
        .client()
        .search(SearchParts::Index(&[es.index()]))
        .body(json!({
            "size": size,
            "query": {
                "multi_match": {
                    "query": query,
                    "fields": ["title^2", "content"]
                }
            }
        }))
        .send()
        .await
        .context("elasticsearch search failed")?;

    if !response.status_code().is_success() {
        let status = response.status_code().as_u16();
        let body = response.text().await.unwrap_or_default();
        bail!("elasticsearch search status {status}: {body}");
    }

    response
        .json()
        .await
        .context("elasticsearch search json failed")
}
