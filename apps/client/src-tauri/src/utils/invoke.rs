use crate::utils::scan::{self, OSContext};
use tauri::command;

#[command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[command]
pub fn os() -> OSContext {
    scan::Scan::os()
}
