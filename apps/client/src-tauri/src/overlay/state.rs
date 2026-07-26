use serde::{Deserialize, Serialize};
use tokio::sync::Mutex;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayMountPayload {
    pub kind: String,
    pub application_id: Option<String>,
    pub size: Option<String>,
    pub shape: Option<String>,
    pub direction: Option<String>,
}

#[derive(Default)]
pub struct OverlayPending {
    pub mount: Mutex<Option<OverlayMountPayload>>,
}
