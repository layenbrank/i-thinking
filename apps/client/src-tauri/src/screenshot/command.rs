use std::io::Cursor;
use std::path::Path;

use base64::{engine::general_purpose, Engine};
use image::ImageReader;
use serde_json::json;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::ipc;
use crate::screenshot::schema::CaptureResult;

fn build_capture_result(path: &Path, scale_factor: f32) -> Result<CaptureResult, String> {
    let img = ImageReader::open(path)
        .map_err(|e| format!("读取截图失败: {e}"))?
        .decode()
        .map_err(|e| format!("解码截图失败: {e}"))?;
    let width = img.width();
    let height = img.height();
    let mut buf = Vec::new();
    img.write_to(&mut Cursor::new(&mut buf), image::ImageFormat::Png)
        .map_err(|e| format!("PNG 编码失败: {e}"))?;
    let b64 = general_purpose::STANDARD.encode(&buf);
    Ok(CaptureResult {
        data_url: format!("data:image/png;base64,{b64}"),
        width,
        height,
        scale_factor,
    })
}

/// 截取主显示器，经 corex-serve IPC 捕获后返回 PNG data URL
#[tauri::command]
pub async fn screenshot_capture(app: AppHandle) -> Result<CaptureResult, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("screenshots");
    std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    let cache_dir_str = cache_dir.to_string_lossy().into_owned();

    let resp = tokio::task::spawn_blocking(move || {
        ipc::invoke(
            "screenshot",
            json!({ "Capture": { "to": cache_dir_str } }),
        )
    })
    .await
    .map_err(|e| format!("截图线程异常: {e}"))??;

    if !resp.ok {
        return Err(resp.error.unwrap_or_else(|| "screenshot 失败".to_string()));
    }
    let path = resp
        .path
        .ok_or_else(|| "screenshot 成功但未返回 path".to_string())?;

    tokio::task::spawn_blocking(move || build_capture_result(Path::new(&path), 1.0))
        .await
        .map_err(|e| format!("截图处理线程异常: {e}"))?
}

/// 弹出（或聚焦）全屏透明截图窗口；窗口加载 `/screenshot` 路由
#[tauri::command]
pub async fn screenshot_open(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screenshot") {
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_always_on_top(true);
        return Ok(());
    }

    WebviewWindowBuilder::new(&app, "screenshot", WebviewUrl::App("/screenshot".into()))
        .title("Screenshot")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .fullscreen(true)
        .focused(true)
        .visible(true)
        .build()
        .map_err(|e| format!("无法创建截图窗口: {e}"))?;
    Ok(())
}

/// 关闭并销毁截图窗口
#[tauri::command]
pub async fn screenshot_close(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screenshot") {
        let _ = window.close();
    }
    Ok(())
}
