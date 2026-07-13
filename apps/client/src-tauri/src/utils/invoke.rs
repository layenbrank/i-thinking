use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{ipc, utils::corex::CorexState};

const ALLOWED_MODULES: &[&str] = &["morph", "screenshot", "scan"];

#[derive(Debug, Deserialize, Serialize)]
pub struct Memory {
    total: u64,
    used: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Swap {
    total: u64,
    used: u64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Cpu {
    brand: String,
    frequency: u64,
    cores: usize,
    arch: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct OsContext {
    #[serde(rename = "OS")]
    pub os: String,
    pub version: String,
    pub kernel: String,
    pub hostname: String,
    #[serde(rename = "CPU")]
    pub cpu: Cpu,
    pub memory: Memory,
    pub swap: Swap,
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn os() -> Result<OsContext, String> {
    let resp = ipc::invoke("scan", json!({ "Os": {} }))?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_else(|| "scan Os 失败".to_string()));
    }
    let data = resp.data.ok_or_else(|| "scan 未返回 data".to_string())?;
    serde_json::from_value(data).map_err(|e| format!("解析 OsContext 失败: {e}"))
}

#[tauri::command]
pub fn ipc_ready(state: tauri::State<'_, CorexState>) -> bool {
    state.is_ready()
}

#[tauri::command]
pub async fn ipc_invoke(module: String, args: serde_json::Value) -> Result<ipc::IpcResponse, String> {
    if !ALLOWED_MODULES.contains(&module.as_str()) {
        return Err(format!("IPC 模块不允许: {module}"));
    }
    tokio::task::spawn_blocking(move || ipc::invoke(&module, args))
        .await
        .map_err(|e| format!("IPC 线程异常: {e}"))?
}

/// 从前端控制托盘图标徽章状态
#[tauri::command]
pub fn set_tray_badge(app: tauri::AppHandle, has_badge: bool) {
    crate::ui::tray::set_badge(&app, has_badge);
}
