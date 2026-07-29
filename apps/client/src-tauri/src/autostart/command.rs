//! 开机自启 Tauri commands。

use tauri::AppHandle;

#[cfg(desktop)]
#[tauri::command(rename = "autostart:update")]
pub fn autostart_update(app: AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

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
