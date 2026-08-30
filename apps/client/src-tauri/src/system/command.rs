use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::utils::ipc;
use crate::utils::sidecar::{self, SidecarState, SIDECAR_SHUTDOWN_TIMEOUT};

const ALLOWED_MODULES: &[&str] = &["morph", "capture", "scan", "engine", "file"];

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

#[tauri::command(rename = "system:greet")]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(rename = "system:os")]
pub fn os() -> Result<OsContext, String> {
    let resp = ipc::invoke("scan", json!({ "Os": {} }))?;
    if !resp.ok {
        return Err(resp.error.unwrap_or_else(|| "scan Os 失败".to_string()));
    }
    let data = resp.data.ok_or_else(|| "scan 未返回 data".to_string())?;
    serde_json::from_value(data).map_err(|e| format!("解析 OsContext 失败: {e}"))
}

/// `None` = 启动中；`Some(true/false)` = 已结束。以管道连通性为准。
#[tauri::command(rename = "ipc:ready")]
pub fn ipc_ready(state: tauri::State<'_, SidecarState>) -> Option<bool> {
    if state.probe() {
        return Some(true);
    }
    state.status()
}

#[tauri::command(rename = "ipc:invoke")]
pub async fn ipc_invoke(
    module: String,
    args: serde_json::Value,
    action: Option<String>,
) -> Result<ipc::IpcResponse, String> {
    if !ALLOWED_MODULES.contains(&module.as_str()) {
        return Err(format!("IPC 模块不允许: {module}"));
    }
    if let Some(ref act) = action {
        if act.contains('.') {
            return Err("IPC action 不得包含 '.'".into());
        }
    }
    tokio::task::spawn_blocking(move || {
        ipc::invoke_with(&module, action.as_deref(), args)
    })
    .await
    .map_err(|e| format!("IPC 线程异常: {e}"))?
}

/// 从前端控制托盘图标徽章状态
#[tauri::command(rename = "tray:update-badge")]
pub fn tray_set_badge(app: tauri::AppHandle, has_badge: bool) {
    crate::ui::tray::set_badge(&app, has_badge);
}

/// 停止 corex-daemon 并等待进程退出（更新安装前调用）。
///
/// 超时仍返回 `Ok`，由 NSIS PREINSTALL hook 兜底，避免卡死更新。
#[tauri::command(rename = "sidecar:shutdown")]
pub async fn sidecar_shutdown(app: tauri::AppHandle) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let _ = sidecar::shutdown_and_wait(&app, SIDECAR_SHUTDOWN_TIMEOUT);
    })
    .await
    .map_err(|e| format!("sidecar shutdown 线程异常: {e}"))?;
    Ok(())
}
