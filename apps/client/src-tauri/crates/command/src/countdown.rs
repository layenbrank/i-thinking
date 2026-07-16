use tauri::State;
use thinking_core::countdown::Service;
use thinking_core::CommandResult;
use thinking_database::entity::countdown::{Model, Update};
use thinking_database::Storage;

#[tauri::command(rename = "countdown:read")]
pub async fn countdown_read(state: State<'_, Storage>) -> CommandResult<Option<Model>> {
    Service::read(state.connection()).await
}

#[tauri::command(rename = "countdown:upsert")]
pub async fn countdown_upsert(state: State<'_, Storage>, params: Model) -> CommandResult<String> {
    Service::upsert(state.connection(), params).await
}

#[tauri::command(rename = "countdown:update")]
pub async fn countdown_update(state: State<'_, Storage>, params: Update) -> CommandResult<String> {
    Service::update(state.connection(), params).await
}
