//! 内嵌 localhost 资源服务端口（不改主窗协议）。

/// 避开 Vite 开发端口 5173。
pub const LOCALHOST_PORT: u16 = 18923;

/// 供 `WebviewUrl::External` 使用的 origin。
pub fn localhost_origin() -> String {
    format!("http://localhost:{LOCALHOST_PORT}")
}
