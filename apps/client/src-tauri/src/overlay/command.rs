use serde::Serialize;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl,
    WebviewWindowBuilder,
};

use crate::overlay::state::{OverlayMountPayload, OverlayPending};
use crate::through::ThroughState;

pub const OVERLAY_LABEL: &str = "overlay";
pub const OVERLAY_URL: &str = "/overlay";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum OverlayMode {
    Idle,
    Capture,
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

/// Create (or show) the single always-on-top overlay window covering the primary monitor.
#[tauri::command]
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
#[tauri::command]
pub async fn overlay_hide(app: AppHandle) -> Result<(), String> {
    if let Some(through) = app.try_state::<ThroughState>() {
        through.set_capture_mode(false);
    }
    if let Some(window) = app.get_webview_window(OVERLAY_LABEL) {
        let _ = window.hide();
    }
    emit_mode(&app, OverlayMode::Idle);
    Ok(())
}

/// Switch overlay interaction mode (`idle` | `capture`).
#[tauri::command]
pub async fn overlay_set_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let parsed = match mode.as_str() {
        "idle" => OverlayMode::Idle,
        "capture" => OverlayMode::Capture,
        other => return Err(format!("unknown overlay mode: {other}")),
    };

    if let Some(through) = app.try_state::<ThroughState>() {
        through.set_capture_mode(matches!(parsed, OverlayMode::Capture));
    }

    if matches!(parsed, OverlayMode::Capture) {
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
#[tauri::command]
pub async fn overlay_mount(
    app: AppHandle,
    kind: String,
    application_id: Option<String>,
    pending: State<'_, OverlayPending>,
) -> Result<(), String> {
    let payload = OverlayMountPayload {
        kind,
        application_id,
    };
    {
        let mut guard = pending.mount.lock().await;
        *guard = Some(payload.clone());
    }
    overlay_ensure(app.clone()).await?;
    emit_mount(&app, &payload);
    Ok(())
}

/// Consume queued mount payload (called by overlay shell on boot).
#[tauri::command]
pub async fn overlay_take_pending(
    pending: State<'_, OverlayPending>,
) -> Result<Option<OverlayMountPayload>, String> {
    let mut guard = pending.mount.lock().await;
    Ok(guard.take())
}
