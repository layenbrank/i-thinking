use crate::utils::invoke;
use tauri::tray::TrayIconBuilder;
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
                    .build(app)?;

                Ok(())
            })
            .plugin(tauri_plugin_opener::init())
            .invoke_handler(tauri::generate_handler![invoke::greet, invoke::os])
            .run(tauri::generate_context!())
            .expect("error while running application");
    }
}
