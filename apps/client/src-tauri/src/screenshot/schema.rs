use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use image::RgbaImage;
use serde::Serialize;

/// 截图就绪事件 payload（仅携带显示器信息，图片从 capture:// 协议获取）
#[derive(Serialize, Clone)]
pub struct CaptureResult {
    pub monitors: Vec<MonitorInfo>,
}

/// 显示器信息
#[derive(Serialize, Clone)]
pub struct MonitorInfo {
    pub id: u32,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

/// 裁剪区域
#[derive(serde::Deserialize, Clone)]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub w: u32,
    pub h: u32,
}

/// 窗口信息
#[derive(Serialize, Clone)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_minimized: bool,
}

/// 单次截图的完整缓存（RGBA + 预编码 BMP），由单个 Mutex 保护一致性
pub struct CaptureData {
    pub rgba: Arc<RgbaImage>,
    pub bmp_bytes: Arc<Vec<u8>>,
}

/// 存储每个 pin 窗口对应的图片路径，供前端查询
pub struct PinImageStore(pub Mutex<HashMap<String, String>>);

pub struct CaptureStore(pub Mutex<Option<CaptureData>>);

#[derive(serde::Serialize)]
pub struct PinPrepareResult {
    pub label: String,
    pub width: u32,
    pub height: u32,
}
