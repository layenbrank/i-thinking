use tauri::State;

use super::state::{Rect, ThroughState};

#[tauri::command]
pub async fn update_rects(
    rects: Vec<Rect>,
    state: State<'_, ThroughState>,
) -> Result<(), String> {
    let mut guard = state.rects.write().await;
    *guard = rects;
    Ok(())
}
