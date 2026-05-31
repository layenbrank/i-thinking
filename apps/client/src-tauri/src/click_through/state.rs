use serde::Deserialize;
use tokio::sync::RwLock;

/// Interactive rectangle reported by the frontend (physical pixels relative
/// to the webview client area, already multiplied by `devicePixelRatio`).
#[derive(Debug, Clone, Copy, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
}

impl Rect {
    pub fn contains(&self, px: i32, py: i32) -> bool {
        px >= self.x && px < self.x + self.w && py >= self.y && py < self.y + self.h
    }
}

pub struct ClickThroughState {
    pub window_label: String,
    pub rects: RwLock<Vec<Rect>>,
}

impl ClickThroughState {
    pub fn new(window_label: impl Into<String>) -> Self {
        Self {
            window_label: window_label.into(),
            rects: RwLock::new(Vec::new()),
        }
    }
}
