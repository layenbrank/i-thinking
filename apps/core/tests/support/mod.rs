#![allow(dead_code)]

//! P4d 集成测试脚手架：ai-worker 桩 + 编排库工具。
//!
//! 桩是一个最小 HTTP/1.1 服务端（只用 tokio，不引额外依赖），按路径路由、逐条记录到达的
//! 请求，并且可以把指定的第 n 次调用**按住不放**（不回调、连接也不关）：编排因此卡在
//! 「上一步刚提交、这一步正在飞」的状态上，测试可以慢慢读进度——这比「睡一会儿再回包」可靠，
//! 因为不存在读进度时错过窗口的竞争。放行用 [`StubAiWorker::release`]。
//! 请求一到达就记录，所以「第 n 次调用」也可以直接当栅栏用。

use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use durable::{Client, DurableSettings, InstanceStatus};
use serde_json::{Value, json};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use uuid::Uuid;

/// 桩收到的一条请求（头已小写，便于按名字查）。
#[derive(Debug, Clone)]
pub struct Recorded {
    pub method: String,
    pub path: String,
    pub body: String,
    head: String,
}

impl Recorded {
    fn parse(raw: &str) -> Self {
        let (head, body) = raw.split_once("\r\n\r\n").unwrap_or((raw, ""));
        let mut lines = head.lines();
        let request_line = lines.next().unwrap_or_default();
        let mut parts = request_line.split_whitespace();

        Self {
            method: parts.next().unwrap_or_default().to_ascii_uppercase(),
            path: parts.next().unwrap_or_default().to_string(),
            body: body.to_string(),
            head: head.to_ascii_lowercase(),
        }
    }

    /// 请求头（大小写不敏感）。
    pub fn header(&self, name: &str) -> Option<String> {
        let prefix = format!("{}:", name.to_ascii_lowercase());

        self.head
            .lines()
            .find_map(|line| line.strip_prefix(&prefix))
            .map(|value| value.trim().to_string())
    }

    /// 幂等键；缺头直接失败（三个内部头都是契约要求的）。
    pub fn idempotency_key(&self) -> String {
        self.header("idempotency-key")
            .unwrap_or_else(|| panic!("请求缺 Idempotency-Key：{}", self.path))
    }

    pub fn traceparent(&self) -> String {
        self.header("traceparent")
            .unwrap_or_else(|| panic!("请求缺 traceparent：{}", self.path))
    }

    pub fn internal_token(&self) -> String {
        self.header("x-internal-token")
            .unwrap_or_else(|| panic!("请求缺 X-Internal-Token：{}", self.path))
    }

    pub fn json(&self) -> Value {
        serde_json::from_str(&self.body)
            .unwrap_or_else(|error| panic!("请求体不是 JSON（{error}）：{}", self.body))
    }
}

/// 桩的行为脚本。
#[derive(Debug, Clone)]
pub struct Script {
    chunk_count: i32,
    dimensions: i32,
    collection: String,
    chunk_set_id: String,
    /// 路径片段 -> 第几次调用（1 起）按住不放。
    /// 请求体已经读完才开始按，所以「第 n 次调用」这级栅栏仍然成立：测试能在下游一直不回包
    /// 的状态下继续观察编排进度。永不调用 [`StubAiWorker::release`] 就是「下游卡死」。
    hangs: Vec<(String, usize)>,
}

impl Script {
    pub fn new(chunk_count: i32, dimensions: i32) -> Self {
        Self {
            chunk_count,
            dimensions,
            collection: "stub_chunks".to_owned(),
            chunk_set_id: "chunk-set-0001".to_owned(),
            hangs: Vec::new(),
        }
    }

    /// 按住该路径的第 `nth` 次调用（1 起）；测试读完成进后再放行。
    pub fn hang(mut self, fragment: &str, nth: usize) -> Self {
        self.hangs.push((fragment.to_owned(), nth));
        self
    }

    pub fn collection(mut self, collection: &str) -> Self {
        self.collection = collection.to_owned();
        self
    }

    pub fn chunk_set_id(mut self, chunk_set_id: &str) -> Self {
        self.chunk_set_id = chunk_set_id.to_owned();
        self
    }

    /// 该路径的第 `ordinal` 次调用是否要按住不放；返回命中的片段（放行时用它做键）。
    fn hang_of(&self, path: &str, ordinal: usize) -> Option<&str> {
        self.hangs
            .iter()
            .find(|(fragment, nth)| path.contains(fragment.as_str()) && *nth == ordinal)
            .map(|(fragment, _)| fragment.as_str())
    }

    fn body_for(&self, fragment: &str, request: &Recorded) -> Value {
        match fragment {
            "chunks" => json!({
                "chunkSetID": self.chunk_set_id,
                "chunkCount": self.chunk_count,
                "textSha": "0".repeat(64),
            }),
            "embeddings" => {
                // 区间必须原样回给编排（它拿返回值校验请求区间），所以从请求体里取。
                let payload = request.json();
                let from = payload["from"].as_i64().unwrap_or_default();
                let to = payload["to"].as_i64().unwrap_or_default();

                json!({
                    "from": from,
                    "to": to,
                    "embedded": to - from,
                    "dimensions": self.dimensions,
                })
            }
            "index" => json!({
                "indexed": self.chunk_count,
                "collection": self.collection,
            }),
            _ => json!({
                "status": "ok",
                "version": "0.0.0-stub",
                "capabilities": ["chunk", "embed", "index"],
            }),
        }
    }
}

/// 桩：`start()` 之后用 `base_url()` 装配 `AiWorkerClient`。
pub struct StubAiWorker {
    base_url: String,
    script: Arc<Script>,
    requests: Arc<Mutex<Vec<Recorded>>>,
    released: Arc<Mutex<HashSet<(String, usize)>>>,
    _accept: tokio::task::JoinHandle<()>,
}

impl StubAiWorker {
    pub async fn start(script: Script) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("绑定 ai-worker 桩端口失败");
        let address = listener.local_addr().expect("取桩端口失败");

        let script = Arc::new(script);
        let requests: Arc<Mutex<Vec<Recorded>>> = Arc::new(Mutex::new(Vec::new()));
        let released: Arc<Mutex<HashSet<(String, usize)>>> = Arc::new(Mutex::new(HashSet::new()));

        let accept_script = Arc::clone(&script);
        let accept_requests = Arc::clone(&requests);
        let accept_released = Arc::clone(&released);
        let accept = tokio::spawn(async move {
            loop {
                let Ok((socket, _)) = listener.accept().await else {
                    return;
                };
                let script = Arc::clone(&accept_script);
                let requests = Arc::clone(&accept_requests);
                let released = Arc::clone(&accept_released);
                // 一条连接一个任务：被按住的连接不能挡住后面的请求。
                tokio::spawn(async move { serve(socket, script, requests, released).await });
            }
        });

        Self {
            base_url: format!("http://{address}"),
            script,
            requests,
            released,
            _accept: accept,
        }
    }

    pub fn base_url(&self) -> String {
        self.base_url.clone()
    }

    /// 到目前为止收到的全部请求（按到达顺序）。
    pub fn requests(&self) -> Vec<Recorded> {
        self.requests.lock().expect("请求日志锁").clone()
    }

    /// 路径里含该片段的请求，例如 `matching("/embeddings")`。
    pub fn matching(&self, fragment: &str) -> Vec<Recorded> {
        self.requests()
            .into_iter()
            .filter(|request| request.path.contains(fragment))
            .collect()
    }

    pub fn count(&self, fragment: &str) -> usize {
        self.matching(fragment).len()
    }

    /// 幂等键序列（按到达顺序），用来证明重跑拿到的是同一个键。
    pub fn idempotency_keys(&self, fragment: &str) -> Vec<String> {
        self.matching(fragment)
            .iter()
            .map(Recorded::idempotency_key)
            .collect()
    }

    /// 放行被按住的那一次调用：参数与 [`Script::hang`] 一致（片段 + 第几次）。
    pub fn release(&self, fragment: &str, nth: usize) {
        self.released
            .lock()
            .expect("放行表锁")
            .insert((fragment.to_owned(), nth));
    }

    /// 等到该路径至少被调用 `count` 次；超时把已收到的请求打出来。
    pub async fn wait_for(&self, fragment: &str, count: usize, timeout: Duration) {
        let deadline = Instant::now() + timeout;
        loop {
            if self.count(fragment) >= count {
                return;
            }
            assert!(
                Instant::now() < deadline,
                "等 {fragment} 的第 {count} 次调用超时；已收到的请求：{:#?}",
                self.requests()
            );
            tokio::time::sleep(Duration::from_millis(20)).await;
        }
    }
}

/// 桩的一轮处理：记录 → 判断是否按住 → 回包。
async fn serve(
    mut socket: TcpStream,
    script: Arc<Script>,
    requests: Arc<Mutex<Vec<Recorded>>>,
    released: Arc<Mutex<HashSet<(String, usize)>>>,
) {
    let raw = read_request(&mut socket).await;
    let request = Recorded::parse(&raw);
    let matched = route(&request.path);

    let ordinal = {
        let mut log = requests.lock().expect("请求日志锁");
        let ordinal = log
            .iter()
            .filter(|seen| route(&seen.path) == matched)
            .count()
            + 1;
        log.push(request.clone());
        ordinal
    };

    let Some(route_name) = matched else {
        let body = json!({ "error": "桩不认识这条路径" });
        let _ = write_json(&mut socket, 404, &body).await;
        return;
    };

    if let Some(fragment) = script.hang_of(&request.path, ordinal) {
        let key = (fragment.to_owned(), ordinal);
        loop {
            if released.lock().expect("放行表锁").contains(&key) {
                break;
            }
            tokio::time::sleep(Duration::from_millis(10)).await;
        }
    }

    let body = script.body_for(route_name, &request);
    let _ = write_json(&mut socket, 200, &body).await;
}

/// 路径 → 路由名；不认识的路径回 `None`。
fn route(path: &str) -> Option<&'static str> {
    for (suffix, name) in [
        ("/chunks", "chunks"),
        ("/embeddings", "embeddings"),
        ("/index", "index"),
        ("/health", "health"),
    ] {
        if path.ends_with(suffix) {
            return Some(name);
        }
    }

    None
}

async fn write_json(socket: &mut TcpStream, status: u16, body: &Value) -> std::io::Result<()> {
    let body = body.to_string();
    let response = format!(
        "HTTP/1.1 {status} STUB\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
        body.len()
    );

    socket.write_all(response.as_bytes()).await
}

/// 读一条 HTTP 请求（先头后体，按 `content-length`）。
async fn read_request(socket: &mut TcpStream) -> String {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 2048];
    let head_end = loop {
        if let Some(index) = find_head_end(&buffer) {
            break index;
        }
        let read = socket.read(&mut chunk).await.unwrap_or(0);
        if read == 0 {
            return String::from_utf8_lossy(&buffer).into_owned();
        }
        buffer.extend_from_slice(&chunk[..read]);
    };

    let head = String::from_utf8_lossy(&buffer[..head_end]).to_ascii_lowercase();
    let length = content_length(&head);
    while buffer.len() - head_end - 4 < length {
        let read = socket.read(&mut chunk).await.unwrap_or(0);
        if read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..read]);
    }

    String::from_utf8_lossy(&buffer).into_owned()
}

fn find_head_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

fn content_length(head: &str) -> usize {
    head.lines()
        .find_map(|line| line.strip_prefix("content-length:"))
        .and_then(|value| value.trim().parse().ok())
        .unwrap_or(0)
}

/// 读取测试库地址；未配置或库名不合法时返回 `None`（调用方直接跳过）。
pub fn test_database_url() -> Option<String> {
    let uri = std::env::var("TEST_DATABASE_URL").ok()?;
    let uri = uri.trim().to_owned();
    if uri.is_empty() {
        return None;
    }
    let database = uri
        .rsplit('/')
        .next()
        .unwrap_or_default()
        .split('?')
        .next()
        .unwrap_or_default();
    assert!(
        database.contains("test"),
        "TEST_DATABASE_URL 指向的库名必须含 `test`（当前：{database}）"
    );

    Some(uri)
}

/// 每个用例独占 schema，避免用例之间互相看到对方的实例。
pub fn test_schema() -> String {
    format!("durable_test_{}", Uuid::new_v4().simple())
}

pub fn settings(uri: &str, schema: &str) -> DurableSettings {
    DurableSettings::new(uri, schema, true)
}

/// 轮询状态直到编排写到自己要等的那个进度串（或超时、或提前终态）。
///
/// 只该在「编排被桩按住不动」的时候调用：否则读到的进度可能已经翻到下一档，栅栏失效。
pub async fn wait_for_custom_status(client: &Client, instance: &str, want: &str) -> InstanceStatus {
    let deadline = Instant::now() + Duration::from_secs(30);
    // 记住看过的每一档，失败时一并打出来——能一眼看出是「没写过这一档」还是「读晚了」。
    let mut seen: Vec<String> = Vec::new();

    loop {
        let status = client.status(instance).await.expect("查询实例状态");
        if let InstanceStatus::Running { custom_status } = &status {
            let current = custom_status.clone().unwrap_or_else(|| "(无)".to_owned());
            if seen.last() != Some(&current) {
                seen.push(current);
            }
            if custom_status.as_deref() == Some(want) {
                return status;
            }
        }
        assert!(
            !status.is_terminal(),
            "实例在等到 {want} 之前已经终态：{status:?}（看过的进度：{seen:?}）"
        );
        assert!(
            Instant::now() < deadline,
            "等待自定义进度 {want} 超时，当前状态：{status:?}（看过的进度：{seen:?}）"
        );
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
}
