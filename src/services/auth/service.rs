use crate::databases::database;
use crate::services::auth::schema::{SigninRequest, SignupRequest};
use actix_web::{
    Handler, HttpMessage, HttpRequest, HttpResponse, HttpResponseBuilder, Result, http::StatusCode,
};
use jsonwebtoken::{DecodingKey, EncodingKey, decode, encode};
use mongodb::bson::doc;

pub struct AuthService;

impl AuthService {
    pub async fn singin(db: &database::Storage, req: SigninRequest) {}

    pub async fn singup(db: &database::Storage, req: SignupRequest) {}
}
