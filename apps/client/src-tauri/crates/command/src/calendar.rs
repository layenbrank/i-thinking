use tauri::State;
use thinking_core::calendar::Service;
use thinking_core::CommandResult;
use thinking_database::entity::calendar::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "calendar:write")]
pub async fn calendar_write(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "calendar:read")]
pub async fn calendar_read(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "calendar:update")]
pub async fn calendar_update(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "calendar:remove")]
pub async fn calendar_remove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
