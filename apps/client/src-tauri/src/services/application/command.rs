use tauri::State;

use crate::{
    databases::storage::Storage,
    services::application::{
        schema::{Model, ReadP, RemoveP, UpdateP, WriteP},
        service::Service,
    },
    utils::exception::CommandResult,
};

#[tauri::command]
pub async fn application_write(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command]
pub async fn application_read(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command]
pub async fn application_update(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command]
pub async fn application_remove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
