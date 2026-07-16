use tauri::State;
use thinking_core::asset::Service;
use thinking_core::CommandResult;
use thinking_database::entity::asset::{InsertP, InsertR, Model, ReadP, RemoveP, UpdateP};
use thinking_database::Storage;

#[tauri::command(rename = "asset:read")]
pub async fn asset_read(state: State<'_, Storage>, params: ReadP) -> CommandResult<Vec<Model>> {
    Service::toRead(state.connection(), params).await
}

#[tauri::command(rename = "asset:insert")]
pub async fn asset_insert(state: State<'_, Storage>, params: InsertP) -> CommandResult<Vec<InsertR>> {
    Service::toInsert(state.connection(), params).await
}

#[tauri::command(rename = "asset:update")]
pub async fn asset_update(state: State<'_, Storage>, params: UpdateP) -> CommandResult<Vec<InsertR>> {
    Service::toUpdate(state.connection(), params).await
}

#[tauri::command(rename = "asset:remove")]
pub async fn asset_remove(state: State<'_, Storage>, params: RemoveP) -> CommandResult<Vec<String>> {
    Service::toRemove(state.connection(), params).await
}
