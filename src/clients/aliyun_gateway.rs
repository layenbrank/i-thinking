//! aliyun-gateway HTTP 客户端（短信等阿里云能力代理）。

use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

use crate::configures::configure::Configure;

const SMS_SEND_PATH: &str = "/api/v1/sms/send";

#[derive(Debug, thiserror::Error)]
pub enum AliyunGatewayError {
    #[error("SMS rate limited")]
    RateLimited,
    #[error("Aliyun gateway timeout")]
    Timeout,
    #[error("Aliyun gateway upstream error: {0}")]
    Upstream(String),
}

#[derive(Clone)]
pub struct AliyunGatewayClient {
    http: Client,
    base_url: String,
    api_key: String,
    default_template_code: String,
}

impl AliyunGatewayClient {
    pub fn new(config: &Configure) -> Result<Self> {
        let timeout = Duration::from_millis(config.aliyun_gateway_timeout_ms());
        let http = Client::builder()
            .timeout(timeout)
            .build()
            .context("failed to build aliyun-gateway http client")?;

        Ok(Self {
            http,
            base_url: trim_trailing_slash(config.aliyun_gateway_base_url()),
            api_key: config.aliyun_gateway_api_key().to_string(),
            default_template_code: config.aliyun_sms_template_code().to_string(),
        })
    }

    pub async fn send_sms(
        &self,
        phone: &str,
        code: &str,
        template_code: Option<&str>,
    ) -> Result<(), AliyunGatewayError> {
        let url = format!("{}{}", self.base_url, SMS_SEND_PATH);
        let template = template_code
            .filter(|s| !s.is_empty())
            .unwrap_or(self.default_template_code.as_str());

        let mut template_param = HashMap::new();
        template_param.insert("code".to_string(), code.to_string());

        let payload = SendSmsRequest {
            phone: phone.to_string(),
            template_code: template.to_string(),
            template_param,
        };

        let response = self
            .http
            .post(&url)
            .header("X-API-Key", &self.api_key)
            .json(&payload)
            .send()
            .await
            .map_err(map_reqwest_error)?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|e| AliyunGatewayError::Upstream(e.to_string()))?;

        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            return Err(AliyunGatewayError::RateLimited);
        }

        if !status.is_success() {
            return Err(AliyunGatewayError::Upstream(format!(
                "send-sms status {}: {}",
                status.as_u16(),
                truncate(&body, 256)
            )));
        }

        let parsed: GatewayResponse = serde_json::from_str(&body).map_err(|e| {
            AliyunGatewayError::Upstream(format!(
                "send-sms json: {e}; body={}",
                truncate(&body, 256)
            ))
        })?;

        if parsed.code != 0 {
            if parsed.code == 429 {
                return Err(AliyunGatewayError::RateLimited);
            }
            return Err(AliyunGatewayError::Upstream(format!(
                "send-sms code {}: {}",
                parsed.code,
                parsed.message.unwrap_or_default()
            )));
        }

        Ok(())
    }
}

#[derive(Debug, Serialize)]
struct SendSmsRequest {
    phone: String,
    template_code: String,
    template_param: HashMap<String, String>,
}

#[derive(Debug, Deserialize)]
struct GatewayResponse {
    code: i32,
    message: Option<String>,
}

fn map_reqwest_error(err: reqwest::Error) -> AliyunGatewayError {
    if err.is_timeout() {
        AliyunGatewayError::Timeout
    } else {
        AliyunGatewayError::Upstream(err.to_string())
    }
}

fn trim_trailing_slash(url: &str) -> String {
    url.trim_end_matches('/').to_string()
}

fn truncate(value: &str, max: usize) -> String {
    if value.len() <= max {
        value.to_string()
    } else {
        format!("{}...", value[..max].to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_success_response() {
        let json = r#"{"code":0,"message":"ok","data":{"biz_id":"123"}}"#;
        let parsed: GatewayResponse = serde_json::from_str(json).expect("parse");
        assert_eq!(parsed.code, 0);
    }
}
