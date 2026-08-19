#![allow(non_snake_case)]

pub mod bootstrap {
    pub mod module;
    pub mod static_assets;
    pub mod system;

    #[cfg(feature = "openapi")]
    pub mod swagger;

    pub use module::{BootstrapModule, BootstrapOptions};
    pub use static_assets::{IndexFileConfig, StaticAssetsConfig, StaticMount};
}

/// 构建基础 Actix App（须在 `HttpServer::new` 闭包内展开，以保证类型推断）
#[macro_export]
macro_rules! bootstrap_app {
    ($store:expr, $config:expr, $bootstrap:expr) => {{
        use actix_cors::Cors;
        use actix_web::{App, http::header, web::Data};
        use $crate::middlewares::response::ResponseWrapper;
        use $crate::services::application::module::ApplicationModule;

        let cors = Cors::default()
            .send_wildcard()
            .allowed_methods(vec!["GET", "POST", "PUT", "DELETE", "OPTIONS"])
            .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
            .allowed_header(header::CONTENT_TYPE)
            .allow_any_origin()
            .max_age(3600);

        App::new()
            .app_data(Data::new($store))
            .app_data(Data::new($config))
            .wrap(cors)
            .wrap(ResponseWrapper)
            .configure(|cfg| $crate::bootstrap::BootstrapModule::configure(cfg, &$bootstrap))
            .configure(ApplicationModule::configure)
    }};
}

pub mod databases {
    pub mod database;
}

pub mod configures {
    pub mod configure;
}

pub mod middlewares {
    pub mod cors;
    pub mod jwt;
    pub mod response;
}

pub mod utils {
    pub mod db;
    pub mod encryption;
    pub mod generate;
    pub mod jwt;
    pub mod logger;
    pub mod response;
    pub mod timestamp;
}

pub mod services {
    pub mod application {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod markdown {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod engine {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod user {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod auth {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod upload {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }
}

pub mod oas;
