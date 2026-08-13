use std::path::Path;

use image::ImageReader;
use serde_json::json;
use tauri::{AppHandle, Manager};

use crate::utils::ipc;
use crate::overlay::command::{overlay_ensure, overlay_update_mode};
use crate::capture::schema::ScreenshotResult;

fn build_screenshot_result(path: &str, scale_factor: f32) -> Result<ScreenshotResult, String> {
    let img = ImageReader::open(Path::new(path))
        .map_err(|e| format!("[capture:screenshot] 读取截图失败 ({path}): {e}"))?
        .decode()
        .map_err(|e| format!("[capture:screenshot] 解码截图失败 ({path}): {e}"))?;
    Ok(ScreenshotResult {
        path: path.to_string(),
        width: img.width(),
        height: img.height(),
        scale_factor,
    })
}

/// 截取主显示器，经 corex-serve IPC 捕获后返回截图文件路径
#[tauri::command(rename = "capture:screenshot")]
pub async fn capture_screenshot(app: AppHandle) -> Result<ScreenshotResult, String> {
    // Avoid capturing the overlay surface itself while grabbing the desktop.
    let overlay = app.get_webview_window("overlay");
    if let Some(ref window) = overlay {
        let _ = window.hide();
        tokio::time::sleep(std::time::Duration::from_millis(60)).await;
    }

    // 主逻辑承载在 async 块中，无论成功与否，结尾都恢复 overlay 窗口
    let result = async {
        let data_dir = app
            .path()
            .app_local_data_dir()
            .map_err(|e| format!("[capture:screenshot] 获取数据目录失败: {e}"))?
            .join("screenshots");
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("[capture:screenshot] 创建截图目录失败 ({}): {e}", data_dir.display()))?;
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

        tokio::task::spawn_blocking(move || build_screenshot_result(&path, 1.0))
            .await
            .map_err(|e| format!("[capture:screenshot] 截图处理线程异常: {e}"))?
    }
    .await;

    if let Some(window) = overlay {
        let _ = window.show();
        let _ = window.set_always_on_top(true);
    }

    result
}

/// 进入 overlay 的 screenshot 模式（单窗口，不再单独创建 screenshot WebView）
#[tauri::command(rename = "capture:open")]
pub async fn capture_open(app: AppHandle) -> Result<(), String> {
    overlay_ensure(app.clone()).await?;
    overlay_update_mode(app, "screenshot".into()).await
}

/// 退出 screenshot：回到 idle（由前端决定是否 hide 空层）
#[tauri::command(rename = "capture:close")]
pub async fn capture_close(app: AppHandle) -> Result<(), String> {
    overlay_update_mode(app, "idle".into()).await
}
