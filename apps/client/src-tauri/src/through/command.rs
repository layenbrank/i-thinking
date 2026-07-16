use tauri::State;

use super::state::{Rect, ThroughState};

/// Replace hit-rects for a single source (widget / capture). Empty clears that source.
#[tauri::command(rename = "through:update-rects")]
pub async fn set_rects(
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
