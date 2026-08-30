#![allow(non_snake_case)]

use tauri::State;
use thinking_core::aiWorkspaceFolder::Service;
use thinking_core::CommandResult;
use thinking_database::entity::aiWorkspaceFolder::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "aiWorkspaceFolder:toWrite")]
pub async fn aiWorkspaceFolderToWrite(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "aiWorkspaceFolder:toRead")]
pub async fn aiWorkspaceFolderToRead(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "aiWorkspaceFolder:toUpdate")]
pub async fn aiWorkspaceFolderToUpdate(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "aiWorkspaceFolder:toRemove")]
pub async fn aiWorkspaceFolderToRemove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
