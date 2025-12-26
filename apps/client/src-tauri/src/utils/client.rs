use crate::utils::invoke;
use tauri::{
    Manager, WebviewUrl,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::WebviewWindowBuilder,
};
use tauri_plugin_sql::{Builder, Migration, MigrationKind};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// #[cfg_attr(mobile, tauri::mobile_entry_point)]
// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_opener::init())
//         .invoke_handler(tauri::generate_handler![invoke::greet])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

pub struct Client;

impl Client {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
        let port: u16 = 9527;

        let migrations = vec![
            // Define your migrations here
            Migration {
                version: 1,
                description: "create_initial_tables",
                sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);",
                kind: MigrationKind::Up,
            },
        ];

        tauri::Builder::default()
            .setup(|app| {
                #[cfg(desktop)]
                {
                    TrayIconBuilder::new()
                        .icon(app.default_window_icon().unwrap().clone())
                        .on_tray_icon_event(|tray, event| {
                            match event {
                                TrayIconEvent::Click {
                                    id,
                                    position,
                                    rect,
                                    button: MouseButton::Left,
                                    button_state: MouseButtonState::Up,
                                } => {
                                    println!("left click pressed and released");
                                    // in this example, let's show and focus the main window when the tray is clicked
                                    let app = tray.app_handle();
                                    if let Some(window) = app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                                _ => {
                                    println!("unhandled event {event:?}");
                                }
                            }
                        })
                        .build(app)?;
                }
                #[cfg(desktop)]
                {
                    use tauri_plugin_autostart::MacosLauncher;
                    use tauri_plugin_autostart::ManagerExt;

                    app.handle().plugin(tauri_plugin_autostart::init(
                        MacosLauncher::LaunchAgent,
                        Some(vec!["--flag1", "--flag2"]),
                    ))?;

                    // Get the autostart manager
                    let autostart_manager = app.autolaunch();
                    // Enable autostart
                    let _ = autostart_manager.enable();
                    // Check enable state
                    println!(
                        "registered for autostart? {}",
                        autostart_manager.is_enabled().unwrap()
                    );
                    // Disable autostart
                    let _ = autostart_manager.disable();
                }

                Ok(())
            })
            .plugin(tauri_plugin_log::Builder::default().build())
            .plugin(tauri_plugin_localhost::Builder::new(port).build())
            .setup(move |app| {
                let url = format!("http://localhost:{}", port).parse().unwrap();
                WebviewWindowBuilder::new(app, "main".to_string(), WebviewUrl::External(url))
                    .title("Localhost Example")
                    .build()?;
                Ok(())
            })
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_cli::init())
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(
                tauri_plugin_sql::Builder::default()
                    .add_migrations("sqlite:i-thinking.db", migrations)
                    .build(),
            )
            .plugin(tauri_plugin_websocket::init())
            .plugin(tauri_plugin_http::init())
            .plugin(tauri_plugin_process::init())
            .plugin(tauri_plugin_positioner::init())
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_opener::init())
            .invoke_handler(tauri::generate_handler![invoke::greet, invoke::os])
            .run(tauri::generate_context!())
            .expect("error while running application");
    }
}
