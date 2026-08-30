#![allow(non_snake_case)]

use tauri::State;
use thinking_core::aiProvider::Service;
use thinking_core::CommandResult;
use thinking_database::entity::aiProvider::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "aiProvider:toWrite")]
pub async fn aiProviderToWrite(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "aiProvider:toRead")]
pub async fn aiProviderToRead(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "aiProvider:toUpdate")]
pub async fn aiProviderToUpdate(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "aiProvider:toRemove")]
pub async fn aiProviderToRemove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
