use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayMountPayload {
    pub kind: String,
    #[serde(rename = "magneticTileID")]
    pub magnetic_tile_id: String,
    pub size: Option<i32>,
    pub shape: Option<String>,
    pub direction: Option<String>,
    #[serde(default)]
    pub round: Option<String>,
    #[serde(default)]
    pub background: Option<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct OverlayUnmountPayload {
    #[serde(rename = "magneticTileID")]
    pub magnetic_tile_id: String,
}

#[derive(Default)]
pub struct OverlayPending {
    pub mount: Mutex<Option<OverlayMountPayload>>,
    pub unmount: Mutex<Option<OverlayUnmountPayload>>,
}
