pub mod ipc;

pub mod through {
    pub mod command;
    pub mod cursor;
    pub mod state;
    pub mod worker;
    pub use command::{update_rects, update_through_rects};
    pub use state::ThroughState;
    pub use worker::spawn_worker;
}

pub mod overlay {
    pub mod command;
    pub mod state;
    pub use state::OverlayPending;
}

pub mod databases {
    pub mod migration;
    pub mod storage;
    pub use storage::Connection;
}

pub mod migrations {
    pub mod migrations_v001;
}

pub mod countdown {
    pub mod command;
    pub mod schema;
    pub mod service;
}

pub mod screenshot {
    pub mod command;
    pub mod schema;
}

pub mod services {
    pub mod asset {
        pub mod command;
        pub mod schema;
        pub mod service;
    }

    pub mod mirror {
        pub mod command;
        pub mod schema;
        pub mod service;
    }

    pub mod application {
        pub mod command;
        pub mod schema;
        pub mod service;
    }
}

pub mod ui {
    pub mod contextmenu;
    pub mod tray;
}

pub mod utils {
    pub mod bootstrap;
    pub mod corex;
    pub mod exception;
    pub mod invoke;
}
