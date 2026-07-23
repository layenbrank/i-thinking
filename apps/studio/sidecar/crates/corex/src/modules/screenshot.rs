use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};

use ffmpeg_next as ffmpeg;
use ffmpeg_next::codec::{self, Context as CodecContext};
use ffmpeg_next::encoder::Video as VideoEncoder;
use ffmpeg_next::format::{self, Pixel};
use ffmpeg_next::software::scaling::{context::Context as ScaleContext, flag::Flags as ScaleFlags};
use ffmpeg_next::util::frame::video::Video as VideoFrame;
use ffmpeg_next::{Dictionary, Packet, Rational};
use serde_json::{json, Value};
use xcap::Monitor;

use crate::module::CorexModule;

const MAX_RECORD_FRAMES: usize = 3_600;
const FRAME_SAMPLE_EVERY: usize = 1;
const INPUT_FRAME_RATE: i32 = 30;

struct PendingRecord {
    output: PathBuf,
}

struct ActiveRecord {
    frame_tx: Sender<Option<Vec<u8>>>,
    result_rx: mpsc::Receiver<Result<FinishedRecord, String>>,
    width: u32,
    height: u32,
    frame_count: usize,
}

struct FinishedRecord {
    path: PathBuf,
    width: u32,
    height: u32,
    frame_count: usize,
}

pub struct ScreenshotModule {
    monitor: Option<Monitor>,
    recorder: Option<xcap::VideoRecorder>,
    is_recording: Arc<AtomicBool>,
    pending: Arc<Mutex<Option<PendingRecord>>>,
    active: Arc<Mutex<Option<ActiveRecord>>>,
    record_started_at: Option<Instant>,
}

impl ScreenshotModule {
    pub fn new() -> Self {
        Self {
            monitor: None,
            recorder: None,
            is_recording: Arc::new(AtomicBool::new(false)),
            pending: Arc::new(Mutex::new(None)),
            active: Arc::new(Mutex::new(None)),
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
        let output = find_required_path(&params, "output")?;
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

    fn record_start(&mut self, params: Value) -> Result<Value, String> {
        if self.is_recording.load(Ordering::SeqCst) {
            return Err("recording already started".to_string());
        }

        let output = find_required_path(&params, "output")?;
        ensure_parent_dir(&output)?;

        {
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| "pending lock poisoned".to_string())?;
            *pending = Some(PendingRecord { output });
        }
        {
            let mut active = self
                .active
                .lock()
                .map_err(|_| "active lock poisoned".to_string())?;
            *active = None;
        }

        self.is_recording.store(true, Ordering::SeqCst);
        self.record_started_at = Some(Instant::now());

        let recorder = self.require_recorder()?;
        if let Err(err) = recorder.start() {
            self.is_recording.store(false, Ordering::SeqCst);
            self.record_started_at = None;
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| "pending lock poisoned".to_string())?;
            *pending = None;
            return Err(format!("record start failed: {err}"));
        }
        Ok(json!({}))
    }

    fn record_stop(&mut self) -> Result<Value, String> {
        if !self.is_recording.load(Ordering::SeqCst) {
            return Err("recording not started".to_string());
        }

        let recorder = self.require_recorder()?;
        recorder
            .stop()
            .map_err(|err| format!("record stop failed: {err}"))?;

        // Keep accepting frames while armed, then disarm and finalize encoder.
        thread::sleep(Duration::from_millis(200));
        self.is_recording.store(false, Ordering::SeqCst);
        thread::sleep(Duration::from_millis(150));

        {
            let mut pending = self
                .pending
                .lock()
                .map_err(|_| "pending lock poisoned".to_string())?;
            *pending = None;
        }

        let session = self
            .active
            .lock()
            .map_err(|_| "active lock poisoned".to_string())?
            .take();

        let Some(session) = session else {
            return Err("no frames captured".to_string());
        };

        let finished = finalize_encoder(session)?;
        if finished.frame_count == 0 {
            return Err("no frames captured".to_string());
        }

        let duration_ms = self
            .record_started_at
            .take()
            .map(|started| started.elapsed().as_millis() as u64)
            .unwrap_or(0);

        Ok(json!({
            "path": finished.path.to_string_lossy(),
            "frameCount": finished.frame_count,
            "durationMs": duration_ms,
            "width": finished.width,
            "height": finished.height,
        }))
    }
}

impl CorexModule for ScreenshotModule {
    fn name(&self) -> &'static str {
        "screenshot"
    }

    fn warm(&mut self) -> Result<(), String> {
        ensure_ffmpeg_init()?;
        let monitor = Self::find_primary_monitor()?;
        let (recorder, rx) = monitor
            .video_recorder()
            .map_err(|err| format!("video_recorder: {err}"))?;

        let is_recording = Arc::clone(&self.is_recording);
        let pending = Arc::clone(&self.pending);
        let active = Arc::clone(&self.active);

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

                let (out_w, out_h) = find_video_size(frame.width, frame.height);
                let rgba = prepare_rgba(&frame.raw, frame.width, frame.height, out_w, out_h);

                let mut guard = match active.lock() {
                    Ok(guard) => guard,
                    Err(_) => continue,
                };

                if guard.is_none() {
                    let pending_record = match pending.lock() {
                        Ok(mut pending_guard) => pending_guard.take(),
                        Err(_) => None,
                    };
                    let Some(pending_record) = pending_record else {
                        continue;
                    };
                    match spawn_encoder(&pending_record, out_w, out_h) {
                        Ok(session) => *guard = Some(session),
                        Err(err) => {
                            eprintln!("[screenshot] spawn encoder failed: {err}");
                            continue;
                        }
                    }
                }

                let Some(session) = guard.as_mut() else {
                    continue;
                };
                if session.frame_count >= MAX_RECORD_FRAMES {
                    continue;
                }
                if session.width != out_w || session.height != out_h {
                    continue;
                }

                if let Err(err) = session.frame_tx.send(Some(rgba)) {
                    eprintln!("[screenshot] encode frame send failed: {err}");
                    *guard = None;
                    continue;
                }
                session.frame_count += 1;
            }
        });

        self.monitor = Some(monitor);
        self.recorder = Some(recorder);
        Ok(())
    }

    fn handle(&mut self, action: &str, params: Value) -> Result<Value, String> {
        match action {
            "capture" => self.capture(params),
            "recordStart" => self.record_start(params),
            "recordStop" => self.record_stop(),
            other => Err(format!("unknown action: {other}")),
        }
    }
}

fn ensure_ffmpeg_init() -> Result<(), String> {
    static INIT: OnceLock<Result<(), String>> = OnceLock::new();
    INIT.get_or_init(|| {
        ffmpeg::init().map_err(|err| format!("ffmpeg init failed: {err}"))
    })
    .clone()
}

fn spawn_encoder(pending: &PendingRecord, width: u32, height: u32) -> Result<ActiveRecord, String> {
    let (frame_tx, frame_rx) = mpsc::channel::<Option<Vec<u8>>>();
    let (result_tx, result_rx) = mpsc::channel::<Result<FinishedRecord, String>>();
    let output = pending.output.clone();

    thread::spawn(move || {
        let result = encode_session(output, width, height, frame_rx);
        let _ = result_tx.send(result);
    });

    Ok(ActiveRecord {
        frame_tx,
        result_rx,
        width,
        height,
        frame_count: 0,
    })
}

fn finalize_encoder(session: ActiveRecord) -> Result<FinishedRecord, String> {
    let frame_count = session.frame_count;
    let _ = session.frame_tx.send(None);
    drop(session.frame_tx);
    let finished = session
        .result_rx
        .recv()
        .map_err(|_| "encoder thread ended without result".to_string())??;
    Ok(FinishedRecord {
        path: finished.path,
        width: finished.width,
        height: finished.height,
        frame_count,
    })
}

fn encode_session(
    output: PathBuf,
    width: u32,
    height: u32,
    frame_rx: mpsc::Receiver<Option<Vec<u8>>>,
) -> Result<FinishedRecord, String> {
    let mut octx =
        format::output(&output).map_err(|err| format!("open output failed: {err}"))?;

    let codec = ffmpeg::encoder::find(codec::Id::FFV1).ok_or_else(|| "FFV1 encoder missing".to_string())?;
    let time_base = Rational::new(1, INPUT_FRAME_RATE);
    let stream_index = {
        let mut stream = octx
            .add_stream(codec)
            .map_err(|err| format!("add stream failed: {err}"))?;
        stream.set_time_base(time_base);
        stream.index()
    };

    let mut encoder = unsafe {
        let context_ptr = ffmpeg::ffi::avcodec_alloc_context3(codec.as_ptr());
        if context_ptr.is_null() {
            return Err("alloc codec context failed".to_string());
        }
        CodecContext::wrap(context_ptr, None)
    }
    .encoder()
    .video()
    .map_err(|err| format!("video encoder failed: {err}"))?;

    encoder.set_width(width);
    encoder.set_height(height);
    encoder.set_format(Pixel::GBRP);
    encoder.set_time_base(time_base);
    encoder.set_frame_rate(Some(Rational::new(INPUT_FRAME_RATE, 1)));

    let mut opts = Dictionary::new();
    opts.set("level", "3");
    let mut encoder = encoder
        .open_with(opts)
        .map_err(|err| format!("open FFV1 encoder failed: {err}"))?;

    {
        let mut stream = octx
            .stream_mut(stream_index)
            .ok_or_else(|| "output stream missing".to_string())?;
        stream.set_parameters(&encoder);
    }

    octx.write_header()
        .map_err(|err| format!("write header failed: {err}"))?;

    let mut scaler = ScaleContext::get(
        Pixel::RGBA,
        width,
        height,
        Pixel::GBRP,
        width,
        height,
        ScaleFlags::BICUBIC,
    )
    .map_err(|err| format!("create scaler failed: {err}"))?;

    let mut pts = 0i64;
    let mut encoded_frames = 0usize;

    while let Ok(maybe_frame) = frame_rx.recv() {
        let Some(rgba) = maybe_frame else {
            break;
        };

        let mut src = VideoFrame::new(Pixel::RGBA, width, height);
        let expected = (width as usize) * (height as usize) * 4;
        if rgba.len() != expected {
            return Err(format!(
                "rgba size mismatch: got {}, expected {expected}",
                rgba.len()
            ));
        }
        src.data_mut(0)[..expected].copy_from_slice(&rgba);

        let mut dst = VideoFrame::new(Pixel::GBRP, width, height);
        scaler
            .run(&src, &mut dst)
            .map_err(|err| format!("scale frame failed: {err}"))?;
        dst.set_pts(Some(pts));
        pts += 1;

        encoder
            .send_frame(&dst)
            .map_err(|err| format!("send frame failed: {err}"))?;
        drain_packets(&mut encoder, &mut octx, stream_index, time_base)?;
        encoded_frames += 1;
    }

    encoder
        .send_eof()
        .map_err(|err| format!("encoder eof failed: {err}"))?;
    drain_packets(&mut encoder, &mut octx, stream_index, time_base)?;

    octx.write_trailer()
        .map_err(|err| format!("write trailer failed: {err}"))?;

    if !output.exists() {
        return Err("encoder did not produce output file".to_string());
    }

    Ok(FinishedRecord {
        path: output,
        width,
        height,
        frame_count: encoded_frames,
    })
}

fn drain_packets(
    encoder: &mut VideoEncoder,
    octx: &mut format::context::Output,
    stream_index: usize,
    encoder_time_base: Rational,
) -> Result<(), String> {
    let mut packet = Packet::empty();
    while encoder.receive_packet(&mut packet).is_ok() {
        packet.set_stream(stream_index);
        packet.set_position(-1);
        let stream_tb = octx
            .stream(stream_index)
            .map(|stream| stream.time_base())
            .unwrap_or(encoder_time_base);
        packet.rescale_ts(encoder_time_base, stream_tb);
        packet
            .write_interleaved(octx)
            .map_err(|err| format!("write packet failed: {err}"))?;
    }
    Ok(())
}

fn find_required_path(params: &Value, key: &str) -> Result<PathBuf, String> {
    let value = params
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("params.{key} is required"))?;
    if value.is_empty() {
        return Err(format!("params.{key} is empty"));
    }
    Ok(PathBuf::from(value))
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

fn find_video_size(width: u32, height: u32) -> (u32, u32) {
    let out_w = (width & !1).max(2);
    let out_h = (height & !1).max(2);
    (out_w, out_h)
}

fn prepare_rgba(raw: &[u8], src_w: u32, src_h: u32, out_w: u32, out_h: u32) -> Vec<u8> {
    if src_w == out_w && src_h == out_h {
        return raw.to_vec();
    }
    let mut out = vec![0u8; (out_w * out_h * 4) as usize];
    for y in 0..out_h {
        let src_row = (y * src_w * 4) as usize;
        let dst_row = (y * out_w * 4) as usize;
        let bytes = (out_w * 4) as usize;
        out[dst_row..dst_row + bytes].copy_from_slice(&raw[src_row..src_row + bytes]);
    }
    out
}
