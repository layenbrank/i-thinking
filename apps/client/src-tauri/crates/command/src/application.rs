use tauri::State;
use thinking_core::application::Service;
use thinking_core::CommandResult;
use thinking_database::entity::application::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "application:write")]
pub async fn application_write(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "application:read")]
pub async fn application_read(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "application:update")]
pub async fn application_update(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "application:remove")]
pub async fn application_remove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
