use tauri::State;
use thinking_core::mirror::Service;
use thinking_core::CommandResult;
use thinking_database::entity::mirror::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "mirror:write")]
pub async fn mirror_write(state: State<'_, Storage>, params: WriteP) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "mirror:read")]
pub async fn mirror_read(state: State<'_, Storage>, params: ReadP) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "mirror:update")]
pub async fn mirror_update(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "mirror:remove")]
pub async fn mirror_remove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
