use serde::Deserialize;
use tokio::sync::RwLock;

/// Interactive rectangle reported by the frontend (CSS / logical pixels from
/// `getBoundingClientRect()`, matching the webview client area origin).
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

pub struct ThroughState {
    pub window_label: String,
    pub rects: RwLock<Vec<Rect>>,
}

impl ThroughState {
    pub fn new(window_label: impl Into<String>) -> Self {
        Self {
            window_label: window_label.into(),
            rects: RwLock::new(Vec::new()),
        }
    }
}
