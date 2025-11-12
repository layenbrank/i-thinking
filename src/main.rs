use actix_cors::Cors;
use actix_web::{
    App, HttpRequest, HttpResponse, HttpServer, Responder, get, http::header, web::Data,
};
use core::{
    configures::configure::Configure, databases::database::Storage,
    middlewares::response::ResponseWrapper, services::application::module::ApplicationModule,
    utils,
};
use env_logger::Env;
use std::env;
use std::sync::Arc;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // dotenv::dotenv().ok();
    // dotenv::from_path(
    //   env::home_dir()
    // )

    let env_path = env::home_dir()
        .and_then(|a| Some(a.join("/.corex/.env")))
        .unwrap();
    dotenv::from_path(env_path.as_path()).ok();

    // dotenv::dotenv()

    let configure = Configure::from_env().expect("Failed to load configuration");

    let storage = Storage::new(&configure.mongodb_uri)
        .await
        .expect("Failed to connect to database");

    let store = Arc::new(storage);
    let config = Arc::new(configure.clone());
    let host = config.host.clone();
    let port = config.port;

    println!("📝 API Documentation: http://{}:{}/api/v1", host, port);

    println!("Configuration loaded: {:?}", configure);

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
            .app_data(Data::new(store.clone()))
            .app_data(Data::new(config.clone()))
            .wrap(cors)
            .wrap(ResponseWrapper) // 响应包装中间件（已包含详细的请求/响应日志）
            // 移除重复的 Logger，ResponseWrapper 已提供详细的表格日志
            .service(index)
            .service(index_html)
            .service(health_check)
            .configure(ApplicationModule::configure)
    })
    .bind((host, port))?
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

    let response = ApiResponse::success(health_info, "Service is running normally");

    response
        .transform()
        .unwrap_or_else(|_| HttpResponse::InternalServerError().json("Failed to generate response"))
}
