use std::path::Path;

use image::ImageReader;
use serde_json::json;
use tauri::{AppHandle, Manager, State};

use crate::capture::schema::ScreenshotResult;
use crate::capture::state::CapturePending;
use crate::overlay::command::{overlay_update_mode, OVERLAY_LABEL};
use crate::utils::ipc;

/// 只读图片头获取宽高，避免整图 decode
fn build_screenshot_result(path: &str, scale_factor: f32) -> Result<ScreenshotResult, String> {
    let reader = ImageReader::open(Path::new(path))
        .map_err(|e| format!("[capture:screenshot] 打开截图失败 ({path}): {e}"))?
        .with_guessed_format()
        .map_err(|e| format!("[capture:screenshot] 识别截图格式失败 ({path}): {e}"))?;
    let (width, height) = reader
        .into_dimensions()
        .map_err(|e| format!("[capture:screenshot] 读取截图尺寸失败 ({path}): {e}"))?;
    Ok(ScreenshotResult {
        path: path.to_string(),
        width,
        height,
        scale_factor,
    })
}

fn screenshot_from_ipc_data(path: String, data: &serde_json::Value) -> Option<ScreenshotResult> {
    let width = data.get("width").and_then(|v| v.as_u64()).map(|v| v as u32)?;
    let height = data
        .get("height")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)?;
    Some(ScreenshotResult {
        path,
        width,
        height,
        scale_factor: 1.0,
    })
}

/// 经 corex IPC 截主屏并落盘 PNG（单路径；尺寸优先用 IPC data）
async fn grab_screenshot(app: &AppHandle) -> Result<ScreenshotResult, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("[capture:screenshot] 获取数据目录失败: {e}"))?
        .join("screenshots");
    std::fs::create_dir_all(&data_dir).map_err(|e| {
        format!(
            "[capture:screenshot] 创建截图目录失败 ({}): {e}",
            data_dir.display()
        )
    })?;
    let data_dir_str = data_dir.to_string_lossy().into_owned();
    let data_dir_for_err = data_dir_str.clone();

    let resp = tokio::task::spawn_blocking(move || {
        ipc::invoke_with("capture", Some("screenshot"), json!({ "to": data_dir_str }))
    })
    .await
    .map_err(|e| format!("[capture:screenshot] IPC 线程异常: {e}"))??;

    if !resp.ok {
        return Err(resp
            .error
            .unwrap_or_else(|| "[capture:screenshot] 截图失败".to_string()));
    }
    let path = resp.path.ok_or_else(|| {
        format!("[capture:screenshot] 截图成功但未返回 path（目录: {data_dir_for_err}）")
    })?;

    if let Some(data) = resp.data.as_ref() {
        if let Some(result) = screenshot_from_ipc_data(path.clone(), data) {
            return Ok(result);
        }
    }

    tokio::task::spawn_blocking(move || build_screenshot_result(&path, 1.0))
        .await
        .map_err(|e| format!("[capture:screenshot] 截图处理线程异常: {e}"))?
}

/// 隐藏 overlay 以免截进浮层；返回隐藏前是否可见（供失败时恢复）
async fn hide_overlay_for_capture(app: &AppHandle) -> bool {
    let Some(window) = app.get_webview_window(OVERLAY_LABEL) else {
        return false;
    };
    let was_visible = window.is_visible().unwrap_or(false);
    let _ = window.hide();
    if was_visible {
        tokio::time::sleep(std::time::Duration::from_millis(60)).await;
    }
    was_visible
}

fn show_overlay(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = window.show();
        let _ = window.set_always_on_top(true);
    }
}

/// 截取主显示器（corex PNG），返回路径与尺寸
#[tauri::command(rename = "capture:screenshot")]
pub async fn capture_screenshot(app: AppHandle) -> Result<ScreenshotResult, String> {
    let _was_visible = hide_overlay_for_capture(&app).await;
    let result = grab_screenshot(&app).await;
    show_overlay(&app);
    result
}

/// 先截图再进入 screenshot 模式，避免空层等待
#[tauri::command(rename = "capture:open")]
pub async fn capture_open(
    app: AppHandle,
    pending: State<'_, CapturePending>,
) -> Result<(), String> {
    let was_visible = hide_overlay_for_capture(&app).await;
    let result = match grab_screenshot(&app).await {
        Ok(result) => result,
        Err(err) => {
            if was_visible {
                show_overlay(&app);
            }
            return Err(err);
        }
    };
    {
        let mut guard = pending.screenshot.lock().await;
        *guard = Some(result);
    }
    overlay_update_mode(app, "screenshot".into()).await
}

/// 消费 capture:open 预截结果（一次性 take）
#[tauri::command(rename = "capture:take-pending")]
pub async fn capture_take_pending(
    pending: State<'_, CapturePending>,
) -> Result<Option<ScreenshotResult>, String> {
    let mut guard = pending.screenshot.lock().await;
    Ok(guard.take())
}

/// 退出 screenshot：清空 pending 并回 idle
#[tauri::command(rename = "capture:close")]
pub async fn capture_close(
    app: AppHandle,
    pending: State<'_, CapturePending>,
) -> Result<(), String> {
    {
        let mut guard = pending.screenshot.lock().await;
        *guard = None;
    }
    overlay_update_mode(app, "idle".into()).await
}
