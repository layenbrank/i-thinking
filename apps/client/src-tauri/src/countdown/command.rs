use tauri::State;

use crate::{
    countdown::{
        schema::{CountdownUpdate, Model},
        service::Service,
    },
    databases::storage::Storage,
    utils::exception::CommandResult,
};

#[tauri::command]
pub async fn countdown_config_read(state: State<'_, Storage>) -> CommandResult<Option<Model>> {
    Service::read(state.connection()).await
}

#[tauri::command]
pub async fn countdown_config_upsert(
    state: State<'_, Storage>,
    params: Model,
) -> CommandResult<String> {
    Service::upsert(state.connection(), params).await
}

#[tauri::command]
pub async fn countdown_config_update(
    state: State<'_, Storage>,
    params: CountdownUpdate,
) -> CommandResult<String> {
    Service::update(state.connection(), params).await
}
