//! corex-serve Named Pipe IPC 客户端

use std::ffi::OsStr;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// 默认 Named Pipe 名称（与 corex-serve 一致）
pub const PIPE_NAME: &str = r"\\.\pipe\corex";

static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

/// corex-serve 通常只有 1 个 pipe 实例；同进程内并发 invoke（如 warmOffsets + thumbnails）
/// 必须串行化，否则会出现 ERROR_PIPE_BUSY。
static PIPE_LOCK: Mutex<()> = Mutex::new(());

/// IPC 响应（与 corex-core `serve::protocol::Response` 一致）
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

/// 调用任意 corex 模块；`action` 为 CLI 子命令（kebab-case），可选
pub fn invoke(module: &str, args: Value) -> Result<IpcResponse, String> {
    invoke_with(module, None, args)
}

/// 带可选 `action` 的 invoke（engine / morph 等 action 模块需要）
pub fn invoke_with(
    module: &str,
    action: Option<&str>,
    args: Value,
) -> Result<IpcResponse, String> {
    let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
    let mut payload = json!({
        "type": "invoke",
        "id": id,
        "module": module,
        "args": args,
    });
    if let Some(action) = action {
        payload["action"] = Value::String(action.to_string());
    }
    let response = exchange(id, &payload.to_string())?;
    Ok(response)
}

/// 探测 Named Pipe 是否可连接（不发送业务请求）
pub fn is_ready() -> bool {
    #[cfg(windows)]
    {
        // 锁被占用说明已有会话正在使用管道，daemon 一定在线。
        let Ok(_guard) = PIPE_LOCK.try_lock() else {
            return true;
        };
        open_pipe(PIPE_NAME).is_ok()
    }
    #[cfg(not(windows))]
    {
        false
    }
}

/// 请求 Daemon 优雅退出（应用关闭时调用）
pub fn shutdown() -> Result<(), String> {
    #[cfg(windows)]
    {
        let _guard = PIPE_LOCK
            .lock()
            .map_err(|e| format!("IPC 锁失败: {e}"))?;
        let mut file = open_pipe(PIPE_NAME)?;
        file.write_all(br#"{"type":"shutdown"}"#)
            .map_err(|e| e.to_string())?;
        file.write_all(b"\n").map_err(|e| e.to_string())?;
        file.flush().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        Err("IPC 当前仅支持 Windows Named Pipe".to_string())
    }
}

fn exchange(request_id: u64, request_json: &str) -> Result<IpcResponse, String> {
    #[cfg(windows)]
    {
        let _guard = PIPE_LOCK
            .lock()
            .map_err(|e| format!("IPC 锁失败: {e}"))?;
        let mut file = open_pipe(PIPE_NAME)?;
        file.write_all(request_json.as_bytes())
            .map_err(|e| e.to_string())?;
        file.write_all(b"\n").map_err(|e| e.to_string())?;
        file.flush().map_err(|e| e.to_string())?;

        let mut reader = BufReader::new(&file);
        let mut line = String::new();
        reader.read_line(&mut line).map_err(|e| e.to_string())?;

        let response: IpcResponse =
            serde_json::from_str(line.trim()).map_err(|e| format!("解析 IPC 响应失败: {e}"))?;
        if response.id != request_id {
            return Err(format!(
                "IPC 响应 id 不匹配: 期望 {request_id}, 收到 {}",
                response.id
            ));
        }
        Ok(response)
    }
    #[cfg(not(windows))]
    {
        let _ = (request_id, request_json);
        Err("IPC 当前仅支持 Windows Named Pipe".to_string())
    }
}

/// Named Pipe 忙时等待可用实例的超时（毫秒）。
/// 单次 PDF 渲染/缩略图可能超过数秒，需覆盖整次业务处理。
#[cfg(windows)]
const PIPE_BUSY_WAIT_MS: u32 = 60_000;

/// CreateFile 重试次数（PIPE_BUSY / 服务端短暂断开重建）。
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
        match unsafe {
            CreateFileW(
                name,
                FILE_GENERIC_READ.0 | FILE_GENERIC_WRITE.0,
                FILE_SHARE_NONE,
                None,
                OPEN_EXISTING,
                FILE_ATTRIBUTE_NORMAL,
                None,
            )
        } {
            Ok(handle) => return Ok(unsafe { File::from_raw_handle(handle.0 as _) }),
            Err(e) if e.code() == ERROR_PIPE_BUSY.to_hresult() => {
                // 实例被占用：等服务端再次 ConnectNamedPipe。
                let waited = unsafe { WaitNamedPipeW(name, PIPE_BUSY_WAIT_MS) };
                if !waited.as_bool() {
                    return Err(format!(
                        "无法连接 {pipe_name}: 管道忙且等待超时 (attempt={attempt})"
                    ));
                }
            }
            Err(e) if e.code() == ERROR_FILE_NOT_FOUND.to_hresult() => {
                // Disconnect 与下一次 CreateNamedPipe 之间的短暂窗口。
                thread::sleep(Duration::from_millis(50));
            }
            Err(e) => return Err(format!("无法连接 {pipe_name}: {e}")),
        }
    }

    Err(format!(
        "无法连接 {pipe_name}: 已重试 {PIPE_OPEN_RETRIES} 次仍不可用"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn deserialize_ipc_response_success() {
        let raw = r#"{"id":1,"ok":true,"path":"/tmp/a.png","data":{"n":1},"ms":12}"#;
        let resp: IpcResponse = serde_json::from_str(raw).expect("parse");
        assert_eq!(resp.id, 1);
        assert!(resp.ok);
        assert_eq!(resp.path.as_deref(), Some("/tmp/a.png"));
        assert_eq!(resp.data, Some(json!({"n": 1})));
        assert_eq!(resp.ms, 12);
        assert!(resp.error.is_none());
    }

    #[test]
    fn deserialize_ipc_response_error_defaults() {
        let raw = r#"{"id":2,"ok":false,"ms":3,"error":"boom"}"#;
        let resp: IpcResponse = serde_json::from_str(raw).expect("parse");
        assert_eq!(resp.id, 2);
        assert!(!resp.ok);
        assert!(resp.path.is_none());
        assert!(resp.data.is_none());
        assert_eq!(resp.error.as_deref(), Some("boom"));
    }
}
