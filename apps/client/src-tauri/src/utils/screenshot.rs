use base64::{Engine, engine::general_purpose};
use image::{ImageFormat, RgbaImage};
use serde::Serialize;
use std::io::Cursor;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use xcap::Monitor;

#[derive(Debug, Serialize)]
pub struct CaptureResult {
    /// 截图整图（PNG，Base64 data URL 形式）
    pub data_url: String,
    /// 物理像素宽度
    pub width: u32,
    /// 物理像素高度
    pub height: u32,
    /// 显示器逻辑缩放因子（DPR）
    pub scale_factor: f32,
}

fn capture_primary() -> Result<CaptureResult, String> {
    let monitors = Monitor::all().map_err(|e| format!("枚举显示器失败: {e}"))?;
    if monitors.is_empty() {
        return Err("未检测到任何显示器".to_string());
    }

    // 优先选择主显示器，没有则回退首个
    let monitor = monitors
        .iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .cloned()
        .unwrap_or_else(|| monitors[0].clone());

    let image = monitor
        .capture_image()
        .map_err(|e| format!("捕获显示器画面失败: {e}"))?;

    let width = image.width();
    let height = image.height();
    let scale_factor = monitor.scale_factor().unwrap_or(1.0);

    let rgba: RgbaImage = image;
    let mut buffer: Vec<u8> = Vec::new();
    rgba.write_to(&mut Cursor::new(&mut buffer), ImageFormat::Png)
        .map_err(|e| format!("PNG 编码失败: {e}"))?;

    let b64 = general_purpose::STANDARD.encode(&buffer);
    let data_url = format!("data:image/png;base64,{}", b64);

    Ok(CaptureResult {
        data_url,
        width,
        height,
        scale_factor,
    })
}

// /// 立即抓取主显示器画面并返回 PNG 数据
// #[tauri::command]
// pub fn screenshot_capture() -> Result<CaptureResult, String> {
//     capture_primary()
// }

/// 弹出（或聚焦）全屏透明截图窗口（加载 `/screenshot` 路由）
#[tauri::command]
pub async fn screenshot_open(app: tauri::AppHandle) -> Result<(), String> {
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
pub async fn screenshot_close(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("screenshot") {
        let _ = window.close();
    }
    Ok(())
}
