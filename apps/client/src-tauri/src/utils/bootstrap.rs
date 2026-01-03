use crate::utils::invoke;
use tauri::{generate_context, generate_handler};
pub struct Bootstrap;

impl Bootstrap {
    pub fn run() {
        let mut builder = tauri::Builder::default();

        builder
            // 核心插件
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(tauri_plugin_sql::Builder::default().build())
            // 系统级 插件
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_http::init())
            .plugin(tauri_plugin_websocket::init())
            // UI 插件
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_positioner::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_global_shortcut::Builder::default().build())
            // invoke
            .invoke_handler(generate_handler![invoke::greet, invoke::os])
            .setup(move |app| {
                let handle = app.handle();
                Ok(())
            })
            .run(generate_context!())
            .expect("error while running application");
    }
}
