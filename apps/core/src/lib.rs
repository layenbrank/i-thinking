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
    ($store:expr, $config:expr, $redis:expr, $es:expr, $bootstrap:expr, $auth_governor:expr) => {{
        use actix_web::{App, web::Data};
        use $crate::middlewares::access_log::AccessLog;
        use $crate::middlewares::cors::cors;

        App::new()
            .app_data(Data::new($store))
            .app_data(Data::new($config))
            .app_data(Data::new($redis))
            .app_data(Data::new($es))
            .wrap(cors($config.as_ref()))
            .wrap(AccessLog)
            .configure(|cfg| $crate::bootstrap::BootstrapModule::configure(cfg, &$bootstrap))
            .configure(|cfg| {
                $crate::services::application::module::ApplicationModule::configure(
                    cfg,
                    $auth_governor.clone(),
                )
            })
    }};
}

pub mod clients {
    pub mod aliyun_gateway;
    pub mod elasticsearch;
    pub mod gocaptcha;
    pub mod redis;
}

pub mod databases {
    pub mod database;
}

pub extern crate configures;

pub mod middlewares {
    //! HTTP 层 wrap（Nest Middleware 角色）：CORS、访问日志、限流。
    pub mod access_log;
    pub mod cors;
    pub mod rate_limit;
}

/// 鉴权守卫（Nest Guard 角色）：能否进入受保护 Handler。
pub mod guards {
    pub mod auth;
    pub mod blacklist;
    pub mod permission;
    pub mod public;
}

/// 异常响应信封（Nest Filter 角色）
pub mod filters {
    pub mod exception;
    pub use exception::Exception;
}

/// 成功响应信封（Nest Interceptor 角色）
pub mod interceptors {
    pub mod envelope;
    pub use envelope::{Envelope, Paginated};
}

pub mod utils {
    pub mod client_ip;
    pub mod code;
    pub mod db;
    pub mod encryption;
    pub mod generate;
    pub mod jwt;
    pub mod logger;
    pub mod timestamp;
    pub mod token;
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

    pub mod search {
        pub mod controller;
        pub mod module;
        pub mod repository;
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
        pub mod captcha;
        pub mod controller;
        pub mod module;
        pub mod otp;
        pub mod schema;
        pub mod service;
    }

    pub mod upload {
        pub mod controller;
        pub mod error;
        pub mod module;
        pub mod multipart;
        pub mod repository;
        pub mod schema;
        pub mod service;
        pub mod storage;
        pub mod validation;
    }

    pub mod tenant {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod gateway {
        pub mod client;
        pub mod controller;
        pub mod module;
        pub mod quota;
        pub mod repository;
        pub mod schema;
        pub mod service;
    }

    pub mod sso {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod subscription {
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }

    pub mod payment {
        pub mod channel;
        pub mod controller;
        pub mod module;
        pub mod schema;
        pub mod service;
    }
}

pub mod oas;
