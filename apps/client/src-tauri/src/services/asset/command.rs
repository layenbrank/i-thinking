use tauri::State;

use crate::databases::storage::Storage;
use crate::services::asset::schema::{InsertP, InsertR, Model, ReadP, ReadsP, RemoveP, UpdateBody};
use crate::services::asset::service::Service;
use crate::utils::exception::CommandResult;

#[tauri::command]
pub async fn assets_read(state: State<'_, Storage>, payload: ReadP) -> CommandResult<Model> {
    let conn = state.getter();
    Service::read(&conn, payload).await
}

#[tauri::command]
pub async fn assets_reads(state: State<'_, Storage>, payload: ReadsP) -> CommandResult<Vec<Model>> {
    let conn = state.getter();
    Service::reads(&conn, payload).await
}

#[tauri::command]
pub async fn assets_insert(state: State<'_, Storage>, payload: InsertP) -> CommandResult<InsertR> {
    let connection = state.getter();
    let res = Service::insert(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_inserts(
    state: State<'_, Storage>,
    payload: Vec<InsertP>,
) -> CommandResult<Vec<InsertR>> {
    let connection = state.getter();
    let res = Service::inserts(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_update(
    state: State<'_, Storage>,
    payload: UpdateBody,
) -> CommandResult<InsertR> {
    let connection = state.getter();
    let res = Service::update(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_updates(
    state: State<'_, Storage>,
    payload: Vec<UpdateBody>,
) -> CommandResult<Vec<InsertR>> {
    let connection = state.getter();
    let res = Service::updates(&connection, payload).await?;
    Ok(res)
}

#[tauri::command]
pub async fn assets_remove(
    state: State<'_, Storage>,
    payload: RemoveP,
) -> CommandResult<Vec<String>> {
    let connection = state.getter();
    let deleted = Service::remove(&connection, payload).await?;

    Ok(deleted)
}

#[tauri::command]
pub async fn assets_removes(
    state: State<'_, Storage>,
    payload: RemoveP,
) -> CommandResult<Vec<String>> {
    let connection = state.getter();
    let deleted = Service::removes(&connection, payload).await?;

    Ok(deleted)
}
