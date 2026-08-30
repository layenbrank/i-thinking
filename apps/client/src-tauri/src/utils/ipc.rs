//! corex-daemon Named Pipe IPC 客户端（v5 Action 协议 + 长连接复用）

use std::ffi::OsStr;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// 默认 Named Pipe 名称（与 corex-daemon 一致）
pub const PIPE_NAME: &str = r"\\.\pipe\corex";

static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

/// 进程内唯一长连接；同连接多行 Invoke，避免每请求 CreateFile 握手风暴。
static SESSION: Mutex<Option<File>> = Mutex::new(None);

/// 前端扁平响应（由 daemon tagged Response 归一）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpcResponse {
    pub id: u64,
    pub ok: bool,
    #[serde(default)]
    pub path: Option<String>,
    #[serde(default)]
    pub data: Option<Value>,
    pub ms: u64,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RpcErrorBody {
    code: i32,
    message: String,
}

/// daemon → client（`crates/ipc` `Response`）
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum DaemonResponse {
    Pong { id: u64 },
    Ok {
        id: u64,
        #[serde(default)]
        data: Value,
    },
    Error { id: u64, error: RpcErrorBody },
    Bye { id: u64 },
}

/// 拼出最终 action id。`action` 不得含 `.`，禁止用完整 id 覆盖 `module` 白名单。
fn parse_action_id(module: &str, action: Option<&str>) -> Result<String, String> {
    match action {
        Some(a) => {
            let trimmed = a.trim();
            if trimmed.is_empty() {
                return Err("action 不能为空".into());
            }
            if trimmed.contains('.') {
                return Err("action 不得包含 '.'".into());
            }
            Ok(format!("{module}.{trimmed}"))
        }
        None => Ok(module.to_string()),
    }
}

/// 解析 auth token：`COREX_TOKEN` → `%APPDATA%/corex/data/token`
pub fn auth_token() -> Result<String, String> {
    if let Ok(token) = std::env::var("COREX_TOKEN") {
        let trimmed = token.trim();
        if !trimmed.is_empty() {
            return Ok(trimmed.to_string());
        }
    }
    for path in token_candidates() {
        if let Ok(text) = std::fs::read_to_string(&path) {
            let trimmed = text.trim();
            if !trimmed.is_empty() {
                return Ok(trimmed.to_string());
            }
        }
    }
    Err(
        "缺少 corex auth token：请先启动 corex-daemon，或设置 COREX_TOKEN / 确保 %APPDATA%/corex/data/token 存在"
            .into(),
    )
}

fn token_candidates() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Ok(dir) = std::env::var("COREX_DATA_DIR") {
        paths.push(PathBuf::from(dir).join("token"));
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        paths.push(PathBuf::from(&appdata).join("corex").join("data").join("token"));
    }
    paths
}

/// 调用 Action；`module` 可为完整 id，或与 `action` 拼成 `{module}.{action}`
pub fn invoke(module: &str, args: Value) -> Result<IpcResponse, String> {
    invoke_with(module, None, args)
}

pub fn invoke_with(
    module: &str,
    action: Option<&str>,
    args: Value,
) -> Result<IpcResponse, String> {
    let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
    let action_id = parse_action_id(module, action)?;
    let token = auth_token()?;
    let payload = json!({
        "type": "invoke",
        "id": id,
        "auth_token": token,
        "action": action_id,
        "params": args,
    });
    exchange(id, &payload.to_string())
}

pub fn has_session() -> bool {
    SESSION
        .lock()
        .map(|guard| guard.is_some())
        .unwrap_or(false)
}

pub fn is_ready() -> bool {
    #[cfg(windows)]
    {
        let Ok(mut guard) = SESSION.lock() else {
            return false;
        };
        if guard.is_some() {
            return true;
        }
        match open_pipe(PIPE_NAME) {
            Ok(file) => {
                *guard = Some(file);
                true
            }
            Err(_) => false,
        }
    }
    #[cfg(not(windows))]
    {
        false
    }
}

pub fn is_listening() -> bool {
    #[cfg(windows)]
    {
        open_pipe(PIPE_NAME).is_ok()
    }
    #[cfg(not(windows))]
    {
        false
    }
}

pub fn drop_session() {
    if let Ok(mut guard) = SESSION.lock() {
        *guard = None;
    }
}

pub fn shutdown() -> Result<(), String> {
    #[cfg(windows)]
    {
        let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
        let token = auth_token().unwrap_or_default();
        let payload = json!({
            "type": "shutdown",
            "id": id,
            "auth_token": token,
        });
        let mut guard = SESSION
            .lock()
            .map_err(|e| format!("IPC 锁失败: {e}"))?;
        let file = match guard.as_mut() {
            Some(file) => file,
            None => {
                let file = open_pipe(PIPE_NAME)?;
                *guard = Some(file);
                guard.as_mut().expect("刚写入会话")
            }
        };
        let write_result = (|| -> Result<(), String> {
            file.write_all(payload.to_string().as_bytes())
                .map_err(|e| e.to_string())?;
            file.write_all(b"\n").map_err(|e| e.to_string())?;
            file.flush().map_err(|e| e.to_string())?;
            Ok(())
        })();
        *guard = None;
        write_result
    }
    #[cfg(not(windows))]
    {
        Err("IPC 当前仅支持 Windows Named Pipe".to_string())
    }
}

fn exchange(request_id: u64, request_json: &str) -> Result<IpcResponse, String> {
    #[cfg(windows)]
    {
        match exchange_once(request_id, request_json) {
            Ok(response) => Ok(response),
            Err(first) => {
                drop_session();
                exchange_once(request_id, request_json).map_err(|second| {
                    format!("IPC 失败（重连后仍失败）: {second}；首次: {first}")
                })
            }
        }
    }
    #[cfg(not(windows))]
    {
        let _ = (request_id, request_json);
        Err("IPC 当前仅支持 Windows Named Pipe".to_string())
    }
}

fn parse_daemon_response(raw: &str, request_id: u64) -> Result<IpcResponse, String> {
    let daemon: DaemonResponse =
        serde_json::from_str(raw).map_err(|e| format!("解析 IPC 响应失败: {e}"))?;
    match daemon {
        DaemonResponse::Ok { id, data } => {
            if id != request_id {
                return Err(format!("IPC 响应 id 不匹配: 期望 {request_id}, 收到 {id}"));
            }
            let path = data
                .as_object()
                .and_then(|m| m.get("path"))
                .and_then(|v| v.as_str())
                .map(str::to_string);
            Ok(IpcResponse {
                id,
                ok: true,
                path,
                data: Some(data),
                ms: 0,
                error: None,
            })
        }
        DaemonResponse::Error { id, error } => {
            if id != request_id {
                return Err(format!("IPC 响应 id 不匹配: 期望 {request_id}, 收到 {id}"));
            }
            Ok(IpcResponse {
                id,
                ok: false,
                path: None,
                data: None,
                ms: 0,
                error: Some(format!("[{}] {}", error.code, error.message)),
            })
        }
        DaemonResponse::Pong { id } | DaemonResponse::Bye { id } => Ok(IpcResponse {
            id,
            ok: true,
            path: None,
            data: None,
            ms: 0,
            error: None,
        }),
    }
}

#[cfg(windows)]
fn exchange_once(request_id: u64, request_json: &str) -> Result<IpcResponse, String> {
    let mut guard = SESSION
        .lock()
        .map_err(|e| format!("IPC 锁失败: {e}"))?;
    if guard.is_none() {
        *guard = Some(open_pipe(PIPE_NAME)?);
    }
    let file = guard.as_mut().ok_or_else(|| "IPC 会话丢失".to_string())?;

    let result = (|| -> Result<IpcResponse, String> {
        file.write_all(request_json.as_bytes())
            .map_err(|e| e.to_string())?;
        file.write_all(b"\n").map_err(|e| e.to_string())?;
        file.flush().map_err(|e| e.to_string())?;

        let mut reader = BufReader::new(&*file);
        let mut line = String::new();
        reader.read_line(&mut line).map_err(|e| e.to_string())?;
        if line.is_empty() {
            return Err("IPC 响应为空（连接可能已关闭）".to_string());
        }
        parse_daemon_response(line.trim(), request_id)
    })();

    if result.is_err() {
        *guard = None;
    }
    result
}

#[cfg(windows)]
const PIPE_BUSY_WAIT_MS: u32 = 60_000;

#[cfg(windows)]
const PIPE_OPEN_RETRIES: u32 = 16;

#[cfg(windows)]
fn open_pipe(pipe_name: &str) -> Result<File, String> {
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::io::FromRawHandle;
    use std::thread;
    use std::time::Duration;

    use windows::core::PCWSTR;
    use windows::Win32::Foundation::{ERROR_FILE_NOT_FOUND, ERROR_PIPE_BUSY};
    use windows::Win32::Storage::FileSystem::{
        CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_GENERIC_READ, FILE_GENERIC_WRITE, FILE_SHARE_NONE,
        OPEN_EXISTING,
    };
    use windows::Win32::System::Pipes::WaitNamedPipeW;

    let wide: Vec<u16> = OsStr::new(pipe_name)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();
    let name = PCWSTR(wide.as_ptr());

    for attempt in 0..PIPE_OPEN_RETRIES {
        let handle = unsafe {
            CreateFileW(
                name,
                (FILE_GENERIC_READ | FILE_GENERIC_WRITE).0,
                FILE_SHARE_NONE,
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                None,
            )
        };
        match handle {
            Ok(h) => {
                let file = unsafe { File::from_raw_handle(h.0 as _) };
                return Ok(file);
            }
            Err(err) => {
                let code = windows::core::HRESULT::from(err.code()).0 as u32;
                if code == ERROR_PIPE_BUSY.0 {
                    let _ = unsafe { WaitNamedPipeW(name, PIPE_BUSY_WAIT_MS) };
                    continue;
                }
                if code == ERROR_FILE_NOT_FOUND.0 && attempt + 1 < PIPE_OPEN_RETRIES {
                    thread::sleep(Duration::from_millis(50 * (attempt as u64 + 1)));
                    continue;
                }
                return Err(format!("打开 Named Pipe 失败: {err}"));
            }
        }
    }
    Err("打开 Named Pipe 超时（PIPE_BUSY）".into())
}
