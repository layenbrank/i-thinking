//! ai-worker（Python 计算车间）内部调用客户端。
//!
//! 契约在 `spec/internal.yaml`：路径模板与它一字不差（`bun run arch` 的 R11 会比对），
//! 想加路径先去改契约。这个客户端是 core 唯一允许出站调 `/internal/**` 的地方。
//!
//! 调用约定（与契约一致）：
//! - `X-Internal-Token`：共享令牌，来自 `ai_worker.token`；
//! - `Idempotency-Key`：由编排实例 id + 步骤派生，重试不会产生重复副作用；
//! - `traceparent`：由上游链路 + 步骤**确定性**派生，重放时下游看到同一条链路
//!   （P7 接入 OTel 后换成真实上下文）。
//!
//! 错误分类（`is_retryable`）决定编排是重试还是直接判失败，分类必须在这里定：
//! 429 与 5xx/超时/传输失败可重试，其它 4xx 是「请求本身有问题」，重试只会重复失败。

use anyhow::{Context, Result};
use reqwest::{Client, StatusCode};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::Duration;

use crate::configures::configure::Configure;
use crate::middlewares::trace::TraceContext;

/// 契约路径模板（占位符具名，与 `spec/internal.yaml` 完全一致）
pub const HEALTH_PATH: &str = "/internal/v1/health";
/// 抽取文本并分块（返回块数与块集 id，不回传正文）
pub const CHUNK_OBJECT_PATH: &str = "/internal/v1/assets/{assetID}/chunks";
/// 为一组块算嵌入
pub const EMBED_RANGE_PATH: &str = "/internal/v1/assets/{assetID}/embeddings";
/// 把块集落进检索索引
pub const UPSERT_INDEX_PATH: &str = "/internal/v1/assets/{assetID}/index";

/// 内部契约版本（`schemaVersion`）。契约不兼容变更时才 +1。
pub const INTERNAL_SCHEMA_VERSION: i32 = 1;

const TOKEN_HEADER: &str = "X-Internal-Token";
const IDEMPOTENCY_HEADER: &str = "Idempotency-Key";
const TRACEPARENT_HEADER: &str = "traceparent";

#[derive(Debug, thiserror::Error)]
pub enum AiWorkerError {
    /// 4xx（429 除外）：载荷/令牌有问题，重试没有意义。
    #[error("ai-worker 拒绝请求（{status}）: {body}")]
    Rejected { status: u16, body: String },
    /// 429：限流，退避后可重试。
    #[error("ai-worker 限流")]
    RateLimited,
    /// 5xx / 其它非 2xx：下游暂不可用，可重试。
    #[error("ai-worker 不可用（{status}）: {body}")]
    Unavailable { status: u16, body: String },
    #[error("ai-worker 调用超时")]
    Timeout,
    #[error("ai-worker 传输失败: {0}")]
    Transport(String),
    #[error("ai-worker 响应无法解析: {0}")]
    Decode(String),
}

impl AiWorkerError {
    /// 是否值得重试。编排据此决定「退避后重来」还是「立刻判失败」。
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            Self::RateLimited | Self::Unavailable { .. } | Self::Timeout | Self::Transport(_)
        )
    }
}

/// 一次内部调用的元信息：幂等键与上游链路。
#[derive(Debug, Clone)]
pub struct CallMeta {
    /// 幂等键，惯例 `<编排实例 id>:<步骤>`。
    pub idempotency_key: String,
    /// 上游 `traceparent`（编排输入带进来的那条）；缺省时按幂等键派生根链路。
    pub traceparent: Option<String>,
}

impl CallMeta {
    pub fn new(idempotency_key: impl Into<String>, traceparent: Option<String>) -> Self {
        Self {
            idempotency_key: idempotency_key.into(),
            traceparent,
        }
    }
}

#[derive(Clone)]
pub struct AiWorkerClient {
    http: Client,
    base_url: String,
    token: String,
}

impl AiWorkerClient {
    pub fn new(config: &Configure) -> Result<Self> {
        Self::from_parts(
            &config.ai_worker.base_url,
            &config.ai_worker.token,
            config.ai_worker.timeout_ms,
            config.ai_worker.use_system_proxy,
        )
    }

    pub fn from_parts(
        base_url: &str,
        token: &str,
        timeout_ms: u64,
        use_system_proxy: bool,
    ) -> Result<Self> {
        if base_url.trim().is_empty() {
            anyhow::bail!("ai_worker.base_url 不能为空");
        }

        let mut builder = Client::builder().timeout(Duration::from_millis(timeout_ms.max(1)));
        if !use_system_proxy {
            // 内部端点按内网直连处理：禁用代理，否则请求会被本机系统代理
            // （如 127.0.0.1:7892）拦截并回 502。仅作用于本客户端。
            builder = builder.no_proxy();
        }

        Ok(Self {
            http: builder
                .build()
                .context("failed to build ai-worker http client")?,
            base_url: trim_trailing_slash(base_url),
            token: token.to_string(),
        })
    }

    /// 健康与能力自述（core 的 readiness 用，P7 接）。
    pub async fn health(&self) -> Result<HealthResponse, AiWorkerError> {
        let response = self
            .http
            .get(format!("{}{}", self.base_url, HEALTH_PATH))
            .send()
            .await
            .map_err(map_reqwest_error)?;

        read_json(response).await
    }

    /// 抽取文本并分块（长任务的第一步）。
    pub async fn chunk_object(
        &self,
        asset_id: &str,
        request: &ChunkRequest,
        meta: &CallMeta,
    ) -> Result<ChunkResponse, AiWorkerError> {
        self.post_json(CHUNK_OBJECT_PATH, "{assetID}", asset_id, request, meta)
            .await
    }

    /// 为一组块算嵌入（长任务的中间步，可分批）。
    pub async fn embed_range(
        &self,
        asset_id: &str,
        request: &EmbedRequest,
        meta: &CallMeta,
    ) -> Result<EmbedResponse, AiWorkerError> {
        self.post_json(EMBED_RANGE_PATH, "{assetID}", asset_id, request, meta)
            .await
    }

    /// 把块集落进检索索引（长任务的最后一步）。
    pub async fn upsert_index(
        &self,
        asset_id: &str,
        request: &IndexRequest,
        meta: &CallMeta,
    ) -> Result<IndexResponse, AiWorkerError> {
        let url = self.url(UPSERT_INDEX_PATH, "{assetID}", asset_id);
        let response = self
            .headers(self.http.put(url), meta)
            .json(request)
            .send()
            .await
            .map_err(map_reqwest_error)?;

        read_json(response).await
    }

    async fn post_json<Req, Res>(
        &self,
        template: &str,
        placeholder: &str,
        asset_id: &str,
        request: &Req,
        meta: &CallMeta,
    ) -> Result<Res, AiWorkerError>
    where
        Req: Serialize + ?Sized,
        Res: for<'de> Deserialize<'de>,
    {
        let url = self.url(template, placeholder, asset_id);
        let response = self
            .headers(self.http.post(url), meta)
            .json(request)
            .send()
            .await
            .map_err(map_reqwest_error)?;

        read_json(response).await
    }

    fn url(&self, template: &str, placeholder: &str, asset_id: &str) -> String {
        format!(
            "{}{}",
            self.base_url,
            fill_path(template, placeholder, asset_id)
        )
    }

    /// 三个头是所有内部调用共有的：令牌、幂等键、链路。
    fn headers(
        &self,
        request: reqwest::RequestBuilder,
        meta: &CallMeta,
    ) -> reqwest::RequestBuilder {
        request
            .header(TOKEN_HEADER, &self.token)
            .header(IDEMPOTENCY_HEADER, &meta.idempotency_key)
            .header(
                TRACEPARENT_HEADER,
                step_traceparent(meta.traceparent.as_deref(), &meta.idempotency_key),
            )
    }
}

/// 把契约里的具名占位符换成实际值。
fn fill_path(template: &str, placeholder: &str, value: &str) -> String {
    template.replace(placeholder, value)
}

/// 本步的 `traceparent`：沿用上游 trace-id（缺省则按幂等键派生一条根链路），
/// span-id 由幂等键确定性派生 —— 编排重放同一个步骤时下游看到同一对 id，
/// 日志不会因为重跑而分裂成两条链路。
fn step_traceparent(parent: Option<&str>, idempotency_key: &str) -> String {
    let trace_id = parent
        .and_then(TraceContext::parse)
        .map(|ctx| ctx.trace_id)
        .unwrap_or_else(|| hex(&format!("trace:{idempotency_key}"), 32));

    format!(
        "00-{trace_id}-{}-01",
        hex(&format!("span:{idempotency_key}"), 16)
    )
}

/// sha256 前 `len` 个十六进制字符。
fn hex(seed: &str, len: usize) -> String {
    let digest = Sha256::digest(seed.as_bytes());
    let mut out = String::with_capacity(64);
    for byte in digest {
        out.push_str(&format!("{byte:02x}"));
    }
    out.truncate(len);
    out
}

async fn read_json<Res>(response: reqwest::Response) -> Result<Res, AiWorkerError>
where
    Res: for<'de> Deserialize<'de>,
{
    let status = response.status();
    let body = response
        .text()
        .await
        .map_err(|e| AiWorkerError::Transport(e.to_string()))?;

    if !status.is_success() {
        return Err(classify_status(status, &body));
    }

    serde_json::from_str(&body)
        .map_err(|e| AiWorkerError::Decode(format!("{e}; body={}", truncate(&body, 256))))
}

fn classify_status(status: StatusCode, body: &str) -> AiWorkerError {
    if status == StatusCode::TOO_MANY_REQUESTS {
        return AiWorkerError::RateLimited;
    }
    let body = truncate(body, 256);
    if status.is_server_error() {
        AiWorkerError::Unavailable {
            status: status.as_u16(),
            body,
        }
    } else if status.is_client_error() {
        AiWorkerError::Rejected {
            status: status.as_u16(),
            body,
        }
    } else {
        // 3xx/1xx 不该出现在这条路径上（重定向已由 http 客户端跟随），
        // 归到「暂时不可用」比归到「请求有错」更安全。
        AiWorkerError::Unavailable {
            status: status.as_u16(),
            body,
        }
    }
}

fn map_reqwest_error(err: reqwest::Error) -> AiWorkerError {
    if err.is_timeout() {
        AiWorkerError::Timeout
    } else {
        AiWorkerError::Transport(err.to_string())
    }
}

fn trim_trailing_slash(url: &str) -> String {
    url.trim_end_matches('/').to_string()
}

fn truncate(value: &str, max: usize) -> String {
    if value.len() <= max {
        return value.to_string();
    }
    // 错误体是下游返回的任意文本：按字符边界裁，别切坏多字节字符。
    let end = (0..=max)
        .rev()
        .find(|index| value.is_char_boundary(*index))
        .unwrap_or(0);

    format!("{}...", &value[..end])
}

/// 分块请求：只说「租户 + 资产 + 类型」，**不带对象存储键**。
///
/// 正文由 ai-worker 自己回打 core 的 `GET /api/v1/service/assets/{assetID}/content`
/// （先换 `scope=asset-read` 的服务身份令牌）取，CAS 布局不外泄给叶子服务。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkRequest {
    pub schema_version: i32,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    pub mime: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chunk_size: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chunk_overlap: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChunkResponse {
    #[serde(rename = "chunkSetID")]
    pub chunk_set_id: String,
    pub chunk_count: i32,
    #[serde(default)]
    pub text_sha: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbedRequest {
    pub schema_version: i32,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    #[serde(rename = "chunkSetID")]
    pub chunk_set_id: String,
    pub model: String,
    pub from: i32,
    pub to: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbedResponse {
    pub from: i32,
    pub to: i32,
    pub embedded: i32,
    pub dimensions: i32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexRequest {
    pub schema_version: i32,
    #[serde(rename = "tenantID")]
    pub tenant_id: String,
    #[serde(rename = "chunkSetID")]
    pub chunk_set_id: String,
    pub chunk_count: i32,
    pub model: String,
    pub dimensions: i32,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexResponse {
    pub indexed: i32,
    pub collection: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    #[serde(default)]
    pub capabilities: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn path_templates_use_named_placeholders() {
        assert_eq!(
            fill_path(CHUNK_OBJECT_PATH, "{assetID}", "a-1"),
            "/internal/v1/assets/a-1/chunks"
        );
        assert_eq!(
            fill_path(EMBED_RANGE_PATH, "{assetID}", "a-1"),
            "/internal/v1/assets/a-1/embeddings"
        );
        assert_eq!(
            fill_path(UPSERT_INDEX_PATH, "{assetID}", "a-1"),
            "/internal/v1/assets/a-1/index"
        );
    }

    #[test]
    fn step_traceparent_reuses_upstream_trace_and_is_deterministic() {
        let parent = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
        let first = step_traceparent(Some(parent), "instance-1:embed:0-16");
        let second = step_traceparent(Some(parent), "instance-1:embed:0-16");
        assert_eq!(first, second, "重放必须得到同一个 traceparent");
        assert!(first.starts_with("00-4bf92f3577b34da6a3ce929d0e0e4736-"));
        assert!(first.ends_with("-01"));

        let other = step_traceparent(Some(parent), "instance-1:embed:16-32");
        assert_ne!(first, other, "不同步骤要有各自的 span");

        let derived = step_traceparent(None, "instance-1:embed:0-16");
        assert_ne!(derived, first);
        assert!(TraceContext::parse(&derived).is_some(), "派生结果必须合法");
    }

    #[test]
    fn classifies_status_codes() {
        assert!(!classify_status(StatusCode::BAD_REQUEST, "bad").is_retryable());
        assert!(!classify_status(StatusCode::CONFLICT, "conflict").is_retryable());
        assert!(classify_status(StatusCode::TOO_MANY_REQUESTS, "").is_retryable());
        assert!(classify_status(StatusCode::SERVICE_UNAVAILABLE, "down").is_retryable());
        assert!(AiWorkerError::Timeout.is_retryable());
        assert!(!AiWorkerError::Decode("x".into()).is_retryable());
    }

    #[test]
    fn from_parts_trims_slash_and_rejects_empty_url() {
        let client = AiWorkerClient::from_parts("http://127.0.0.1:8081/", "t", 5_000, false)
            .expect("client");
        assert_eq!(client.base_url, "http://127.0.0.1:8081");
        assert_eq!(
            client.url(CHUNK_OBJECT_PATH, "{assetID}", "a-1"),
            "http://127.0.0.1:8081/internal/v1/assets/a-1/chunks"
        );

        assert!(AiWorkerClient::from_parts("  ", "t", 5_000, false).is_err());
    }

    #[test]
    fn parses_chunk_and_index_responses() {
        let chunk: ChunkResponse =
            serde_json::from_str(r#"{"chunkSetID":"cs-1","chunkCount":33,"textSha":"ab"}"#)
                .expect("parse chunk");
        assert_eq!(chunk.chunk_set_id, "cs-1");
        assert_eq!(chunk.chunk_count, 33);

        let index: IndexResponse =
            serde_json::from_str(r#"{"indexed":33,"collection":"rag_v1"}"#).expect("parse index");
        assert_eq!(index.indexed, 33);
        assert_eq!(index.collection, "rag_v1");
    }

    #[test]
    fn serializes_request_with_camel_case_fields() {
        let request = ChunkRequest {
            schema_version: INTERNAL_SCHEMA_VERSION,
            tenant_id: "t-1".into(),
            mime: "text/markdown".into(),
            name: None,
            chunk_size: None,
            chunk_overlap: None,
        };
        let json = serde_json::to_value(&request).expect("serialize");
        assert_eq!(json["schemaVersion"], serde_json::json!(1));
        assert_eq!(json["tenantID"], serde_json::json!("t-1"));
        assert_eq!(json["mime"], serde_json::json!("text/markdown"));
        assert!(json.get("name").is_none());
        assert!(
            json.get("objectKey").is_none(),
            "对象存储键是对外泄漏实现细节，读取走 core 的服务身份内容端点"
        );
    }
}
