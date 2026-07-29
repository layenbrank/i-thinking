//! 开机自启：插件注册与路径对齐。OS 策略在此；command 见 `command` 子模块。
//!
//! - `tauri dev`（`is_dev`）不 reconcile 路径，避免 ephemeral debug exe 写入开机项。
//! - `autostart:update` 在任何模式均可切换，便于测注册表；冷启动页面需用 build 产物验收。

pub mod command;

use tauri::{AppHandle, Runtime};

/// 自启时传入的 CLI 参数（与 `tauri.conf` cli / 前端 `--minimized` 一致）。
pub const ARGS: &[&str] = &["--minimized"];

/// 挂载 `tauri-plugin-autostart`。
#[cfg(desktop)]
pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.plugin(tauri_plugin_autostart::init(
        tauri_plugin_autostart::MacosLauncher::LaunchAgent,
        Some(ARGS.to_vec()),
    ))
}

#[cfg(not(desktop))]
pub fn register<R: Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder
}

/// 非 `tauri-dev` 且 OS 已开启时，用当前 exe 重写启动项路径。
#[cfg(desktop)]
pub fn reconcile(app: &AppHandle) {
    if tauri::is_dev() {
        return;
    }

    use tauri_plugin_autostart::ManagerExt;

    let autolaunch = app.autolaunch();
    match autolaunch.is_enabled() {
        Ok(true) => {
            if let Err(e) = autolaunch.enable() {
                tracing::warn!("autostart path reconcile failed: {e}");
            }
        }
        Ok(false) => {}
        Err(e) => tracing::warn!("autostart is_enabled failed: {e}"),
    }
}

#[cfg(not(desktop))]
pub fn reconcile(_app: &AppHandle) {}
