use serde::Serialize;

/// 截图选区可吸附的窗口矩形（overlay 局部逻辑像素）
#[derive(Debug, Serialize, Clone)]
pub struct CaptureRegion {
    pub x: f64,
    pub y: f64,
    pub w: f64,
    pub h: f64,
}

/// 截图结果（对齐 features/capture 前端契约）
#[derive(Debug, Serialize, Clone)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
    #[serde(default)]
    pub regions: Vec<CaptureRegion>,
}
