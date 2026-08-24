#![allow(non_snake_case)]

use tauri::State;
use thinking_core::aiMessage::Service;
use thinking_core::CommandResult;
use thinking_database::entity::aiMessage::{Model, ReadP, RemoveP, UpdateP, WriteP};
use thinking_database::Storage;

#[tauri::command(rename = "aiMessage:toWrite")]
pub async fn aiMessageToWrite(
    state: State<'_, Storage>,
    params: WriteP,
) -> CommandResult<Vec<String>> {
    Service::toWrite(state.connection(), params).await
}

#[tauri::command(rename = "aiMessage:toRead")]
pub async fn aiMessageToRead(
    state: State<'_, Storage>,
    params: ReadP,
) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "aiMessage:toUpdate")]
pub async fn aiMessageToUpdate(
    state: State<'_, Storage>,
    params: UpdateP,
) -> CommandResult<Vec<String>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "aiMessage:toRemove")]
pub async fn aiMessageToRemove(
    state: State<'_, Storage>,
    params: RemoveP,
) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
