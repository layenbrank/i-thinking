use std::{
    fs, io,
    time::{Duration, SystemTime},
};

use anyhow::{Context, Result};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_appender::rolling::{Builder as RollingBuilder, Rotation};
use tracing_subscriber::{
    EnvFilter, fmt, fmt::time::ChronoLocal, layer::SubscriberExt, util::SubscriberInitExt,
};

const DEFAULT_LOG_DIR: &str = "logs";
const DEFAULT_FILTER: &str = "info";
const DEFAULT_RETENTION_DAYS: u64 = 14;
/// 控制台 / 文件时间：精确到毫秒
const TIME_FMT: &str = "%Y-%m-%d %H:%M:%S%.3f";
const TIME_FMT_UTC: &str = "%Y-%m-%dT%H:%M:%S%.3fZ";

/// 初始化 tracing：控制台人类可读 + 按日文件 `YYYY-MM-DD.log`（JSON）。
///
/// 返回的 `WorkerGuard` 必须持有到进程退出。
pub fn init() -> Result<WorkerGuard> {
    let log_dir = std::env::var("LOG_DIR").unwrap_or_else(|_| DEFAULT_LOG_DIR.to_string());
    let retention_days = std::env::var("LOG_RETENTION_DAYS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(DEFAULT_RETENTION_DAYS);
    let log_format = std::env::var("LOG_FORMAT")
        .unwrap_or_else(|_| "pretty".to_string())
        .to_lowercase();

    fs::create_dir_all(&log_dir)
        .with_context(|| format!("Failed to create log directory `{log_dir}`"))?;

    prune_old_logs(&log_dir, retention_days)?;

    // 仅 suffix → 文件名 `YYYY-MM-DD.log`
    let file_appender = RollingBuilder::new()
        .rotation(Rotation::DAILY)
        .filename_suffix("log")
        .build(&log_dir)
        .context("Failed to build daily log appender")?;
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let env_filter =
        EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new(DEFAULT_FILTER));

    let file_layer = fmt::layer()
        .json()
        .with_ansi(false)
        .with_current_span(false)
        .with_span_list(false)
        .with_timer(fmt::time::ChronoUtc::new(TIME_FMT_UTC.to_string()))
        .with_writer(non_blocking);

    let registry = tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer);

    if log_format == "compact" {
        registry
            .with(
                fmt::layer()
                    .compact()
                    .with_ansi(true)
                    .with_target(true)
                    .with_level(true)
                    .with_timer(ChronoLocal::new(TIME_FMT.to_string())),
            )
            .try_init()
            .context("Failed to initialize tracing subscriber")?;
    } else {
        registry
            .with(
                fmt::layer()
                    .pretty()
                    .with_ansi(true)
                    .with_target(true)
                    .with_file(false)
                    .with_line_number(false)
                    .with_thread_ids(false)
                    .with_thread_names(false)
                    .with_timer(ChronoLocal::new(TIME_FMT.to_string())),
            )
            .try_init()
            .context("Failed to initialize tracing subscriber")?;
    }

    let _ = tracing_log::LogTracer::init();

    tracing::info!(
        log_dir = %log_dir,
        log_pattern = "%Y-%m-%d.log",
        retention_days,
        log_format = %log_format,
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
        // 仅清理 `*.log`（含 `2026-08-20.log` 与旧 `service.log.*`）
        let is_log = path
            .extension()
            .and_then(|e| e.to_str())
            .is_some_and(|e| e == "log")
            || path
                .file_name()
                .and_then(|n| n.to_str())
                .is_some_and(|n| n.contains(".log."));
        if !is_log {
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
