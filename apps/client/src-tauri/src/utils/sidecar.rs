use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tracing::{info, warn};

use crate::utils::ipc;

/// 更新安装前等待 sidecar 退出的超时。
pub const SIDECAR_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(5);

/// 应用正常退出时的较短等待，避免拖慢退出。
const SIDECAR_EXIT_TIMEOUT: Duration = Duration::from_secs(2);

const GRACEFUL_WAIT: Duration = Duration::from_millis(500);
const HANDLE_SETTLE: Duration = Duration::from_millis(200);

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

    /// `None` = 仍在启动；`Some(true/false)` = 已结束。
    pub fn status(&self) -> Option<bool> {
        if !self.settled.load(Ordering::Relaxed) {
            return None;
        }
        Some(self.is_ready())
    }

    /// 以 Named Pipe 为准；可纠正超时后的误判。
    pub fn probe(&self) -> bool {
        if self.is_ready() {
            return true;
        }
        if ipc::is_ready() {
            self.mark_ready();
            return true;
        }
        false
    }

    pub fn mark_ready(&self) {
        self.ready.store(true, Ordering::Relaxed);
        self.settled.store(true, Ordering::Relaxed);
    }

    pub fn fail(&self) {
        self.ready.store(false, Ordering::Relaxed);
        self.settled.store(true, Ordering::Relaxed);
    }
}

fn apply_pdfium_env(
    app: &AppHandle,
    sidecar: tauri_plugin_shell::process::Command,
) -> tauri_plugin_shell::process::Command {
    for dir in pdfium_candidate_dirs(app) {
        if dir.join("pdfium.dll").exists() {
            info!(path = %dir.display(), "COREX_PDFIUM_DIR");
            return sidecar.env("COREX_PDFIUM_DIR", dir);
        }
    }

    warn!("未找到 pdfium.dll，morph PDF 能力可能不可用");
    sidecar
}

/// 打包资源 → sidecar 旁 → src-tauri/binaries（开发态）
fn pdfium_candidate_dirs(app: &AppHandle) -> Vec<std::path::PathBuf> {
    let mut dirs = Vec::new();

    if let Ok(resource_dir) = app.path().resource_dir() {
        dirs.push(resource_dir.join("binaries"));
        dirs.push(resource_dir);
    }

    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            dirs.push(parent.join("binaries"));
            dirs.push(parent.to_path_buf());
        }
    }

    // tauri dev：externalBin 与 resources 落在 target 旁；manifest binaries 为源真相
    dirs.push(std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("binaries"));

    dirs
}

/// 启动 sidecar，并在后台等待就绪；失败时发出 `corex://not-ready`。
pub fn spawn_and_watch(app: &AppHandle, timeout: Duration) {
    match spawn(app) {
        Ok(()) => {
            let app = app.clone();
            std::thread::spawn(move || {
                let Some(state) = app.try_state::<SidecarState>() else {
                    return;
                };
                if !wait_for_daemon(timeout, &state) {
                    let _ = app.emit("corex://not-ready", ());
                }
            });
        }
        Err(e) => {
            tracing::error!("corex-serve 启动失败: {e}");
            app.state::<SidecarState>().fail();
            let _ = app.emit("corex://not-ready", ());
        }
    }
}

/// 启动 corex-serve sidecar 并监听进程退出。
fn spawn(app: &AppHandle) -> Result<(), String> {
    // sidecar() 只要 externalBin 的文件名，不要 `binaries/` 前缀；
    // 运行时相对 current_exe 目录解析为 `corex-serve.exe`。
    let sidecar = app
        .shell()
        .sidecar("corex-serve")
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

fn wait_for_daemon(timeout: Duration, state: &SidecarState) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if state.probe() {
            info!("corex-serve IPC 已就绪");
            return true;
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    state.fail();
    warn!("corex-serve 在超时内未就绪，重能力调用可能失败");
    false
}

/// 应用退出时关闭 sidecar（较短超时）。
pub fn shutdown(app: &AppHandle) {
    let _ = shutdown_and_wait(app, SIDECAR_EXIT_TIMEOUT);
}

/// 请求 daemon 退出，kill 子进程，并等待其释放文件句柄。
///
/// 返回 `true` 表示确认已停；超时仍返回 `false`（调用方可不阻断，依赖 NSIS hook）。
pub fn shutdown_and_wait(app: &AppHandle, timeout: Duration) -> bool {
    info!("正在关闭 corex-serve…");

    match ipc::shutdown() {
        Ok(()) => info!("已发送 corex-serve IPC shutdown"),
        Err(e) => warn!("corex-serve IPC shutdown 失败（可忽略）: {e}"),
    }

    let state = app.try_state::<SidecarState>();
    let child = state
        .as_ref()
        .and_then(|s| s.child.lock().ok().and_then(|mut guard| guard.take()));

    let start = Instant::now();
    let stopped = if let Some(child) = child {
        stop_child(child, timeout, start)
    } else {
        wait_until_pipe_closed(timeout, start)
    };

    if let Some(state) = state.as_ref() {
        state.fail();
    }

    if stopped {
        std::thread::sleep(HANDLE_SETTLE);
        info!("corex-serve 已停止");
    } else {
        warn!("corex-serve 在 {:?} 内未确认退出，将依赖安装器 hook 兜底", timeout);
    }

    stopped
}

fn stop_child(child: CommandChild, timeout: Duration, start: Instant) -> bool {
    let pid = child.pid();

    let graceful = GRACEFUL_WAIT.min(timeout);
    if wait_for_pid_exit(pid, graceful) {
        info!("corex-serve 已优雅退出 (pid={pid})");
        return true;
    }

    match child.kill() {
        Ok(()) => info!("已请求终止 corex-serve (pid={pid})"),
        Err(e) => warn!("kill corex-serve 失败 (pid={pid}): {e}"),
    }

    let remaining = timeout.saturating_sub(start.elapsed());
    if wait_for_pid_exit(pid, remaining) {
        info!("corex-serve 已退出 (pid={pid})");
        return true;
    }

    warn!("等待 corex-serve 退出超时 (pid={pid})");
    false
}

fn wait_until_pipe_closed(timeout: Duration, start: Instant) -> bool {
    while start.elapsed() < timeout {
        if !ipc::is_ready() {
            info!("corex-serve IPC 已不可用");
            return true;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    !ipc::is_ready()
}

#[cfg(windows)]
fn wait_for_pid_exit(pid: u32, timeout: Duration) -> bool {
    use windows::Win32::Foundation::{CloseHandle, WAIT_OBJECT_0, WAIT_TIMEOUT};
    use windows::Win32::System::Threading::{OpenProcess, WaitForSingleObject, PROCESS_SYNCHRONIZE};

    let handle = match unsafe { OpenProcess(PROCESS_SYNCHRONIZE, false, pid) } {
        Ok(h) => h,
        Err(_) => {
            // 进程已不存在
            return true;
        }
    };

    let ms = timeout.as_millis().min(u32::MAX as u128) as u32;
    let result = unsafe { WaitForSingleObject(handle, ms) };
    let _ = unsafe { CloseHandle(handle) };

    match result {
        WAIT_OBJECT_0 => true,
        WAIT_TIMEOUT => false,
        other => {
            warn!("WaitForSingleObject(pid={pid}) 异常: {other:?}");
            false
        }
    }
}

#[cfg(not(windows))]
fn wait_for_pid_exit(_pid: u32, timeout: Duration) -> bool {
    std::thread::sleep(timeout.min(Duration::from_millis(200)));
    true
}
