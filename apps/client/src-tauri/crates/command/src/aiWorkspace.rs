#![allow(non_snake_case)]

use tauri::State;
use thinking_core::aiWorkspace::Service;
use thinking_core::CommandResult;
use thinking_database::entity::aiWorkspace::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "aiWorkspace:toWrite")]
pub async fn aiWorkspaceToWrite(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "aiWorkspace:toRead")]
pub async fn aiWorkspaceToRead(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "aiWorkspace:toUpdate")]
pub async fn aiWorkspaceToUpdate(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "aiWorkspace:toRemove")]
pub async fn aiWorkspaceToRemove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
