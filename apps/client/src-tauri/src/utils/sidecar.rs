use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tracing::{info, warn};

use crate::ipc;

pub struct SidecarState {
    ready: AtomicBool,
    settled: AtomicBool,
    child: Mutex<Option<CommandChild>>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self::new()
    }
}

impl SidecarState {
    pub fn new() -> Self {
        Self {
            ready: AtomicBool::new(false),
            settled: AtomicBool::new(false),
            child: Mutex::new(None),
        }
    }

    pub fn is_ready(&self) -> bool {
        self.ready.load(Ordering::Relaxed)
    }

    /// `None` = 仍在探测；`Some(true/false)` = 已结束等待。
    pub fn status(&self) -> Option<bool> {
        if !self.settled.load(Ordering::Relaxed) {
            return None;
        }
        Some(self.is_ready())
    }

    pub fn mark_ready(&self) {
        self.ready.store(true, Ordering::Relaxed);
        self.settled.store(true, Ordering::Relaxed);
    }

    /// 启动或运行失败：not ready + settled。
    pub fn fail(&self) {
        self.ready.store(false, Ordering::Relaxed);
        self.settled.store(true, Ordering::Relaxed);
    }
}

fn apply_pdfium_env(
    app: &AppHandle,
    sidecar: tauri_plugin_shell::process::Command,
) -> tauri_plugin_shell::process::Command {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let pdfium_dir = resource_dir.join("binaries");
        if pdfium_dir.join("pdfium.dll").exists() {
            return sidecar.env("COREX_PDFIUM_DIR", pdfium_dir);
        }
    }

    sidecar
}

/// 启动 corex-serve sidecar 并监听进程退出。
pub fn spawn(app: &AppHandle) -> Result<(), String> {
    let sidecar = app
        .shell()
        .sidecar("binaries/corex-serve")
        .map_err(|e| format!("创建 corex-serve sidecar 失败: {e}"))?
        .args(["--pipe", ipc::PIPE_NAME]);

    let sidecar = apply_pdfium_env(app, sidecar);

    let (mut rx, child) = sidecar
        .spawn()
        .map_err(|e| format!("启动 corex-serve 失败: {e}"))?;

    {
        let state = app.state::<SidecarState>();
        let mut guard = state
            .child
            .lock()
            .map_err(|e| format!("锁定 sidecar 状态失败: {e}"))?;
        *guard = Some(child);
    }

    let app_for_task = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            if let CommandEvent::Terminated(payload) = event {
                warn!(
                    "corex-serve 已退出 (code={:?}, signal={:?})",
                    payload.code, payload.signal
                );
                if let Some(state) = app_for_task.try_state::<SidecarState>() {
                    state.fail();
                    if let Ok(mut guard) = state.child.lock() {
                        *guard = None;
                    }
                }
                let _ = app_for_task.emit("corex://not-ready", ());
                break;
            }
        }
    });

    Ok(())
}

pub fn wait_for_daemon(timeout: std::time::Duration, state: &SidecarState) -> bool {
    let start = std::time::Instant::now();
    while start.elapsed() < timeout {
        if ipc::is_ready() {
            state.mark_ready();
            info!("corex-serve IPC 已就绪");
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
    state.fail();
    warn!("corex-serve 在超时内未就绪，重能力调用可能失败");
    false
}

/// 请求 daemon 退出并等待 sidecar 进程结束。
pub fn shutdown(app: &AppHandle) {
    let _ = ipc::shutdown();

    let child = app
        .try_state::<SidecarState>()
        .and_then(|state| state.child.lock().ok().and_then(|mut guard| guard.take()));

    if let Some(child) = child {
        let _ = child.kill();
        info!("已请求终止 corex-serve");
    }
}
