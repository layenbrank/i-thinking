- main.rs

```rust
mod app;
mod modules;
mod database;
mod models;
mod errors;
mod configs;
mod middlewares;

use actix_web::{web, App, HttpServer, middleware::Logger};
use env_logger::Env;
use std::sync::Arc;

use app::app_module::AppModule;
use database::DataBase;
use configs::Config;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    env_logger::init_from_env(Env::default().default_filter_or("info"));

    let cfg = Config::from_env().expect("Failed to load configuration");

    let database = DataBase::new(&cfg.mongodb_uri)
        .await
        .expect("Failed to connect to database");

    let db = Arc::new(database);

    println!("🚀 NestJS-style Server starting on {}:{}", cfg.host, cfg.port);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(db.clone()))
            .wrap(Logger::default())
            .wrap(middlewares::cors_middleware())
            .configure(AppModule::configure) // 根模块配置
    })
    .bind((cfg.host.clone(), cfg.port))?
    .run()
    .await
}
```

- app.module.rs

```rust
pub mod users {
    pub mod controllers {
        pub mod user_controller;
    }
    pub mod services {
        pub mod user_service;
    }
    pub mod dto {
        pub mod create_user_dto;
        pub mod update_user_dto;
    }
    pub mod entities {
        pub mod user;
    }
    pub mod user_module;
}

pub mod health {
    pub mod controllers {
        pub mod health_controller;
    }
    pub mod health_module;
}

pub mod user {
    pub mod user_controller;
    pub mod user_module;
    pub mod user_service;
}
```

- user.module.rs

```rust
use actix_web::web;
use crate::modules::users::users_controller::UsersController;

pub struct UsersModule;

impl UsersModule {
    pub fn configure(cfg: &mut web::ServiceConfig) {
        cfg.service(
            web::scope("/users")
                .route("", web::get().to(UsersController::find_all))
                .route("", web::post().to(UsersController::create))
                .route("/{id}", web::get().to(UsersController::find_one))
                .route("/{id}", web::put().to(UsersController::update))
                .route("/{id}", web::delete().to(UsersController::remove))
        );
    }
}
```
