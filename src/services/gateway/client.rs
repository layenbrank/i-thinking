//! 上游 OpenAI 兼容供应商的流式 HTTP 客户端。

use std::time::Duration;

use reqwest::Client;

use crate::configures::configure::Configure;

#[derive(Debug, thiserror::Error)]
pub enum UpstreamError {
    #[error("upstream request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("upstream status {status}: {detail}")]
    Status { status: u16, detail: String },
}

pub struct Upstream {
    http: Client,
}

impl Upstream {
    pub fn new(config: &Configure) -> Self {
        // 只设连接超时：流式响应可能长时间持续，不能用总超时掐断。
        let http = Client::builder()
            .connect_timeout(Duration::from_millis(config.gateway_upstream_timeout_ms()))
            .build()
            .expect("failed to build gateway http client");
        Self { http }
    }

    /// POST `{base_url}/chat/completions`（OpenAI 兼容），成功返回流式响应。
    pub async fn post_chat(
        &self,
        url: &str,
        api_key: Option<&str>,
        body: &serde_json::Value,
    ) -> Result<reqwest::Response, UpstreamError> {
        let mut req = self.http.post(url).json(body);
        if let Some(key) = api_key.filter(|k| !k.is_empty()) {
            req = req.header(reqwest::header::AUTHORIZATION, format!("Bearer {key}"));
        }
        let resp = req.send().await?;
        if !resp.status().is_success() {
            let status = resp.status().as_u16();
            let detail = resp.text().await.unwrap_or_default();
            return Err(UpstreamError::Status {
                status,
                detail: truncate(&detail, 500),
            });
        }
        Ok(resp)
    }
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}...", &s[..max])
    }
}
