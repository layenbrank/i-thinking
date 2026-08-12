use std::path::Path;

use image::ImageReader;
use serde_json::json;
use tauri::{AppHandle, Manager};

use crate::utils::ipc;
use crate::overlay::command::{overlay_ensure, overlay_update_mode};
use crate::screenshot::schema::CaptureResult;

fn build_capture_result(path: &str, scale_factor: f32) -> Result<CaptureResult, String> {
    let img = ImageReader::open(Path::new(path))
        .map_err(|e| format!("读取截图失败: {e}"))?
        .decode()
        .map_err(|e| format!("解码截图失败: {e}"))?;
    Ok(CaptureResult {
        path: path.to_string(),
        width: img.width(),
        height: img.height(),
        scale_factor,
    })
}

/// 截取主显示器，经 corex-serve IPC 捕获后返回截图文件路径
#[tauri::command(rename = "screenshot:capture")]
pub async fn screenshot_capture(app: AppHandle) -> Result<CaptureResult, String> {
    // Avoid capturing the overlay surface itself while grabbing the desktop.
    let overlay = app.get_webview_window("overlay");
    if let Some(ref window) = overlay {
        let _ = window.hide();
        tokio::time::sleep(std::time::Duration::from_millis(60)).await;
    }

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("screenshots");
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let data_dir_str = data_dir.to_string_lossy().into_owned();

    let resp = tokio::task::spawn_blocking(move || {
        ipc::invoke(
            "screenshot",
            json!({ "Capture": { "to": data_dir_str } }),
        )
    })
    .await
    .map_err(|e| format!("截图线程异常: {e}"))??;

    if let Some(window) = overlay {
        let _ = window.show();
        let _ = window.set_always_on_top(true);
    }

    if !resp.ok {
        return Err(resp.error.unwrap_or_else(|| "screenshot 失败".to_string()));
    }
    let path = resp
        .path
        .ok_or_else(|| "screenshot 成功但未返回 path".to_string())?;

    tokio::task::spawn_blocking(move || build_capture_result(&path, 1.0))
        .await
        .map_err(|e| format!("截图处理线程异常: {e}"))?
}

/// 进入 overlay 的 capture 模式（单窗口，不再单独创建 screenshot WebView）
#[tauri::command(rename = "screenshot:open")]
pub async fn screenshot_open(app: AppHandle) -> Result<(), String> {
    // Tear down legacy screenshot window if any previous session created one.
    if let Some(window) = app.get_webview_window("screenshot") {
        let _ = window.close();
    }
    overlay_ensure(app.clone()).await?;
    overlay_update_mode(app, "capture".into()).await
}

/// 退出 capture：回到 idle（由前端决定是否 hide 空层）
#[tauri::command(rename = "screenshot:close")]
pub async fn screenshot_close(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screenshot") {
        let _ = window.close();
    }
    overlay_update_mode(app, "idle".into()).await
}
