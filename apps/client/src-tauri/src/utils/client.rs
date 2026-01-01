use crate::utils::invoke;
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    // WebviewUrl,
    // webview::WebviewWindowBuilder,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_sql::{Migration, MigrationKind};

pub struct Client;

impl Client {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
        #[cfg(debug_assertions)] // only enable instrumentation in development builds
        let devtools = tauri_plugin_devtools::init();

        let mut builder = tauri::Builder::default();

        let port: u16 = 9527;

        #[cfg(debug_assertions)]
        {
            builder = builder.plugin(devtools);
        }

        let migrations = vec![
            // Define your migrations here
            Migration {
                version: 1,
                description: "create_initial_tables",
                sql: "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);",
                kind: MigrationKind::Up,
            },
        ];

        builder = builder
            .setup(move |app| {
                #[cfg(desktop)]
                {
                    // 创建右键菜单项
                    let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
                    let hide_item = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
                    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;

                    // 创建菜单
                    let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

                    TrayIconBuilder::new()
                        .icon(app.default_window_icon().unwrap().clone())
                        .menu(&menu)
                        .show_menu_on_left_click(false) // 防止左键点击时显示菜单
                        .on_tray_icon_event(move |tray, event| {
                            match event {
                                TrayIconEvent::Click {
                                    id: _,
                                    position: _,
                                    rect: _,
                                    button: MouseButton::Left,
                                    button_state: MouseButtonState::Up,
                                } => {
                                    println!("left click pressed and released");
                                    // 左键点击：切换窗口显示/隐藏（不显示菜单）
                                    let app = tray.app_handle();
                                    if let Some(window) = app.get_webview_window("main") {
                                        if window.is_visible().unwrap_or(false) {
                                            // 如果窗口可见，则隐藏
                                            let _ = window.hide();
                                        } else {
                                            // 如果窗口隐藏，则显示并聚焦
                                            let _ = window.unminimize();
                                            let _ = window.show();
                                            let _ = window.set_focus();
                                        }
                                    }
                                }
                                TrayIconEvent::Click {
                                    id: _,
                                    position: _,
                                    rect: _,
                                    button: MouseButton::Right,
                                    button_state: MouseButtonState::Up,
                                } => {
                                    println!("right click pressed and released");
                                    // 右键点击会显示菜单（由 TrayIconBuilder 自动处理）
                                }
                                _ => {
                                    println!("unhandled event {event:?}");
                                }
                            }
                        })
                        .on_menu_event(move |_app, event| {
                            // 处理菜单项点击事件
                            let id_str = event.id.as_ref();
                            match id_str {
                                "show" => {
                                    if let Some(window) = _app.get_webview_window("main") {
                                        let _ = window.unminimize();
                                        let _ = window.show();
                                        let _ = window.set_focus();
                                    }
                                }
                                "hide" => {
                                    if let Some(window) = _app.get_webview_window("main") {
                                        let _ = window.hide();
                                    }
                                }
                                "quit" => {
                                    _app.exit(0);
                                }
                                _ => {
                                    println!("unhandled menu item: {:?}", event.id);
                                }
                            }
                        })
                        .build(app)?;
                }
                #[cfg(desktop)]
                {
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
                // #[cfg(desktop)]
                // {
                //     let menu = MenuBuilder::new(app)
                //         .text("open", "Open")
                //         .text("close", "Close")
                //         .check("check_item", "Check Item")
                //         .separator()
                //         .text("disabled_item", "Disabled Item")
                //         .text("status", "Status: Processing...")
                //         .build()?;
                //
                //     app.set_menu(menu.clone())?;
                //
                //     // Update individual menu item text
                //     menu.get("status")
                //         .unwrap()
                //         .as_menuitem_unchecked()
                //         .set_text("Status: Ready")?;
                // }
                // #[cfg(desktop)]
                // {
                // let url = format!("http://localhost:{}", port).parse().unwrap();
                // WebviewWindowBuilder::new(app, "main".to_string(), WebviewUrl::External(url))
                //     .title("Localhost Example")
                //     .build()?;
                // }

                Ok(())
            })
            .plugin(tauri_plugin_autostart::init(
                MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"]),
            ));

        // 只在非 debug 模式下初始化 log 插件，因为 devtools 在 debug 模式下已经初始化了日志系统
        #[cfg(not(debug_assertions))]
        {
            builder = builder.plugin(tauri_plugin_log::Builder::default().build());
        }

        builder
            .plugin(tauri_plugin_localhost::Builder::new(port).build())
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_shell::init())
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(
                tauri_plugin_sql::Builder::default()
                    .add_migrations("sqlite:thinking.db", migrations)
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
