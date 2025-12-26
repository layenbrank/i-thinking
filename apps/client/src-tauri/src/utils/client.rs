use crate::utils::invoke;
use tauri::{
    Manager,
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

use tauri_plugin_opener;

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
        tauri::Builder::default()
            .setup(|app| {
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

                Ok(())
            })
            .plugin(tauri_plugin_opener::init())
            .invoke_handler(tauri::generate_handler![invoke::greet, invoke::os])
            .run(tauri::generate_context!())
            .expect("error while running application");
    }
}
