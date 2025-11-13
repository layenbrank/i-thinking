use crate::services::{auth, markdown, upload, user};
use anyhow::Result;
use mongodb::{Client, Collection, Database};

#[derive(Clone)]
pub struct Storage {
    pub client: Client,
    pub database: Database,
}

impl Storage {
    pub async fn new(uri: &str) -> Result<Self> {
        let client = Client::with_uri_str(uri).await?;
        let database = client.database("layen");

        client
            .database("admin")
            .run_command(mongodb::bson::doc! {
                "ping": 1
            })
            .await?;

        Ok(Storage { client, database })
    }

    pub fn users(&self) -> Collection<user::schema::User> {
        self.database.collection("users")
    }

    pub fn uploads(&self) -> Collection<upload::schema::Upload> {
        self.database.collection("uploads")
    }

    pub fn auth(&self) -> Collection<auth::schema::AuthUser> {
        self.database.collection("auth")
    }

    pub fn markdown(&self) -> Collection<markdown::schema::MarkdownSchema> {
        self.database.collection("markdown")
    }
}
