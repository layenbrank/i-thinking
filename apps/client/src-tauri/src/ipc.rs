//! corex-serve Named Pipe IPC 客户端

use std::ffi::OsStr;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::sync::atomic::{AtomicU64, Ordering};

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

/// 默认 Named Pipe 名称（与 corex-serve 一致）
pub const PIPE_NAME: &str = r"\\.\pipe\corex";

static REQUEST_ID: AtomicU64 = AtomicU64::new(1);

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

/// 调用任意 corex 模块
pub fn invoke(module: &str, args: Value) -> Result<IpcResponse, String> {
    let id = REQUEST_ID.fetch_add(1, Ordering::Relaxed);
    let payload = json!({
        "type": "invoke",
        "id": id,
        "module": module,
        "args": args,
    });
    let response = exchange(id, &payload.to_string())?;
    Ok(response)
}

/// 探测 Named Pipe 是否可连接（不发送业务请求）
pub fn is_ready() -> bool {
    #[cfg(windows)]
    {
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

#[cfg(windows)]
fn open_pipe(pipe_name: &str) -> Result<File, String> {
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::io::FromRawHandle;

    use windows::core::PCWSTR;
    use windows::Win32::Storage::FileSystem::{
        CreateFileW, FILE_ATTRIBUTE_NORMAL, FILE_GENERIC_READ, FILE_GENERIC_WRITE, FILE_SHARE_NONE,
        OPEN_EXISTING,
    };

    let wide: Vec<u16> = OsStr::new(pipe_name)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let handle = unsafe {
        CreateFileW(
            PCWSTR(wide.as_ptr()),
            FILE_GENERIC_READ.0 | FILE_GENERIC_WRITE.0,
            FILE_SHARE_NONE,
            None,
            OPEN_EXISTING,
            FILE_ATTRIBUTE_NORMAL,
            None,
        )
    }
    .map_err(|e| format!("无法连接 {pipe_name}: {e}"))?;

    Ok(unsafe { File::from_raw_handle(handle.0 as _) })
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
