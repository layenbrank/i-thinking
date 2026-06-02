pub mod through {
    pub mod cursor;
    pub mod state;
}

pub mod countdown {
    pub mod schema;
    pub mod service;
}

pub mod databases {
    use sea_orm::DatabaseConnection;
    use std::sync::Arc;

    /// Shared connection alias used by migration and storage modules.
    pub type Connection = Arc<DatabaseConnection>;

    pub mod migration;
}

pub mod engine {
    pub mod schema;
    pub mod service;
}

pub mod migrations {
    pub mod migrations_v001;
}

pub mod morph {
    pub mod schema;
    pub mod service;
}

pub mod screenshot {
    pub mod schema;
}

pub mod services {
    pub mod asset {
        pub mod schema;
        pub mod service;
    }
    pub mod mirror {
        pub mod schema;
        pub mod service;
    }
    pub mod application {
        pub mod schema;
        pub mod service;
    }
}

pub mod utils {
    pub mod exception;
    pub mod scan;
}
