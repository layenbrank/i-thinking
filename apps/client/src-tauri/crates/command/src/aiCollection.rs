#![allow(non_snake_case)]

use tauri::State;
use thinking_core::aiCollection::Service;
use thinking_core::CommandResult;
use thinking_database::entity::aiCollection::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "aiCollection:toWrite")]
pub async fn aiCollectionToWrite(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "aiCollection:toRead")]
pub async fn aiCollectionToRead(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "aiCollection:toUpdate")]
pub async fn aiCollectionToUpdate(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "aiCollection:toRemove")]
pub async fn aiCollectionToRemove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
