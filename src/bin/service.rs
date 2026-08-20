use actix_web::HttpServer;
use service::{
    bootstrap::BootstrapOptions,
    bootstrap_app,
    clients::{elasticsearch::EsClient, redis::RedisPool},
    configures::configure::Configure,
    databases::database::Storage,
    utils,
};
use std::{env, sync::Arc};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let env_loaded = std::env::current_exe()
        .ok()
        .and_then(|exe_path| exe_path.parent().map(|p| p.join(".env")))
        .filter(|p| p.exists())
        .and_then(|p| dotenv::from_path(p.as_path()).ok())
        .is_some()
        || dotenv::dotenv().is_ok()
        || env::home_dir()
            .map(|home| home.join(".corex").join(".env"))
            .filter(|p| p.exists())
            .and_then(|p| dotenv::from_path(p.as_path()).ok())
            .is_some();

    if !env_loaded {
        eprintln!("警告: 未找到 .env 文件，将使用默认值");
    }

    let _log_guard = utils::logger::init().expect("Failed to initialize logger");

    let configure = Configure::from_env().expect("Failed to load configuration");

    tracing::info!(
        host = %configure.host,
        port = configure.port,
        encryption = ?configure.encryption,
        redis_url = %configure.redis_url,
        elasticsearch_url = %configure.elasticsearch_url,
        "configuration loaded"
    );

    let storage = Storage::new(&configure.database_uri)
        .await
        .expect("Failed to connect to database");

    let redis = RedisPool::new(&configure.redis_url, configure.redis_pool_size)
        .await
        .expect("Failed to connect to Redis");

    let es = EsClient::new(&configure)
        .await
        .expect("Failed to connect to Elasticsearch");

    let store = Arc::new(storage);
    let config = Arc::new(configure.clone());
    let redis = Arc::new(redis);
    let es = Arc::new(es);
    let host = config.host.clone();
    let port = config.port;

    let enable_swagger = env::var("ENABLE_SWAGGER")
        .map(|v| v == "true" || v == "1")
        .unwrap_or(cfg!(debug_assertions));

    let bootstrap = BootstrapOptions::development(enable_swagger);

    tracing::info!(host = %host, port, enable_swagger, "service starting");
    #[cfg(feature = "openapi")]
    if enable_swagger {
        tracing::info!("Swagger UI: http://{host}:{port}/swagger-ui/");
    }
    #[cfg(not(feature = "openapi"))]
    if enable_swagger {
        tracing::warn!(
            "Swagger 未编译，请使用: cargo run --bin service --features openapi"
        );
    }

    #[cfg(feature = "openapi")]
    if enable_swagger {
        use service::bootstrap::swagger;
        use service::oas::OpenDoc;
        use utoipa::OpenApi;
        use utoipa_swagger_ui::SwaggerUi;

        return HttpServer::new(move || {
            bootstrap_app!(
                store.clone(),
                config.clone(),
                redis.clone(),
                es.clone(),
                bootstrap.clone()
            )
            .service(swagger::redirect_to_ui)
            .service(
                SwaggerUi::new("/swagger-ui/{_:.*}")
                    .url("/api-docs/openapi.json", OpenDoc::openapi()),
            )
        })
        .bind((host, port))?
        .run()
        .await;
    }

    HttpServer::new(move || {
        bootstrap_app!(
            store.clone(),
            config.clone(),
            redis.clone(),
            es.clone(),
            bootstrap.clone()
        )
    })
    .bind((host, port))?
    .run()
    .await
}
