//! IPC command 注册。从 bootstrap 拆出，避免 RA 在编辑启动逻辑时展开整表 handler。

use tauri::generate_handler;

use crate::{autostart, overlay, screenshot, system, through};

/// 返回应用全部 `#[tauri::command]` 的 invoke handler。
pub fn invoke_handler() -> impl Fn(tauri::ipc::Invoke<tauri::Wry>) -> bool + Send + Sync + 'static {
    generate_handler![
        #[cfg(desktop)]
        autostart::command::autostart_update,
        #[cfg(desktop)]
        autostart::command::autostart_read,
        system::command::greet,
        system::command::os,
        system::command::tray_set_badge,
        system::command::ipc_ready,
        system::command::ipc_invoke,
        thinking_command::magnetic_tile::magnetic_tile_write,
        thinking_command::magnetic_tile::magnetic_tile_read,
        thinking_command::magnetic_tile::magnetic_tile_update,
        thinking_command::magnetic_tile::magnetic_tile_remove,
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
        overlay::command::overlay_update_mode,
        overlay::command::overlay_mount,
        overlay::command::overlay_unmount,
        overlay::command::overlay_take_pending,
        overlay::command::overlay_take_pending_unmount,
        overlay::command::magnetic_tile_show_overlay,
        thinking_command::countdown::countdown_read,
        thinking_command::countdown::countdown_upsert,
        thinking_command::countdown::countdown_update,
        through::command::set_rects,
    ]
}
