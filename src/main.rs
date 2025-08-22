use actix_cors::Cors;
use actix_web::http::header;
use actix_web::{
    App, HttpRequest, HttpResponse, HttpServer, Responder, get, middleware::Logger, web,
};
use env_logger::Env;
use std::sync::Arc;

mod app;
mod configs;
mod database;
mod middlewares;
mod models;
mod services;
mod utils;

use database::DataBase;
use middlewares::response::ResponseWrapper;

use crate::configs::Config;
use app::AppModule;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();

    let cfg = Config::from_env().expect("Failed to load configuration");

    let database = DataBase::new(&cfg.mongodb_uri)
        .await
        .expect("Failed to connect to database");

    let db = Arc::new(database);

    println!(
        "📝 API Documentation: http://{}:{}/api/v1",
        cfg.host, cfg.port
    );

    env_logger::init_from_env(Env::default().default_filter_or("info"));

    HttpServer::new(move || {
        let cors = Cors::default()
            // .allowed_origin("https://www.rust-lang.org")
            // 或者使用函数来动态判断
            // .allowed_origin_fn(|origin, _req_head| origin.as_bytes().ends_with(b".rust-lang.org"))
            .send_wildcard() // 移除 .allowed_origin("*")，使用 send_wildcard()
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
            .allowed_header(header::CONTENT_TYPE)
            .allow_any_origin()
            .max_age(3600);

        App::new()
            .app_data(web::Data::new(db.clone()))
            .wrap(cors)
            .wrap(ResponseWrapper) // 添加响应包装中间件
            .wrap(Logger::default())
            .wrap(Logger::new("%a %t %r %s %b %{Referer}i %{User-Agent}i %T"))
            .service(index)
            .service(index_html)
            .service(health_check)
            .configure(AppModule::configure)
    })
    .bind((cfg.host.clone(), cfg.port))?
    .run()
    .await
}

#[get("/")]
async fn index() -> impl Responder {
    let html_content = std::fs::read_to_string("index.html")
        .unwrap_or_else(|_| "<h1>Welcome to the Rust Web Service!</h1>".to_string());

    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html_content)
}

#[get("/index.html")]
async fn index_html() -> impl Responder {
    let html_content = std::fs::read_to_string("index.html")
        .unwrap_or_else(|_| "<h1>Welcome to the Rust Web Service!</h1>".to_string());

    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(html_content)
}

/// API 健康检查端点，展示统一响应格式
#[get("/api/health")]
async fn health_check(req: HttpRequest) -> impl Responder {
    use serde_json::json;
    use utils::response::ApiResponse;

    let health_info = json!({
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": chrono::Utc::now().timestamp_millis(),
        "uptime": "N/A"
    });

    let response = ApiResponse::success_with_message(health_info, "Service is running normally");

    response
        .transform()
        .unwrap_or_else(|_| HttpResponse::InternalServerError().json("Failed to generate response"))
}
