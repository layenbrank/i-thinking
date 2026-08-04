//! 开机自启 Tauri commands。

use tauri::AppHandle;

#[cfg(desktop)]
#[tauri::command(rename = "autostart:update")]
pub fn autostart_update(app: AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    // is_dev 产物会加载 localhost:5173；写入开机项会导致重启后白屏。
    // 清掉误注册路径，settings 偏好仍返回 desired，待正式包 reconcile/enable。
    if tauri::is_dev() {
        let _ = app.autolaunch().disable();
        tracing::warn!(enabled, "skip autostart OS write in is_dev");
        return Ok(enabled);
    }

    let autolaunch = app.autolaunch();
    if enabled {
        autolaunch.enable().map_err(|e| e.to_string())?;
    } else {
        autolaunch.disable().map_err(|e| e.to_string())?;
    }
    autolaunch.is_enabled().map_err(|e| e.to_string())
}

#[cfg(desktop)]
#[tauri::command(rename = "autostart:read")]
pub fn autostart_read(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    app.autolaunch().is_enabled().map_err(|e| e.to_string())
}
