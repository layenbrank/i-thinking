use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayMountPayload {
    pub kind: String,
    #[serde(rename = "magneticTileID")]
    pub magnetic_tile_id: String,
    pub size: Option<i32>,
    pub shape: Option<String>,
    pub direction: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayUnmountPayload {
    #[serde(rename = "magneticTileID")]
    pub magnetic_tile_id: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ShowOverlayPayload {
    #[serde(rename = "magneticTileID")]
    pub magnetic_tile_id: String,
}

#[derive(Default)]
pub struct OverlayPending {
    pub mount: Mutex<Option<OverlayMountPayload>>,
    pub unmount: Mutex<Option<OverlayUnmountPayload>>,
}
