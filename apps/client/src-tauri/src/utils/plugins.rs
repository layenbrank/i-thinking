//! Tauri 插件注册。从 bootstrap 拆出，减轻单文件宏/类型展开压力。

use tauri::{AppHandle, Manager};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

use crate::utils::localhost::LOCALHOST_PORT;
use crate::utils::log_retention::LOG_MAX_FILE_SIZE;

/// 为 Builder 挂载桌面端通用插件。
pub fn register_plugins(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    let mut log_builder = tauri_plugin_log::Builder::new()
        .rotation_strategy(RotationStrategy::KeepAll)
        .max_file_size(LOG_MAX_FILE_SIZE)
        .timezone_strategy(TimezoneStrategy::UseLocal)
        .target(Target::new(TargetKind::Stdout))
        .target(Target::new(TargetKind::LogDir { file_name: None }));

    #[cfg(debug_assertions)]
    {
        log_builder = log_builder.target(Target::new(TargetKind::Webview));
    }

    builder
        .plugin(log_builder.build())
        .plugin(tauri_plugin_localhost::Builder::new(LOCALHOST_PORT).build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
}

fn focus_main_window(app: &AppHandle) {
    let _ = app
        .get_webview_window("main")
        .expect("no main window")
        .set_focus();
}
