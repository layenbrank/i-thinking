//! 开机自启：插件注册与路径对齐。OS 策略在此；command 见 `command` 子模块。
//!
//! - `is_dev` 不 reconcile，且 `autostart:update` 不 `enable`（会清误注册），避免 debug 写入开机项。
//! - 正式包启动时若 OS 已开自启，`reconcile` 用当前 exe 重写路径；冷启动需用安装/release 验收。

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
