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
    pub mod aiCollection;
    #[allow(non_snake_case)]
    pub mod aiSession;
    #[allow(non_snake_case)]
    pub mod aiMessage;

    pub use asset::Entity as AssetEntity;
    pub use calendar::Entity as CalendarEntity;
    pub use countdown::Entity as CountdownEntity;
    pub use magnetic_tile::Entity as MagneticTileEntity;
    pub use mirror::Entity as MirrorEntity;
    pub use overlay::Entity as OverlayEntity;
    pub use reminder::Entity as ReminderEntity;
    pub use aiCollection::Entity as AiCollectionEntity;
    pub use aiSession::Entity as AiSessionEntity;
    pub use aiMessage::Entity as AiMessageEntity;
}

pub use storage::{Connection, Storage, database_path, initialize};
