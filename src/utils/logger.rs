use anyhow::{Context, Result};
use std::{
    fs, io,
    time::{Duration, SystemTime},
};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};

const DEFAULT_LOG_DIR: &str = "logs";
const DEFAULT_LOG_FILE: &str = "service.log";
const DEFAULT_FILTER: &str = "info";
const DEFAULT_RETENTION_DAYS: u64 = 14;

/// 初始化 tracing：控制台人类可读输出 + 按日轮转 JSON 文件。
///
/// 返回的 `WorkerGuard` 必须持有到进程退出，否则非阻塞写入线程会被提前终止。
pub fn init() -> Result<WorkerGuard> {
    let log_dir = std::env::var("LOG_DIR").unwrap_or_else(|_| DEFAULT_LOG_DIR.to_string());
    let log_file = std::env::var("LOG_FILE").unwrap_or_else(|_| DEFAULT_LOG_FILE.to_string());
    let retention_days = std::env::var("LOG_RETENTION_DAYS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_RETENTION_DAYS);

    fs::create_dir_all(&log_dir)
        .with_context(|| format!("Failed to create log directory `{log_dir}`"))?;

    prune_old_logs(&log_dir, retention_days)?;

    let file_appender = tracing_appender::rolling::daily(&log_dir, &log_file);
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(DEFAULT_FILTER));

    let console_layer = fmt::layer().with_ansi(true).with_target(true);

    let file_layer = fmt::layer()
        .json()
        .with_ansi(false)
        .with_writer(non_blocking);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(console_layer)
        .with(file_layer)
        .try_init()
        .context("Failed to initialize tracing subscriber")?;

    // 把 actix / sqlx / sea-orm 等依赖的 `log` 记录接到 tracing。
    // tracing-subscriber 默认 feature 可能已安装，重复安装时忽略错误。
    let _ = tracing_log::LogTracer::init();

    tracing::info!(
        log_dir = %log_dir,
        log_file = %log_file,
        retention_days,
        "logger initialized"
    );

    Ok(guard)
}

fn prune_old_logs(log_dir: &str, retention_days: u64) -> Result<()> {
    let cutoff = SystemTime::now()
        .checked_sub(Duration::from_secs(
            retention_days.saturating_mul(24 * 60 * 60),
        ))
        .unwrap_or(SystemTime::UNIX_EPOCH);

    let entries = match fs::read_dir(log_dir) {
        Ok(entries) => entries,
        Err(err) if err.kind() == io::ErrorKind::NotFound => return Ok(()),
        Err(err) => {
            return Err(err).context(format!("Failed to read log directory `{log_dir}`"));
        }
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let Ok(modified) = entry.metadata().and_then(|m| m.modified()) else {
            continue;
        };
        if modified < cutoff {
            let _ = fs::remove_file(&path);
        }
    }

    Ok(())
}
