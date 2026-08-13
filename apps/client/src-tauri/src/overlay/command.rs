use serde::Serialize;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl,
    WebviewWindowBuilder,
};

use crate::overlay::state::{OverlayMountPayload, OverlayPending, OverlayUnmountPayload};
use crate::through::ThroughState;

pub const OVERLAY_LABEL: &str = "overlay";
pub const OVERLAY_URL: &str = "/overlay";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum OverlayMode {
    Idle,
    Screenshot,
}

fn apply_primary_monitor_bounds(app: &AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| "overlay window missing".to_string())?;
    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no primary monitor".to_string())?;
    let pos = monitor.position();
    let size = monitor.size();
    let _ = window.set_position(PhysicalPosition::new(pos.x, pos.y));
    let _ = window.set_size(PhysicalSize::new(size.width, size.height));
    Ok(())
}

fn emit_mode(app: &AppHandle, mode: OverlayMode) {
    let _ = app.emit("overlay://mode", mode);
}

fn emit_mount(app: &AppHandle, payload: &OverlayMountPayload) {
    let _ = app.emit("overlay://mount", payload);
}

fn emit_unmount(app: &AppHandle, payload: &OverlayUnmountPayload) {
    let _ = app.emit("overlay://unmount", payload);
}

/// Create (or show) the single always-on-top overlay window covering the primary monitor.
#[tauri::command(rename = "overlay:ensure")]
pub async fn overlay_ensure(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        apply_primary_monitor_bounds(&app, OVERLAY_LABEL)?;
        let _ = window.show();
        let _ = window.set_always_on_top(true);
        return Ok(());
    }

    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "no primary monitor".to_string())?;
    let pos = monitor.position();
    let size = monitor.size();

    WebviewWindowBuilder::new(&app, OVERLAY_LABEL, WebviewUrl::App(OVERLAY_URL.into()))
        .title("Overlay")
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .maximizable(true)
        .maximized(true)
        .shadow(false)
        .fullscreen(false)
        .focused(false)
        .visible(true)
        .inner_size(size.width as f64, size.height as f64)
        .position(pos.x as f64, pos.y as f64)
        .build()
        .map_err(|e| format!("无法创建 overlay 窗口: {e}"))?;

    // Re-apply physical bounds in case DPI/monitor mapping differed at build time.
    apply_primary_monitor_bounds(&app, OVERLAY_LABEL)?;
    Ok(())
}

/// Hide the overlay window without destroying it.
#[tauri::command(rename = "overlay:hide")]
pub async fn overlay_hide(app: AppHandle) -> Result<(), String> {
    if let Some(through) = app.try_state::<ThroughState>() {
        through.set_screenshot_mode(false);
    }
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = window.hide();
    }
    emit_mode(&app, OverlayMode::Idle);
    Ok(())
}

/// Switch overlay interaction mode (`idle` | `screenshot`).
#[tauri::command(rename = "overlay:update-mode")]
pub async fn overlay_update_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let parsed = match mode.as_str() {
        "idle" => OverlayMode::Idle,
        "screenshot" => OverlayMode::Screenshot,
        other => return Err(format!("unknown overlay mode: {other}")),
    };

    if let Some(through) = app.try_state::<ThroughState>() {
        through.set_screenshot_mode(matches!(parsed, OverlayMode::Screenshot));
    }

    if matches!(parsed, OverlayMode::Screenshot) {
        overlay_ensure(app.clone()).await?;
        if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
            let _ = window.set_focus();
            let _ = window.set_ignore_cursor_events(false);
        }
    }

    emit_mode(&app, parsed);
    Ok(())
}

/// Ensure overlay is visible and queue a panel mount (survives cold-start race).
/// 冷启动：只写 pending（前端 take-pending）；热路径：只 emit（前端已 listen）。
#[tauri::command(rename = "overlay:mount")]
pub async fn overlay_mount(
    app: AppHandle,
    payload: OverlayMountPayload,
    pending: State<'_, OverlayPending>,
) -> Result<(), String> {
    let existed = app.get_webview_window(OVERLAY_LABEL).is_some();
    {
        let mut unmount_guard = pending.unmount.lock().await;
        if unmount_guard
            .as_ref()
            .is_some_and(|p| p.magnetic_tile_id == payload.magnetic_tile_id)
        {
            *unmount_guard = None;
        }
    }
    overlay_ensure(app.clone()).await?;
    if existed {
        emit_mount(&app, &payload);
    } else {
        let mut guard = pending.mount.lock().await;
        *guard = Some(payload);
    }
    Ok(())
}

/// Remove a tile by magneticTileID.
#[tauri::command(rename = "overlay:unmount")]
pub async fn overlay_unmount(
    app: AppHandle,
    payload: OverlayUnmountPayload,
    pending: State<'_, OverlayPending>,
) -> Result<(), String> {
    let existed = app.get_webview_window(OVERLAY_LABEL).is_some();
    {
        let mut mount_guard = pending.mount.lock().await;
        if mount_guard
            .as_ref()
            .is_some_and(|p| p.magnetic_tile_id == payload.magnetic_tile_id)
        {
            *mount_guard = None;
        }
    }
    if existed {
        emit_unmount(&app, &payload);
    } else {
        let mut unmount_guard = pending.unmount.lock().await;
        *unmount_guard = Some(payload);
    }
    Ok(())
}

/// Consume queued mount payload (called by overlay shell on boot).
#[tauri::command(rename = "overlay:take-pending")]
pub async fn overlay_take_pending(
    pending: State<'_, OverlayPending>,
) -> Result<Option<OverlayMountPayload>, String> {
    let mut guard = pending.mount.lock().await;
    Ok(guard.take())
}

/// Consume queued unmount payload (called by overlay shell on boot).
#[tauri::command(rename = "overlay:take-pending-unmount")]
pub async fn overlay_take_pending_unmount(
    pending: State<'_, OverlayPending>,
) -> Result<Option<OverlayUnmountPayload>, String> {
    let mut guard = pending.unmount.lock().await;
    Ok(guard.take())
}
