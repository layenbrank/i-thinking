use anyhow::{Context, Result, bail};
use elasticsearch::{
    Elasticsearch,
    auth::Credentials,
    cert::CertificateValidation,
    cluster::ClusterHealthParts,
    http::transport::{SingleNodeConnectionPool, Transport, TransportBuilder},
};
use serde_json::Value;
use url::Url;

use crate::configures::configure::Configure;

/// Elasticsearch 官方客户端封装（连接 / 健康；领域查询见 `search::repository`）。
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
            index: config.elasticsearch_index().to_string(),
        };
        es.ping().await?;
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
}

fn build_transport(config: &Configure) -> Result<Transport> {
    if let Some(cloud_id) = config.elasticsearch_cloud_id() {
        let credentials =
            resolve_credentials(config)?.context("ELASTICSEARCH_CLOUD_ID requires credentials")?;
        return Transport::cloud(cloud_id, credentials)
            .context("elasticsearch cloud transport failed");
    }

    let url = Url::parse(config.elasticsearch_url()).context("invalid elasticsearch.url")?;
    let pool = SingleNodeConnectionPool::new(url);
    let mut builder = TransportBuilder::new(pool);

    if let Some(credentials) = resolve_credentials(config)? {
        builder = builder.auth(credentials);
    }

    if config.elasticsearch_insecure() {
        builder = builder.cert_validation(CertificateValidation::None);
    }

    builder
        .build()
        .context("elasticsearch transport build failed")
}

fn resolve_credentials(config: &Configure) -> Result<Option<Credentials>> {
    if let Some(api_key) = config.elasticsearch_api_key() {
        if let Some((id, key)) = api_key.split_once(':') {
            return Ok(Some(Credentials::ApiKey(id.into(), key.into())));
        }
        return Ok(Some(Credentials::EncodedApiKey(api_key.into())));
    }

    match (config.elasticsearch_username(), config.elasticsearch_password()) {
        (Some(user), Some(pass)) => Ok(Some(Credentials::Basic(user.into(), pass.into()))),
        (None, None) => Ok(None),
        _ => bail!("ELASTICSEARCH_USERNAME and ELASTICSEARCH_PASSWORD must both be set"),
    }
}
