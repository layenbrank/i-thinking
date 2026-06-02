use tauri::State;

use super::state::{ClickThroughState, Rect};

#[tauri::command]
pub async fn update_rects(
    rects: Vec<Rect>,
    state: State<'_, ClickThroughState>,
) -> Result<(), String> {
    let mut guard = state.rects.write().await;
    *guard = rects;
    Ok(())
}
