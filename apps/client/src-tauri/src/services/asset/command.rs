use tauri::State;

use crate::databases::storage::Storage;
use crate::services::asset::schema::{
    AssetSheet, InsertP, InsertR, ReadP, ReadsP, RemoveP, UpdateBody,
};
use crate::services::asset::service::AssetService;
use crate::utils::exception::CommandResult;

#[tauri::command]
pub async fn assets_read(
    db_state: State<'_, Storage>,
    payload: ReadP,
) -> CommandResult<AssetSheet> {
    let conn = db_state.getter();
    AssetService::read(&conn, payload).await
}

#[tauri::command]
pub async fn assets_reads(
    db_state: State<'_, Storage>,
    payload: ReadsP,
) -> CommandResult<Vec<AssetSheet>> {
    let conn = db_state.getter();
    AssetService::reads(&conn, payload).await
}

#[tauri::command]
pub async fn assets_insert(state: State<'_, Storage>, payload: InsertP) -> CommandResult<InsertR> {
    let connection = state.getter();
    let res = AssetService::insert(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_inserts(
    state: State<'_, Storage>,
    payload: Vec<InsertP>,
) -> CommandResult<Vec<InsertR>> {
    let connection = state.getter();
    let res = AssetService::inserts(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_update(
    state: State<'_, Storage>,
    payload: UpdateBody,
) -> CommandResult<InsertR> {
    let connection = state.getter();
    let res = AssetService::update(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_updates(
    state: State<'_, Storage>,
    payload: Vec<UpdateBody>,
) -> CommandResult<Vec<InsertR>> {
    let connection = state.getter();
    let res = AssetService::updates(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_remove(
    state: State<'_, Storage>,
    payload: RemoveP,
) -> CommandResult<Vec<String>> {
    let connection = state.getter();
    let deleted = AssetService::remove(&connection, payload).await?;

    Ok(deleted)
}

#[tauri::command]
pub async fn assets_removes(
    state: State<'_, Storage>,
    payload: RemoveP,
) -> CommandResult<Vec<String>> {
    let connection = state.getter();
    let deleted = AssetService::removes(&connection, payload).await?;

    Ok(deleted)
}
