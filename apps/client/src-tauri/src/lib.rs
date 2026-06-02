pub mod countdown {
    pub mod command;
    // Pure schema / service types come from core; crate::countdown::schema still resolves.
    pub use itc::countdown::schema;
    pub use itc::countdown::service;
}

pub mod through {
    pub mod command;
    pub mod worker;
    pub use command::update_rects;
    pub use itc::through::cursor;
    pub use itc::through::state;
    pub use state::ClickThroughState;
    pub use worker::spawn_worker;
}

pub mod databases {
    pub mod storage;
    // migration module and Connection type come from core.
    pub use itc::databases::Connection;
    pub use itc::databases::migration;
}

pub mod engine {
    pub mod command;
    pub use itc::engine::schema;
    pub use itc::engine::service;
}

pub mod migrations {
    pub use itc::migrations::migrations_v001;
}

pub mod morph {
    pub mod command;
    pub use itc::morph::schema;
    pub use itc::morph::service;
}

pub mod screenshot {
    pub mod command;
    pub mod service;
    // schema structs (CaptureData, CaptureStore, MonitorInfo, etc.) come from core.
    pub use itc::screenshot::schema;
}

pub mod services {
    pub mod asset {
        pub mod command;
        pub use itc::services::asset::schema;
        pub use itc::services::asset::service;
    }

    pub mod mirror {
        pub mod command;
        pub use itc::services::mirror::schema;
        pub use itc::services::mirror::service;
    }

    pub mod application {
        pub mod command;
        pub use itc::services::application::schema;
        pub use itc::services::application::service;
    }
}

pub mod ui {
    pub mod contextmenu;
    pub mod tray;
}

pub mod utils {
    pub mod bootstrap;
    pub mod invoke;
    pub mod pdf;
    // exception and scan come from core; crate::utils::exception / scan still resolve.
    pub use itc::utils::exception;
    pub use itc::utils::scan;
    // pub mod bookmark;
    // pub mod client;
    // pub mod installer;
}
