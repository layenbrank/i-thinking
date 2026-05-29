use std::{fs, path::PathBuf, sync::Arc};

use base64::Engine;
use image::{
    ImageEncoder, ImageFormat, ImageReader, RgbaImage,
    codecs::png::{CompressionType, FilterType, PngEncoder},
    imageops,
};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager, image::Image};
use tauri_plugin_clipboard_manager::ClipboardExt;
use uuid::Uuid;
use xcap::{Monitor, Window};

use crate::screenshot::schema::{
    CaptureData, CaptureStore, MonitorInfo, PinImageStore, PinPrepareResult, WindowInfo,
};

/// 截取主显示器：返回显示器列表 + 截图 RGBA 存入内存缓存
/// BMP 写盘由调用方异步处理，不阻塞显示流程
pub fn capture(app: &AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;

    let infos: Vec<MonitorInfo> = monitors.iter().filter_map(to_monitor_info).collect();

    // 选择主显示器，否则第一个
    let target = monitors
        .iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .or_else(|| monitors.first())
        .ok_or_else(|| "没有找到可用显示器".to_string())?;

    let image = target.capture_image().map_err(|e| e.to_string())?;

    // 预编码 BMP 字节（capture:// 协议 + save_bmp_to_disk 直接使用）
    let image_arc = Arc::new(image);
    let mut buf = Vec::new();
    image_arc
        .write_to(&mut std::io::Cursor::new(&mut buf), ImageFormat::Bmp)
        .map_err(|e| format!("截图 BMP 编码失败: {e}"))?;

    // 原子写入缓存：单 Mutex 保证 rgba 与 bmp_bytes 一致性
    let store = app.state::<CaptureStore>();
    let mut guard = store.0.lock().map_err(|e| format!("缓存锁异常: {e}"))?;
    *guard = Some(CaptureData {
        rgba: image_arc,
        bmp_bytes: Arc::new(buf),
    });

    Ok(infos)
}

/// 从 CaptureStore 读取预编码的 BMP 字节（capture:// 协议使用，Arc clone 零拷贝）
pub fn capture_to_bmp_bytes(app: &AppHandle) -> Result<Arc<Vec<u8>>, String> {
    let store = app.state::<CaptureStore>();
    let guard = store.0.lock().map_err(|e| format!("缓存锁异常: {e}"))?;
    guard
        .as_ref()
        .map(|d| Arc::clone(&d.bmp_bytes))
        .ok_or_else(|| "没有缓存的 BMP 数据".to_string())
}

/// 将内存中的截图写入 BMP 文件（从预编码缓存直接写盘）
pub fn save_bmp_to_disk(app: &AppHandle) -> Result<PathBuf, String> {
    let store = app.state::<CaptureStore>();
    let bmp_data = {
        let guard = store.0.lock().map_err(|e| format!("缓存锁异常: {e}"))?;
        guard
            .as_ref()
            .map(|d| Arc::clone(&d.bmp_bytes))
            .ok_or("没有缓存的 BMP 数据")?
    };

    let cache_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("screenshots");
    fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

    // 清理旧的 capture_*.bmp 临时文件（保留最近 3 个）
    if let Ok(entries) = fs::read_dir(&cache_dir) {
        let mut bmps: Vec<_> = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.file_name()
                    .to_str()
                    .is_some_and(|n| n.starts_with("capture_") && n.ends_with(".bmp"))
            })
            .collect();
        if bmps.len() > 2 {
            bmps.sort_by_key(|e| e.file_name());
            for old in &bmps[..bmps.len() - 2] {
                let _ = fs::remove_file(old.path());
            }
        }
    }

    // 带时间戳的唯一文件名，避免并发覆盖，也为多显示器扩展预留空间
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let path = cache_dir.join(format!("capture_{ts}.bmp"));
    fs::write(&path, bmp_data.as_ref()).map_err(|e| e.to_string())?;

    Ok(path)
}

/// RGBA → PNG（快速压缩，比默认快 3-5 倍）
fn encode_png_fast(rgba: &RgbaImage) -> Result<Vec<u8>, String> {
    let (w, h) = rgba.dimensions();
    let mut buf = Vec::with_capacity((w as usize) * (h as usize) * 2);
    PngEncoder::new_with_quality(&mut buf, CompressionType::Fast, FilterType::Sub)
        .write_image(rgba.as_raw(), w, h, image::ExtendedColorType::Rgba8)
        .map_err(|e| e.to_string())?;
    Ok(buf)
}

/// 裁剪截图并保存为文件，返回文件路径
pub fn crop_and_save(
    app: &AppHandle,
    source_path: &str,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    final_image_base64: Option<&str>,
) -> Result<PathBuf, String> {
    let save_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("screenshots");
    fs::create_dir_all(&save_dir).map_err(|e| e.to_string())?;

    let timestamp = chrono::Local::now().format("%Y%m%d%H%M%S");

    if let Some(base64_data) = final_image_base64 {
        // 前端已合成标注层，直接保存
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| format!("base64 解码失败: {}", e))?;
        let hash = short_hash(&bytes);
        let filename = format!("screenshot-{}_{}.png", timestamp, hash);
        let save_path = save_dir.join(&filename);
        fs::write(&save_path, &bytes).map_err(|e| e.to_string())?;
        Ok(save_path)
    } else {
        // 纯裁剪，使用快速 PNG 压缩
        let cropped = crop_source(app, source_path, x, y, w, h)?;
        let png_bytes = encode_png_fast(&cropped)?;
        let hash = short_hash(&png_bytes);
        let filename = format!("screenshot-{}_{}.png", timestamp, hash);
        let save_path = save_dir.join(&filename);
        fs::write(&save_path, &png_bytes).map_err(|e| e.to_string())?;
        Ok(save_path)
    }
}

/// 从内存缓存或磁盘加载源图后裁剪，返回 RGBA
fn crop_source(
    app: &AppHandle,
    source_path: &str,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
) -> Result<RgbaImage, String> {
    // 优先从内存缓存裁剪（跳过磁盘 I/O + BMP 解码）
    let store = app.state::<CaptureStore>();
    if let Ok(guard) = store.0.lock() {
        if let Some(ref data) = *guard {
            let sub = imageops::crop_imm(data.rgba.as_ref(), x, y, w, h);
            return Ok(sub.to_image());
        }
    }
    // 回退：从磁盘读取
    let img = ImageReader::open(source_path)
        .map_err(|e| format!("打开源图失败: {}", e))?
        .decode()
        .map_err(|e| format!("解码图片失败: {}", e))?;
    Ok(img.crop_imm(x, y, w, h).to_rgba8())
}

/// 裁剪后直接返回 RGBA 像素 + 尺寸（用于剪贴板，跳过 PNG 编解码往返）
pub fn crop_to_rgba(
    app: &AppHandle,
    source_path: &str,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
    final_image_base64: Option<&str>,
) -> Result<(Vec<u8>, u32, u32), String> {
    if let Some(base64_data) = final_image_base64 {
        // 前端已合成 PNG，解码为 RGBA
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(base64_data)
            .map_err(|e| format!("base64 解码失败: {}", e))?;
        let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
        let rgba = img.to_rgba8();
        let (rw, rh) = rgba.dimensions();
        Ok((rgba.into_raw(), rw, rh))
    } else {
        let cropped = crop_source(app, source_path, x, y, w, h)?;
        let (cw, ch) = cropped.dimensions();
        Ok((cropped.into_raw(), cw, ch))
    }
}

/// 将 RGBA 像素直接写入系统剪贴板（无需 PNG 编解码往返）
pub fn copy_image_to_clipboard(
    app: &AppHandle,
    rgba: Vec<u8>,
    w: u32,
    h: u32,
) -> Result<(), String> {
    let tauri_image = Image::new_owned(rgba, w, h);

    app.clipboard()
        .write_image(&tauri_image)
        .map_err(|e| format!("写入剪贴板失败: {}", e))?;

    Ok(())
}

/// 为贴图窗口准备数据：生成 label、存储图片路径，由前端创建实际窗口
pub fn prepare_pin(
    app: &AppHandle,
    image_path: &str,
    width: u32,
    height: u32,
) -> Result<PinPrepareResult, String> {
    let label = format!("pin-{}", Uuid::new_v4());

    // 将图片路径存入 managed state，前端 mount 后主动查询
    let store = app.state::<PinImageStore>();
    store
        .0
        .lock()
        .map_err(|e| format!("锁定 PinImageStore 失败: {}", e))?
        .insert(label.clone(), image_path.to_string());

    // 限制贴图窗口大小不超过屏幕的80%
    let w = width.min(1600);
    let h = height.min(900);

    Ok(PinPrepareResult {
        label,
        width: w,
        height: h,
    })
}

/// 枚举系统中所有可见窗口（过滤最小化和自身）
pub fn windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| e.to_string())?;

    let infos: Vec<WindowInfo> = windows
        .into_iter()
        .filter_map(|w| {
            let title = w.title().ok().unwrap_or_default();
            let app_name = w.app_name().ok().unwrap_or_default();
            let is_minimized = w.is_minimized().ok().unwrap_or(false);
            let x = w.x().ok()?;
            let y = w.y().ok()?;
            let width = w.width().ok()?;
            let height = w.height().ok()?;

            // 过滤：最小化、零面积、自身截图窗口
            if is_minimized || width < 10 || height < 10 {
                return None;
            }
            if title == "Screenshot" || app_name.contains("i-thinking") {
                return None;
            }
            // 过滤空标题窗口（通常是系统内部窗口）
            if title.is_empty() {
                return None;
            }

            Some(WindowInfo {
                id: w.id().ok()?,
                title,
                app_name,
                x,
                y,
                width,
                height,
                is_minimized,
            })
        })
        .collect();

    Ok(infos)
}

/// 将 xcap Monitor 转换为 MonitorInfo
fn to_monitor_info(m: &Monitor) -> Option<MonitorInfo> {
    Some(MonitorInfo {
        id: m.id().ok()?,
        name: m.friendly_name().unwrap_or_else(|_| {
            m.name().unwrap_or_else(|_| {
                m.id()
                    .map(|id| format!("Monitor-{}", id))
                    .unwrap_or_else(|_| "Unknown".into())
            })
        }),
        x: m.x().ok()?,
        y: m.y().ok()?,
        width: m.width().ok()?,
        height: m.height().ok()?,
        is_primary: m.is_primary().unwrap_or(false),
    })
}

/// SHA-256 前 8 位 hex
fn short_hash(data: &[u8]) -> String {
    let digest = Sha256::digest(data);
    digest
        .iter()
        .take(4)
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}
