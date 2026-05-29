use tauri::{AppHandle, Emitter, Manager, webview::Webview};

use crate::screenshot::{
    schema::{CaptureResult, PinImageStore, PinPrepareResult, WindowInfo},
    service,
};

/// 截取主显示器，图片内存缓存，前端通过 capture:// 协议零拷贝读取。
/// 截图在窗口隐藏时完成（避免截到自身 UI），完成后 emit `screenshot:ready`。
/// BMP 后台异步写盘（仅供 pin 等需要文件路径的场景回退使用）。
#[tauri::command]
pub async fn screenshot_capture(app: AppHandle) -> Result<(), String> {
    // 在阻塞线程中执行截图（窗口仍隐藏，不会截到自身 UI）
    let app_clone = app.clone();
    let monitors = tokio::task::spawn_blocking(move || service::capture(&app_clone))
        .await
        .map_err(|e| format!("截图线程异常: {e}"))??;

    let result = CaptureResult { monitors };

    // 截图到内存后立即通知前端：显示窗口 + 从 capture:// 加载图片
    let _ = app.emit("screenshot:ready", result);

    // BMP 后台写盘（不阻塞窗口显示）
    let app_bg = app.clone();
    tokio::task::spawn_blocking(move || {
        if let Err(e) = service::save_bmp_to_disk(&app_bg) {
            tracing::warn!("BMP 后台写盘失败: {e}");
        }
    });

    Ok(())
}

/// 裁剪选区并保存为文件，返回文件路径
/// `final_image_base64`: 如果前端已合成标注层，传入完整 PNG base64；否则由后端纯裁剪
#[tauri::command]
pub async fn screenshot_save(
    app: AppHandle,
    source_path: String,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    final_image_base64: Option<String>,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let path = service::crop_and_save(
            &app,
            &source_path,
            x,
            y,
            w,
            h,
            final_image_base64.as_deref(),
        )?;
        Ok(path.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| format!("保存线程异常: {e}"))?
}

/// 裁剪选区并复制到剪贴板
#[tauri::command]
pub async fn screenshot_copy(
    app: AppHandle,
    source_path: String,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    final_image_base64: Option<String>,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let (rgba, cw, ch) = service::crop_to_rgba(
            &app,
            &source_path,
            x,
            y,
            w,
            h,
            final_image_base64.as_deref(),
        )?;
        service::copy_image_to_clipboard(&app, rgba, cw, ch)
    })
    .await
    .map_err(|e| format!("复制线程异常: {e}"))?
}

/// 为贴图窗口准备数据（生成 label + 存储图片路径），由前端创建实际窗口
#[tauri::command]
pub fn screenshot_pin(
    app: AppHandle,
    image_path: String,
    width: u32,
    height: u32,
) -> Result<PinPrepareResult, String> {
    service::prepare_pin(&app, &image_path, width, height)
}

/// Pin 窗口前端 mount 后查询自己的图片路径
#[tauri::command]
pub fn screenshot_image(webview: Webview, app: AppHandle) -> Result<String, String> {
    let label = webview.label().to_string();
    let store = app.state::<PinImageStore>();
    let map = store
        .0
        .lock()
        .map_err(|e: std::sync::PoisonError<_>| e.to_string())?;
    map.get(&label)
        .cloned()
        .ok_or_else(|| format!("未找到窗口 {} 的图片路径", label))
}

/// 列举系统可见窗口（用于窗口自动检测）
#[tauri::command]
pub fn screenshot_windows() -> Result<Vec<WindowInfo>, String> {
    service::windows()
}
