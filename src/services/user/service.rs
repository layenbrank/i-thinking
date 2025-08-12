use crate::database::DataBase;
use crate::errors::{AppError, AppResult};
use crate::services::user::schema::{CreateUser, UpdateUser, User};
use futures::TryStreamExt;
// use mongodb::;
use mongodb::bson::{DateTime, doc, oid::ObjectId};
pub struct UserService;

impl UserService {
    pub async fn insert(db: &DataBase, req: CreateUser) -> AppResult<User> {
        let existing = db
            .users()
            .find_one(doc! {"username": &req.username})
            .await
            .expect("Failed to query user");
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

        let resp = db
            .users()
            .insert_one(&user)
            .await
            .expect("Failed to insert user");

        let mut inserted = user;

        inserted.id = Some(resp.inserted_id.as_object_id().unwrap());

        Ok(inserted)
    }

    pub async fn find_one(database: &DataBase, id: &str) -> AppResult<User> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| AppError::InvalidInput("Invalid user ID".to_string()))?;

        let user = database
            .users()
            .find_one(doc! {"_id":object_id})
            .await?
            .ok_or(AppError::UserNotFound)?;

        Ok(user)
    }

    pub async fn find_all(database: &DataBase) -> AppResult<Vec<User>> {
        let mut cursor = database.users().find(doc! {}).await?;
        let mut users = Vec::new();

        while let Some(user) = cursor.try_next().await? {
            users.push(user);
        }

        Ok(users)
    }

    pub async fn update(database: &DataBase, id: &str, req: UpdateUser) -> AppResult<User> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| AppError::InvalidInput("Invalid user ID".to_string()))?;

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
            .await?;

        UserService::find_one(database, id).await
    }

    pub async fn remove(database: &DataBase, id: &str) -> AppResult<()> {
        let object_id = ObjectId::parse_str(id)
            .map_err(|_| AppError::InvalidInput("Invalid ObjectId".to_string()))?;

        let result = database.users().delete_one(doc! {"_id": object_id}).await?;

        if result.deleted_count == 0 {
            return Err(AppError::UserNotFound);
        }

        Ok(())
    }
}

// pub struct UsersService {
//     database: Arc<DataBase>,
// }
//  pub fn new(database: Arc<DataBase>) -> Self {
//       Self { database }
//   }
