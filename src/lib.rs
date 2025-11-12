pub mod databases {
    pub mod database;
}

pub mod configures {
    pub mod configure;
}

pub mod middlewares {
    pub mod cors;
    pub mod response;
}

pub mod utils {
    pub mod encryption;
    pub mod generate;
    pub mod jwt;
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
