//! Tauri 插件注册。从 bootstrap 拆出，减轻单文件宏/类型展开压力。

use log::LevelFilter;
use tauri::{AppHandle, Manager};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

use crate::autostart;
use crate::utils::log_retention::{LOG_MAX_FILE_COUNT, LOG_MAX_FILE_SIZE};

/// 为 Builder 挂载桌面端通用插件。
pub fn register_plugins(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    let builder = builder
        .plugin(build_log_plugin())
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
        .plugin(tauri_plugin_updater::Builder::new().build());

    autostart::register(builder)
}

/// 文件始终写入；stdout / Webview 仅 debug。生产 Info，开发 Debug。
fn build_log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let level = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Info
    };

    let sql_level = if cfg!(debug_assertions) {
        LevelFilter::Debug
    } else {
        LevelFilter::Warn
    };

    let log_builder = tauri_plugin_log::Builder::new()
        .level(level)
        .level_for("tao", LevelFilter::Warn)
        .level_for("wry", LevelFilter::Warn)
        .level_for("hyper", LevelFilter::Warn)
        .level_for("hyper_util", LevelFilter::Warn)
        .level_for("reqwest", LevelFilter::Warn)
        .level_for("sqlx", sql_level)
        .level_for("sqlx_core", sql_level)
        .level_for("sea_orm", sql_level)
        .rotation_strategy(RotationStrategy::KeepSome(LOG_MAX_FILE_COUNT))
        .max_file_size(LOG_MAX_FILE_SIZE)
        .timezone_strategy(TimezoneStrategy::UseUtc)
        .clear_targets()
        .target(Target::new(TargetKind::LogDir { file_name: None }));

    #[cfg(debug_assertions)]
    let log_builder = log_builder
        .target(Target::new(TargetKind::Stdout))
        .target(Target::new(TargetKind::Webview));

    log_builder.build()
}

fn focus_main_window(app: &AppHandle) {
    let _ = app
        .get_webview_window("main")
        .expect("no main window")
        .set_focus();
}
