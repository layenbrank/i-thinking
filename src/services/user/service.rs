use crate::{
    databases::database::Storage,
    services::user::schema::{CreateUser, UpdateUser, User},
};
use actix_web::{Result, error};
use futures::TryStreamExt;
use mongodb::bson::{DateTime, doc, oid::ObjectId};

pub struct UserService;

impl UserService {
    pub async fn insert(db: &Storage, req: CreateUser) -> Result<User> {
        let existing = db
            .users()
            .find_one(doc! {"username": &req.username})
            .await
            .map_err(|e| error::ErrorInternalServerError(format!("Storage error: {}", e)))?;

        // 如果用户已经存在，直接返回现有用户
        if let Some(existing_user) = existing {
            return Ok(existing_user);
        }

        let now = DateTime::now().timestamp_millis();
        let user = User {
            id: None,
            age: None,
            email: None,
            username: req.username,
            password: req.password,
            created_at: mongodb::bson::DateTime::from_millis(now),
            updated_at: mongodb::bson::DateTime::from_millis(now),
        };

        let resp = db.users().insert_one(&user).await.map_err(|e| {
            error::ErrorInternalServerError(format!("Failed to insert user: {}", e))
        })?;

        let mut inserted = user;
        inserted.id = Some(match resp.inserted_id.as_object_id() {
            Some(id) => id,
            None => {
                return Err(error::ErrorInternalServerError(
                    "Failed to POST-SIGNIN.HTTP inserted ID",
                ));
            }
        });

        Ok(inserted)
    }

    pub async fn find_one(database: &Storage, id: &str) -> Result<User> {
        let object_id =
            ObjectId::parse_str(id).map_err(|_| error::ErrorBadRequest("Invalid user ID"))?;

        let user = database
            .users()
            .find_one(doc! {"_id":object_id})
            .await
            .map_err(|e| error::ErrorInternalServerError(format!("Storage error: {}", e)))?
            .ok_or_else(|| error::ErrorNotFound("User not found"))?;

        Ok(user)
    }

    pub async fn find_all(database: &Storage) -> Result<Vec<User>> {
        let mut cursor = database
            .users()
            .find(doc! {})
            .await
            .map_err(|e| error::ErrorInternalServerError(format!("Storage error: {}", e)))?;

        let mut users = Vec::new();

        while let Some(user) = cursor
            .try_next()
            .await
            .map_err(|e| error::ErrorInternalServerError(format!("Storage error: {}", e)))?
        {
            users.push(user);
        }

        Ok(users)
    }

    pub async fn update(database: &Storage, id: &str, req: UpdateUser) -> Result<User> {
        let object_id =
            ObjectId::parse_str(id).map_err(|_| error::ErrorBadRequest("Invalid user ID"))?;

        let now_millis = chrono::Utc::now().timestamp_millis();
        let mut update_doc = doc! {"updated_at": mongodb::bson::DateTime::from_millis(now_millis)};

        if let Some(username) = req.username {
            update_doc.insert("username", username);
        }
        if let Some(password) = req.password {
            update_doc.insert("password", password);
        }
        if let Some(email) = req.email {
            update_doc.insert("email", email);
        }
        if let Some(age) = req.age {
            update_doc.insert("age", age);
        }

        database
            .users()
            .update_one(doc! {"_id": object_id}, doc! {"$set": update_doc})
            .await
            .map_err(|e| error::ErrorInternalServerError(format!("Storage error: {}", e)))?;

        UserService::find_one(database, id).await
    }

    pub async fn remove(database: &Storage, id: &str) -> Result<()> {
        let object_id =
            ObjectId::parse_str(id).map_err(|_| error::ErrorBadRequest("Invalid ObjectId"))?;

        let result = database
            .users()
            .delete_one(doc! {"_id": object_id})
            .await
            .map_err(|e| error::ErrorInternalServerError(format!("Storage error: {}", e)))?;

        if result.deleted_count == 0 {
            return Err(error::ErrorNotFound("User not found"));
        }

        Ok(())
    }
}
