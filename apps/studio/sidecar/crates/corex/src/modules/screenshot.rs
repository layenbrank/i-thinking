use std::fs::File;
use std::io::BufWriter;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

use gif::{Encoder, Frame as GifFrame, Repeat};
use serde_json::{json, Value};
use xcap::Monitor;

use crate::module::CorexModule;

const MAX_RECORD_FRAMES: usize = 90;
const FRAME_SAMPLE_EVERY: usize = 2;
const GIF_WIDTH_MAX: u32 = 960;

struct CapturedFrame {
    width: u32,
    height: u32,
    raw: Vec<u8>,
}

pub struct ScreenshotModule {
    monitor: Option<Monitor>,
    recorder: Option<xcap::VideoRecorder>,
    is_recording: Arc<AtomicBool>,
    frames: Arc<Mutex<Vec<CapturedFrame>>>,
    record_started_at: Option<Instant>,
}

impl ScreenshotModule {
    pub fn new() -> Self {
        Self {
            monitor: None,
            recorder: None,
            is_recording: Arc::new(AtomicBool::new(false)),
            frames: Arc::new(Mutex::new(Vec::new())),
            record_started_at: None,
        }
    }

    fn find_primary_monitor() -> Result<Monitor, String> {
        let monitors = Monitor::all().map_err(|err| format!("enumerate monitors: {err}"))?;
        if monitors.is_empty() {
            return Err("no monitor found".to_string());
        }
        for monitor in &monitors {
            if monitor.is_primary().unwrap_or(false) {
                return Ok(monitor.clone());
            }
        }
        Ok(monitors.into_iter().next().expect("monitors non-empty"))
    }

    fn require_monitor(&self) -> Result<&Monitor, String> {
        self.monitor
            .as_ref()
            .ok_or_else(|| "screenshot module not warmed".to_string())
    }

    fn require_recorder(&self) -> Result<&xcap::VideoRecorder, String> {
        self.recorder
            .as_ref()
            .ok_or_else(|| "video recorder not warmed".to_string())
    }

    fn capture(&self, params: Value) -> Result<Value, String> {
        let output = find_output_path(&params)?;
        ensure_parent_dir(&output)?;

        let monitor = self.require_monitor()?;
        let image = monitor
            .capture_image()
            .map_err(|err| format!("capture failed: {err}"))?;

        image
            .save(&output)
            .map_err(|err| format!("save failed: {err}"))?;

        Ok(json!({
            "path": output.to_string_lossy(),
            "width": image.width(),
            "height": image.height(),
        }))
    }

    fn record_start(&mut self) -> Result<Value, String> {
        if self.is_recording.load(Ordering::SeqCst) {
            return Err("recording already started".to_string());
        }

        {
            let mut frames = self
                .frames
                .lock()
                .map_err(|_| "frames lock poisoned".to_string())?;
            frames.clear();
        }

        let recorder = self.require_recorder()?;
        recorder
            .start()
            .map_err(|err| format!("record start failed: {err}"))?;
        self.is_recording.store(true, Ordering::SeqCst);
        self.record_started_at = Some(Instant::now());
        Ok(json!({}))
    }

    fn record_stop(&mut self, params: Value) -> Result<Value, String> {
        if !self.is_recording.load(Ordering::SeqCst) {
            return Err("recording not started".to_string());
        }

        let output = find_output_path(&params)?;
        ensure_parent_dir(&output)?;

        let recorder = self.require_recorder()?;
        recorder
            .stop()
            .map_err(|err| format!("record stop failed: {err}"))?;
        self.is_recording.store(false, Ordering::SeqCst);

        // Allow in-flight frames to settle.
        thread::sleep(Duration::from_millis(80));

        let frames = {
            let mut guard = self
                .frames
                .lock()
                .map_err(|_| "frames lock poisoned".to_string())?;
            std::mem::take(&mut *guard)
        };

        if frames.is_empty() {
            return Err("no frames captured".to_string());
        }

        let frame_count = frames.len();
        let duration_ms = self
            .record_started_at
            .take()
            .map(|started| started.elapsed().as_millis() as u64)
            .unwrap_or(0);

        encode_gif(&frames, &output, duration_ms)?;

        Ok(json!({
            "path": output.to_string_lossy(),
            "frameCount": frame_count,
            "durationMs": duration_ms,
        }))
    }
}

impl CorexModule for ScreenshotModule {
    fn name(&self) -> &'static str {
        "screenshot"
    }

    fn warm(&mut self) -> Result<(), String> {
        let monitor = Self::find_primary_monitor()?;
        let (recorder, rx) = monitor
            .video_recorder()
            .map_err(|err| format!("video_recorder: {err}"))?;

        let is_recording = Arc::clone(&self.is_recording);
        let frames = Arc::clone(&self.frames);

        thread::spawn(move || {
            let mut sample_index = 0usize;
            while let Ok(frame) = rx.recv() {
                if !is_recording.load(Ordering::SeqCst) {
                    continue;
                }
                sample_index = sample_index.wrapping_add(1);
                if sample_index % FRAME_SAMPLE_EVERY != 0 {
                    continue;
                }
                let Ok(mut guard) = frames.lock() else {
                    continue;
                };
                if guard.len() >= MAX_RECORD_FRAMES {
                    continue;
                }
                guard.push(CapturedFrame {
                    width: frame.width,
                    height: frame.height,
                    raw: frame.raw,
                });
            }
        });

        self.monitor = Some(monitor);
        self.recorder = Some(recorder);
        Ok(())
    }

    fn handle(&mut self, action: &str, params: Value) -> Result<Value, String> {
        match action {
            "capture" => self.capture(params),
            "recordStart" => self.record_start(),
            "recordStop" => self.record_stop(params),
            other => Err(format!("unknown action: {other}")),
        }
    }
}

fn find_output_path(params: &Value) -> Result<PathBuf, String> {
    let output = params
        .get("output")
        .and_then(Value::as_str)
        .ok_or_else(|| "params.output is required".to_string())?;
    if output.is_empty() {
        return Err("params.output is empty".to_string());
    }
    Ok(PathBuf::from(output))
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|err| format!("create parent dir failed: {err}"))?;
        }
    }
    Ok(())
}

fn encode_gif(frames: &[CapturedFrame], output: &Path, duration_ms: u64) -> Result<(), String> {
    let first = frames.first().ok_or_else(|| "no frames".to_string())?;
    let (out_w, out_h, scale) = find_gif_size(first.width, first.height);

    let file = File::create(output).map_err(|err| format!("create gif failed: {err}"))?;
    let mut encoder = Encoder::new(BufWriter::new(file), out_w as u16, out_h as u16, &[])
        .map_err(|err| format!("gif encoder: {err}"))?;
    encoder
        .set_repeat(Repeat::Infinite)
        .map_err(|err| format!("gif repeat: {err}"))?;

    let delay_cs = find_frame_delay_cs(duration_ms, frames.len());

    for frame in frames {
        let mut rgba = scale_rgba(&frame.raw, frame.width, frame.height, out_w, out_h, scale);
        let mut gif_frame =
            GifFrame::from_rgba_speed(out_w as u16, out_h as u16, &mut rgba, 10);
        gif_frame.delay = delay_cs;
        encoder
            .write_frame(&gif_frame)
            .map_err(|err| format!("gif write: {err}"))?;
    }

    Ok(())
}

fn find_gif_size(width: u32, height: u32) -> (u32, u32, f32) {
    if width <= GIF_WIDTH_MAX {
        return (width, height, 1.0);
    }
    let scale = GIF_WIDTH_MAX as f32 / width as f32;
    let out_w = GIF_WIDTH_MAX;
    let out_h = ((height as f32) * scale).round().max(1.0) as u32;
    (out_w, out_h, scale)
}

fn find_frame_delay_cs(duration_ms: u64, frame_count: usize) -> u16 {
    if frame_count == 0 {
        return 10;
    }
    let per_ms = (duration_ms as f64 / frame_count as f64).max(20.0);
    ((per_ms / 10.0).round() as u16).clamp(2, 100)
}

fn scale_rgba(
    raw: &[u8],
    src_w: u32,
    src_h: u32,
    out_w: u32,
    out_h: u32,
    scale: f32,
) -> Vec<u8> {
    if (scale - 1.0).abs() < f32::EPSILON {
        return raw.to_vec();
    }

    let mut out = vec![0u8; (out_w * out_h * 4) as usize];
    for y in 0..out_h {
        for x in 0..out_w {
            let sx = ((x as f32) / scale).floor() as u32;
            let sy = ((y as f32) / scale).floor() as u32;
            let sx = sx.min(src_w.saturating_sub(1));
            let sy = sy.min(src_h.saturating_sub(1));
            let src_i = ((sy * src_w + sx) * 4) as usize;
            let dst_i = ((y * out_w + x) * 4) as usize;
            out[dst_i..dst_i + 4].copy_from_slice(&raw[src_i..src_i + 4]);
        }
    }
    out
}
