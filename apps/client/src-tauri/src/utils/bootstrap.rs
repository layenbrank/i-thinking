use crate::utils::invoke;
use tauri::{Manager, generate_context, generate_handler};
pub struct Bootstrap;

impl Bootstrap {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
        let builder = tauri::Builder::default();

        // 开机自启（仅桂面平台）
        #[cfg(desktop)]
        let builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ));

        builder
            .setup(move |app| {
                crate::ui::tray::setup(app)?;
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
            // 拦截主窗口关闭事件：隐藏到系统托盘而非退出
            .on_window_event(|window, event| {
                if window.label() == "main" {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();

                        let app = window.app_handle();
                        if let Some(state) = app.try_state::<crate::ui::tray::TrayState>() {
                            // 首次隐藏时发送系统通知
                            if !state.notified.swap(true, std::sync::atomic::Ordering::Relaxed) {
                                #[cfg(desktop)]
                                {
                                    use tauri_plugin_notification::NotificationExt;
                                    let _ = app
                                        .notification()
                                        .builder()
                                        .title("i-Thinking")
                                        .body("应用已最小化到系统托盘，点击托盘图标可重新显示")
                                        .show();
                                }
                            }
                        }
                    }
                }
            })
            // invoke
            .invoke_handler(generate_handler![
                invoke::greet,
                invoke::os,
                invoke::set_tray_badge
            ])
            .run(generate_context!())
            .expect("error while running application");
    }
}
