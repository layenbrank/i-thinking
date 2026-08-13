use serde::Serialize;

/// 截图结果（对齐 features/capture 前端契约）
#[derive(Debug, Serialize, Clone)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
}
