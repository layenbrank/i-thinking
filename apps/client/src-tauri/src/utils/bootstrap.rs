use std::time::Duration;

use tauri::{
    Emitter, Manager, RunEvent, generate_context, generate_handler,
};

use crate::{
    countdown,
    databases::{
        migration,
        storage::{self, Storage, get_app_data_dir, get_database_path},
    },
    screenshot,
    services::{application, asset, mirror},
    through::{self, ThroughState},
    ui::tray,
    utils::{
        corex::{self, CorexState},
        invoke,
    },
};

pub struct Bootstrap;

impl Bootstrap {
    #[cfg_attr(mobile, tauri::mobile_entry_point)]
    pub fn run() {
        let builder = tauri::Builder::default();

        #[cfg(desktop)]
        let builder = builder.plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![]),
        ));

        builder
            .setup(move |app| {
                let handle = app.handle().clone();
                let handle_for_db = handle.clone();
                let db_state = tauri::async_runtime::block_on(async move {
                    let app_dir = get_app_data_dir(&handle_for_db)?;
                    let db_path = get_database_path(&app_dir);
                    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());
                    let connection = storage::initialize(&db_url).await?;
                    migration::run(&connection).await?;

                    Ok::<_, anyhow::Error>(Storage::new(connection))
                })
                .expect("failed to initialize database");
                app.manage(db_state);
                app.manage(CorexState::new());
                app.manage(ThroughState::new("countdown"));
                through::spawn_worker(app.handle().clone());
                tray::setup(app)?;

                #[cfg(all(desktop, windows))]
                {
                    match corex::spawn_sidecar(app.handle()) {
                        Ok(()) => {
                            let corex_state = app.state::<CorexState>();
                            let ready = corex::wait_for_daemon(Duration::from_secs(8), &corex_state);
                            if !ready {
                                let _ = app.emit("corex://not-ready", ());
                            }
                        }
                        Err(e) => {
                            tracing::error!("corex-serve 启动失败: {e}");
                            let _ = app.emit("corex://not-ready", ());
                        }
                    }
                }

                Ok(())
            })
            .plugin(tauri_plugin_fs::init())
            .plugin(tauri_plugin_store::Builder::default().build())
            .plugin(tauri_plugin_sql::Builder::default().build())
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
            .plugin(tauri_plugin_notification::init())
            .plugin(tauri_plugin_positioner::init())
            .plugin(tauri_plugin_opener::init())
            .plugin(tauri_plugin_dialog::init())
            .plugin(tauri_plugin_clipboard_manager::init())
            .plugin(tauri_plugin_global_shortcut::Builder::default().build())
            .on_window_event(|window, event| {
                if window.label() == "main" {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window.hide();

                        let app = window.app_handle();
                        if let Some(state) = app.try_state::<crate::ui::tray::TrayState>() {
                            if !state
                                .notified
                                .swap(true, std::sync::atomic::Ordering::Relaxed)
                            {
                                #[cfg(desktop)]
                                {
                                    use tauri_plugin_notification::NotificationExt;
                                    let _ = app
                                        .notification()
                                        .builder()
                                        .title("i thinking")
                                        .body("应用已最小化到系统托盘，点击托盘图标可重新显示")
                                        .show();
                                }
                            }
                        }
                    }
                }
            })
            .invoke_handler(generate_handler![
                invoke::greet,
                invoke::os,
                invoke::set_tray_badge,
                invoke::ipc_ready,
                invoke::ipc_invoke,
                application::command::application_write,
                application::command::application_read,
                application::command::application_update,
                application::command::application_remove,
                mirror::command::mirror_write,
                mirror::command::mirror_read,
                mirror::command::mirror_update,
                mirror::command::mirror_remove,
                asset::command::assets_read,
                asset::command::assets_reads,
                asset::command::assets_insert,
                asset::command::assets_inserts,
                asset::command::assets_update,
                asset::command::assets_updates,
                asset::command::assets_remove,
                asset::command::assets_removes,
                screenshot::command::screenshot_capture,
                screenshot::command::screenshot_open,
                screenshot::command::screenshot_close,
                countdown::command::countdown_config_read,
                countdown::command::countdown_config_upsert,
                countdown::command::countdown_config_update,
                through::command::update_rects
            ])
            .build(generate_context!())
            .expect("error while building application")
            .run(|app, event| {
                if matches!(event, RunEvent::Exit) {
                    corex::shutdown_sidecar(app);
                }
            });
    }
}
