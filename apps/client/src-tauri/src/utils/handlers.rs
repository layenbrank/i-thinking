//! IPC command 注册。从 bootstrap 拆出，避免 RA 在编辑启动逻辑时展开整表 handler。

use tauri::generate_handler;

use crate::{overlay, screenshot, through, utils::system};

/// 返回应用全部 `#[tauri::command]` 的 invoke handler。
pub fn invoke_handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    generate_handler![
        system::greet,
        system::os,
        system::tray_set_badge,
        system::ipc_ready,
        system::ipc_invoke,
        thinking_command::application::application_write,
        thinking_command::application::application_read,
        thinking_command::application::application_update,
        thinking_command::application::application_remove,
        thinking_command::mirror::mirror_write,
        thinking_command::mirror::mirror_read,
        thinking_command::mirror::mirror_update,
        thinking_command::mirror::mirror_remove,
        thinking_command::asset::asset_read,
        thinking_command::asset::asset_insert,
        thinking_command::asset::asset_update,
        thinking_command::asset::asset_remove,
        screenshot::command::screenshot_capture,
        screenshot::command::screenshot_open,
        screenshot::command::screenshot_close,
        overlay::command::overlay_ensure,
        overlay::command::overlay_hide,
        overlay::command::overlay_set_mode,
        overlay::command::overlay_mount,
        overlay::command::overlay_unmount,
        overlay::command::overlay_take_pending,
        overlay::command::application_open_overlay,
        thinking_command::countdown::countdown_read,
        thinking_command::countdown::countdown_upsert,
        thinking_command::countdown::countdown_update,
        through::command::set_rects,
    ]
}
