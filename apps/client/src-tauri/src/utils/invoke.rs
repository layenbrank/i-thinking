use crate::utils::scan::{self, OSContext};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn os() -> OSContext {
    scan::Scan::os()
}

/// 从前端控制托盘图标徽章状态
/// - `has_badge = true`  → 右下角显示红点
/// - `has_badge = false` → 恢复普通图标
#[tauri::command]
pub fn set_tray_badge(app: tauri::AppHandle, has_badge: bool) {
    crate::ui::tray::set_badge(&app, has_badge);
}
