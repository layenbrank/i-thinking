use tauri::State;

use super::state::{Rect, ThroughState};

/// Replace hit-rects for a single source (widget / capture). Empty clears that source.
#[tauri::command]
pub async fn update_through_rects(
    source: String,
    rects: Vec<Rect>,
    state: State<'_, ThroughState>,
) -> Result<(), String> {
    let mut guard = state.sources.write().await;
    if rects.is_empty() {
        guard.remove(&source);
    } else {
        guard.insert(source, rects);
    }
    Ok(())
}

/// Backward-compatible shim used by older callers (treated as source `"legacy"`).
#[tauri::command]
pub async fn update_rects(
    rects: Vec<Rect>,
    state: State<'_, ThroughState>,
) -> Result<(), String> {
    let mut guard = state.sources.write().await;
    if rects.is_empty() {
        guard.remove("legacy");
    } else {
        guard.insert("legacy".to_string(), rects);
    }
    Ok(())
}
