use crate::utils::invoke;
use tauri::{Manager, generate_context, generate_handler};
pub struct Bootstrap;

impl Bootstrap {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
        let builder = tauri::Builder::default();

        builder
            .setup(move |app| {
                let _handle = app.handle();
                Ok(())
            })
            // 核心插件
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(tauri_plugin_sql::Builder::default().build())
            // 系统级 插件
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_http::init())
            .plugin(tauri_plugin_websocket::init())
            .plugin(tauri_plugin_os::init())
            .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
                let _ = app
                    .get_webview_window("main")
                    .expect("no main window")
                    .set_focus();
            }))
            // UI 插件
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_positioner::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_global_shortcut::Builder::default().build())
            // invoke
            .invoke_handler(generate_handler![invoke::greet, invoke::os])
            .run(generate_context!())
            .expect("error while running application");
    }
}
