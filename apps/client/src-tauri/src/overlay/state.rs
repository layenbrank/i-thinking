use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayMountPayload {
    pub kind: String,
    #[serde(rename = "magneticTileID")]
    pub magnetic_tile_id: Option<String>,
    pub size: Option<String>,
    pub shape: Option<String>,
    pub direction: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayUnmountPayload {
    pub kind: String,
}

#[derive(Default)]
pub struct OverlayPending {
    pub mount: Mutex<Option<OverlayMountPayload>>,
    pub unmount: Mutex<Option<OverlayUnmountPayload>>,
}
