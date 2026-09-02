//! 指纹 pinning 的 ACP WebSocket 传输桥（供前端 Stream 适配）。

use std::collections::HashMap;

use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::Message;
use uuid::Uuid;

use crate::utils::goose_tls;

struct AcpSocket {
    tx: mpsc::UnboundedSender<String>,
}

pub struct GooseAcpHub {
    sockets: Mutex<HashMap<String, AcpSocket>>,
}

impl Default for GooseAcpHub {
    fn default() -> Self {
        Self::new()
    }
}

impl GooseAcpHub {
    pub fn new() -> Self {
        Self {
            sockets: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AcpMessageEvent {
    id: String,
    data: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AcpIdEvent {
    id: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AcpErrorEvent {
    id: String,
    message: String,
}

pub async fn open_connection(
    app: AppHandle,
    hub: &GooseAcpHub,
    url: String,
    fingerprint: String,
) -> Result<String, String> {
    assert_loopback_acp_url(&url)?;
    let connector = goose_tls::tungstenite_connector(&fingerprint)?;
    let (ws, _) = tokio_tungstenite::connect_async_tls_with_config(
        url.as_str(),
        None,
        false,
        Some(connector),
    )
    .await
    .map_err(|e| format!("ACP WSS 连接失败: {e}"))?;

    let (mut sink, mut stream) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let id = Uuid::new_v4().to_string();

    {
        let mut sockets = hub.sockets.lock().await;
        sockets.insert(id.clone(), AcpSocket { tx });
    }

    let writer_id = id.clone();
    let writer_app = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(text) = rx.recv().await {
            if let Err(error) = sink.send(Message::Text(text.into())).await {
                let _ = writer_app.emit(
                    "goose://acp-error",
                    AcpErrorEvent {
                        id: writer_id.clone(),
                        message: error.to_string(),
                    },
                );
                break;
            }
        }
        let _ = sink.close().await;
    });

    let reader_id = id.clone();
    let reader_app = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(frame) = stream.next().await {
            match frame {
                Ok(Message::Text(text)) => {
                    let _ = reader_app.emit(
                        "goose://acp-message",
                        AcpMessageEvent {
                            id: reader_id.clone(),
                            data: text.to_string(),
                        },
                    );
                }
                Ok(Message::Binary(bytes)) => {
                    let data = String::from_utf8_lossy(&bytes).to_string();
                    let _ = reader_app.emit(
                        "goose://acp-message",
                        AcpMessageEvent {
                            id: reader_id.clone(),
                            data,
                        },
                    );
                }
                Ok(Message::Close(_)) | Err(_) => break,
                Ok(_) => {}
            }
        }
        let _ = reader_app.emit("goose://acp-close", AcpIdEvent { id: reader_id });
    });

    Ok(id)
}

/// 仅允许本机 loopback ACP URL，防止渲染进程任意外连。
fn assert_loopback_acp_url(url: &str) -> Result<(), String> {
    let lower = url.to_ascii_lowercase();
    if !(lower.starts_with("wss://") || lower.starts_with("ws://")) {
        return Err("ACP URL 仅支持 ws/wss".into());
    }
    let rest = url
        .split_once("://")
        .map(|(_, host_path)| host_path)
        .unwrap_or("");
    let host_port = rest.split('/').next().unwrap_or("");
    let host = host_port
        .rsplit_once('@')
        .map(|(_, h)| h)
        .unwrap_or(host_port);
    let host = if host.starts_with('[') {
        host.trim_start_matches('[')
            .split(']')
            .next()
            .unwrap_or(host)
    } else {
        host.split(':').next().unwrap_or(host)
    };
    if host != "127.0.0.1" && !host.eq_ignore_ascii_case("localhost") && host != "::1" {
        return Err(format!("ACP URL 仅允许本机地址，收到: {host}"));
    }
    Ok(())
}

pub async fn send_message(hub: &GooseAcpHub, id: String, data: String) -> Result<(), String> {
    let sockets = hub.sockets.lock().await;
    let socket = sockets
        .get(&id)
        .ok_or_else(|| format!("ACP 连接不存在: {id}"))?;
    socket
        .tx
        .send(data)
        .map_err(|_| format!("ACP 连接已关闭: {id}"))
}

pub async fn close_connection(hub: &GooseAcpHub, id: String) -> Result<(), String> {
    let mut sockets = hub.sockets.lock().await;
    sockets.remove(&id);
    Ok(())
}

#[tauri::command(rename = "goose:acp-open")]
pub async fn goose_acp_open(
    app: AppHandle,
    hub: State<'_, GooseAcpHub>,
    url: String,
    fingerprint: String,
) -> Result<String, String> {
    open_connection(app, hub.inner(), url, fingerprint).await
}

#[tauri::command(rename = "goose:acp-send")]
pub async fn goose_acp_send(
    hub: State<'_, GooseAcpHub>,
    id: String,
    data: String,
) -> Result<(), String> {
    send_message(hub.inner(), id, data).await
}

#[tauri::command(rename = "goose:acp-close")]
pub async fn goose_acp_close(hub: State<'_, GooseAcpHub>, id: String) -> Result<(), String> {
    close_connection(hub.inner(), id).await
}
