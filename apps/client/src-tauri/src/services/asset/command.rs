use tauri::State;

use crate::databases::storage::Storage;
use crate::services::asset::schema::{
    AssetSheet, InsertPayload, InsertResponse, ReadPayload, ReadsPayload, RemovePayload, UpdateBody,
};
use crate::services::asset::service::AssetService;
use crate::utils::exception::CommandResult;

#[tauri::command]
pub async fn assets_read(
    db_state: State<'_, Storage>,
    payload: ReadPayload,
) -> CommandResult<AssetSheet> {
    let conn = db_state.getter();
    AssetService::read(&conn, payload).await
}

#[tauri::command]
pub async fn assets_reads(
    db_state: State<'_, Storage>,
    payload: ReadsPayload,
) -> CommandResult<Vec<AssetSheet>> {
    let conn = db_state.getter();
    AssetService::reads(&conn, payload).await
}

#[tauri::command]
pub async fn assets_insert(
    db_state: State<'_, Storage>,
    payload: InsertPayload,
) -> CommandResult<InsertResponse> {
    let conn = db_state.getter();
    let res = AssetService::insert(&conn, payload, version).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_inserts(
    db_state: State<'_, Storage>,
    payload: Vec<InsertPayload>,
) -> CommandResult<Vec<InsertResponse>> {
    let conn = db_state.getter();
    let res = AssetService::inserts(&conn, payload, &versions).await?;
    let changes: Vec<(String, i64)> = res.iter().map(|r| (r.id.clone(), r.version)).collect();
    Ok(res)
}

#[tauri::command]
pub async fn assets_update(
    db_state: State<'_, Storage>,
    payload: UpdateBody,
) -> CommandResult<InsertResponse> {
    let conn = db_state.getter();
    let res = AssetService::update(&conn, payload, version).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_updates(
    db_state: State<'_, Storage>,
    payload: Vec<UpdateBody>,
) -> CommandResult<Vec<InsertResponse>> {
    let conn = db_state.getter();
    let res = AssetService::updates(&conn, payload, &versions).await?;
    let changes: Vec<(String, i64)> = res.iter().map(|r| (r.id.clone(), r.version)).collect();
    Ok(res)
}

#[tauri::command]
pub async fn assets_remove(
    db_state: State<'_, Storage>,
    payload: RemovePayload,
) -> CommandResult<Vec<String>> {
    let conn = db_state.getter();
    let deleted = AssetService::remove(&conn, payload).await?;

    Ok(deleted)
}

#[tauri::command]
pub async fn assets_removes(
    db_state: State<'_, Storage>,
    payload: RemovePayload,
) -> CommandResult<Vec<String>> {
    let conn = db_state.getter();
    let deleted = AssetService::removes(&conn, payload).await?;

    Ok(deleted)
}
