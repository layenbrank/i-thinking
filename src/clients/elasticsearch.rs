use crate::configures::configure::Configure;
use anyhow::{Context, Result, bail};
use elasticsearch::{
    Elasticsearch,
    auth::Credentials,
    cert::CertificateValidation,
    cluster::ClusterHealthParts,
    http::transport::{SingleNodeConnectionPool, Transport, TransportBuilder},
    indices::{IndicesCreateParts, IndicesExistsParts},
    IndexParts, SearchParts,
};
use serde_json::{Value, json};
use url::Url;

/// Elasticsearch 官方客户端封装。
#[derive(Clone)]
pub struct EsClient {
    client: Elasticsearch,
    index: String,
}

impl EsClient {
    pub async fn new(config: &Configure) -> Result<Self> {
        let transport = build_transport(config)?;
        let client = Elasticsearch::new(transport);
        let es = Self {
            client,
            index: config.elasticsearch_index.clone(),
        };
        es.ping().await?;
        es.ensure_index().await?;
        Ok(es)
    }

    pub fn client(&self) -> &Elasticsearch {
        &self.client
    }

    pub fn index(&self) -> &str {
        &self.index
    }

    pub async fn ping(&self) -> Result<()> {
        let response = self
            .client
            .ping()
            .send()
            .await
            .context("elasticsearch ping failed")?;
        if !response.status_code().is_success() {
            bail!(
                "elasticsearch ping status {}",
                response.status_code().as_u16()
            );
        }
        Ok(())
    }

    pub async fn cluster_health(&self) -> Result<String> {
        let response = self
            .client
            .cluster()
            .health(ClusterHealthParts::None)
            .send()
            .await
            .context("elasticsearch cluster health failed")?;
        let body: Value = response
            .json()
            .await
            .context("elasticsearch health json failed")?;
        Ok(body
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string())
    }

    async fn ensure_index(&self) -> Result<()> {
        let exists = self
            .client
            .indices()
            .exists(IndicesExistsParts::Index(&[&self.index]))
            .send()
            .await
            .context("elasticsearch index exists failed")?;

        if exists.status_code().is_success() {
            return Ok(());
        }

        let response = self
            .client
            .indices()
            .create(IndicesCreateParts::Index(&self.index))
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

    pub async fn index_doc(&self, id: &str, title: &str, content: &str) -> Result<()> {
        let response = self
            .client
            .index(IndexParts::IndexId(&self.index, id))
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

    pub async fn search(&self, query: &str, size: i64) -> Result<Value> {
        let response = self
            .client
            .search(SearchParts::Index(&[&self.index]))
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
}

fn build_transport(config: &Configure) -> Result<Transport> {
    if let Some(cloud_id) = config.elasticsearch_cloud_id.as_deref() {
        let credentials = resolve_credentials(config)?
            .context("ELASTICSEARCH_CLOUD_ID requires credentials")?;
        return Transport::cloud(cloud_id, credentials)
            .context("elasticsearch cloud transport failed");
    }

    let url = Url::parse(&config.elasticsearch_url).context("invalid ELASTICSEARCH_URL")?;
    let pool = SingleNodeConnectionPool::new(url);
    let mut builder = TransportBuilder::new(pool);

    if let Some(credentials) = resolve_credentials(config)? {
        builder = builder.auth(credentials);
    }

    if config.elasticsearch_insecure {
        builder = builder.cert_validation(CertificateValidation::None);
    }

    builder.build().context("elasticsearch transport build failed")
}

fn resolve_credentials(config: &Configure) -> Result<Option<Credentials>> {
    if let Some(api_key) = config.elasticsearch_api_key.as_deref() {
        if let Some((id, key)) = api_key.split_once(':') {
            return Ok(Some(Credentials::ApiKey(id.into(), key.into())));
        }
        return Ok(Some(Credentials::EncodedApiKey(api_key.into())));
    }

    match (
        config.elasticsearch_username.as_deref(),
        config.elasticsearch_password.as_deref(),
    ) {
        (Some(user), Some(pass)) => Ok(Some(Credentials::Basic(user.into(), pass.into()))),
        (None, None) => Ok(None),
        _ => bail!("ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD must both be set"),
    }
}
