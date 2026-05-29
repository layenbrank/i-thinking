pub mod databases {
    pub mod migration;
    pub mod storage;
}

pub mod engine {
    pub mod command;
    pub mod schema;
    pub mod service;
}

pub mod migrations {
    pub mod migrations_v001;
}

pub mod morph {
    pub mod command;
    pub mod schema;
    pub mod service;
}

pub mod screenshot {
    pub mod command;
    pub mod schema;
    pub mod service;
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
    pub mod exception;
    pub mod image;
    pub mod invoke;
    pub mod pdf;
    pub mod scan;
    pub mod screenshot;
    // pub mod bookmark;
    // pub mod client;
    // pub mod installer;
}
