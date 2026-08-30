pub mod migration;
pub mod migrations;
pub mod storage;

pub mod entity {
    pub mod asset;
    pub mod calendar;
    pub mod countdown;
    pub mod magnetic_tile;
    pub mod mirror;
    pub mod overlay;
    pub mod reminder;

    #[allow(non_snake_case)]
    pub mod aiWorkspace;
    #[allow(non_snake_case)]
    pub mod aiWorkspaceFolder;
    #[allow(non_snake_case)]
    pub mod aiSession;
    #[allow(non_snake_case)]
    pub mod aiMessage;
    #[allow(non_snake_case)]
    pub mod aiProvider;

    pub use asset::Entity as AssetEntity;
    pub use calendar::Entity as CalendarEntity;
    pub use countdown::Entity as CountdownEntity;
    pub use magnetic_tile::Entity as MagneticTileEntity;
    pub use mirror::Entity as MirrorEntity;
    pub use overlay::Entity as OverlayEntity;
    pub use reminder::Entity as ReminderEntity;
    pub use aiWorkspace::Entity as AiWorkspaceEntity;
    pub use aiWorkspaceFolder::Entity as AiWorkspaceFolderEntity;
    pub use aiSession::Entity as AiSessionEntity;
    pub use aiMessage::Entity as AiMessageEntity;
    pub use aiProvider::Entity as AiProviderEntity;
}

pub use storage::{Connection, Storage, database_path, initialize};
