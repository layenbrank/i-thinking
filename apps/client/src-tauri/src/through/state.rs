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
    /// Hit regions keyed by widget/source id so multiple overlays can coexist.
    pub sources: RwLock<HashMap<String, Vec<Rect>>>,
    /// When true, the overlay window never ignores cursor events (capture mode).
    capture_mode: AtomicBool,
}

impl ThroughState {
    pub fn new(window_label: impl Into<String>) -> Self {
        Self {
            window_label: window_label.into(),
            sources: RwLock::new(HashMap::new()),
            capture_mode: AtomicBool::new(false),
        }
    }

    pub fn is_capture_mode(&self) -> bool {
        self.capture_mode.load(Ordering::Relaxed)
    }

    pub fn set_capture_mode(&self, enabled: bool) {
        self.capture_mode.store(enabled, Ordering::Relaxed);
    }
}
