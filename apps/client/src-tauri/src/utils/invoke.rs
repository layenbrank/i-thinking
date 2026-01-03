use crate::utils::scan::{self, OSContext};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn os() -> OSContext {
    scan::Scan::os()
}
