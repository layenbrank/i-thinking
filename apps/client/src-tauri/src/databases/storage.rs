use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseConnection, DatabaseTransaction, DbErr,
    Statement, TransactionTrait,
};
use std::sync::Arc;
use tauri::Manager;
use tracing::{error, info};

pub type Connection = Arc<DatabaseConnection>;

pub struct Storage {
    connection: Connection,
    path: String,
}

impl Storage {
    fn new(connection: Connection, path: String) -> Self {
        Self { connection, path }
    }

    fn getter(&self) -> DatabaseConnection {
        (*self.connection).clone()
    }
}
