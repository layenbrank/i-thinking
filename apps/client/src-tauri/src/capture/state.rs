use tokio::sync::Mutex;

use crate::capture::schema::ScreenshotResult;

#[derive(Default)]
pub struct CapturePending {
    pub screenshot: Mutex<Option<ScreenshotResult>>,
}
