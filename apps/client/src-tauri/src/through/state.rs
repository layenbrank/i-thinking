use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};

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
    /// Hit regions keyed by panel/source id so multiple overlays can coexist.
    pub sources: RwLock<HashMap<String, Vec<Rect>>>,
    /// When true, the overlay window never ignores cursor events (screenshot mode).
    screenshot_mode: AtomicBool,
}

impl ThroughState {
    pub fn new(window_label: impl Into<String>) -> Self {
        Self {
            window_label: window_label.into(),
            sources: RwLock::new(HashMap::new()),
            screenshot_mode: AtomicBool::new(false),
        }
    }

    pub fn is_screenshot_mode(&self) -> bool {
        self.screenshot_mode.load(Ordering::Relaxed)
    }

    pub fn set_screenshot_mode(&self, enabled: bool) {
        self.screenshot_mode.store(enabled, Ordering::Relaxed);
    }
}
