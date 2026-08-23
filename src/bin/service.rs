use std::sync::Arc;

use actix_web::HttpServer;
use service::{
    bootstrap::BootstrapOptions,
    bootstrap_app,
    clients::{elasticsearch::EsClient, redis::RedisPool},
    configures::configure::Configure,
    databases::database::Storage,
    middlewares::rate_limit::build_auth_governor,
    utils,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let configure = Configure::load().expect("Failed to load configuration");

    let _log_guard = utils::logger::init(&configure.logging).expect("Failed to initialize logger");

    tracing::info!(
        profile = %configure.profile,
        config_dir = %configure.config_dir.display(),
        host = %configure.host(),
        port = configure.port(),
        encryption = ?configure.encryption(),
        redis_url = %configure.redis_url(),
        elasticsearch_url = %configure.elasticsearch_url(),
        "configuration loaded"
    );

    let storage = Storage::new(configure.database_uri())
        .await
        .expect("Failed to connect to database");

    let redis = RedisPool::new(configure.redis_url(), configure.redis_pool_size())
        .await
        .expect("Failed to connect to Redis");

    let es = EsClient::new(&configure)
        .await
        .expect("Failed to connect to Elasticsearch");
    service::services::search::repository::ensure_index(&es)
        .await
        .expect("Failed to ensure Elasticsearch index");

    let host = configure.server.host.clone();
    let port = configure.server.port;
    let enable_swagger = configure.app.swagger;
    let store = Arc::new(storage);
    let config = Arc::new(configure);
    let redis = Arc::new(redis);
    let es = Arc::new(es);

    let bootstrap = BootstrapOptions::development(enable_swagger);
    let auth_governor = build_auth_governor(config.as_ref());

    tracing::info!(host = %host, port, enable_swagger, "service starting");
    #[cfg(feature = "openapi")]
    if enable_swagger {
        tracing::info!("Swagger UI: http://{host}:{port}/swagger-ui/");
    }
    #[cfg(not(feature = "openapi"))]
    if enable_swagger {
        tracing::warn!("Swagger 未编译，请使用: cargo run --bin service --features openapi");
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
                bootstrap.clone(),
                auth_governor.clone()
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
            bootstrap.clone(),
            auth_governor.clone()
        )
    })
    .bind((host, port))?
    .run()
    .await
}
