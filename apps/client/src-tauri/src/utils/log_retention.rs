//! 日志保留：插件按文件数轮转；启动时再按时间清理超期归档。

use std::fs;
use std::path::Path;
use std::time::{Duration, SystemTime};

use tauri::{AppHandle, Manager};

/// 保留最近 30 天内的日志文件。
pub const LOG_RETENTION_DAYS: u64 = 30;

/// 单文件上限（字节），超出后轮转为带日期后缀的归档。
pub const LOG_MAX_FILE_SIZE: u128 = 5 * 1024 * 1024;

/// 同时保留的归档数量（不含当前活动文件），避免 KeepAll 撑满磁盘。
pub const LOG_MAX_FILE_COUNT: usize = 14;

#[derive(Debug, Default, PartialEq, Eq)]
pub struct PruneStats {
    pub removed: usize,
    pub failed: usize,
    pub skipped: usize,
}

/// 删除 `app_log_dir` 中修改时间早于保留期的 `.log` / `.log.bak`。
pub fn prune_stale_logs(app: &AppHandle) {
    let Ok(dir) = app.path().app_log_dir() else {
        log::warn!(target: "thinking::log", "skip prune: app log dir unavailable");
        return;
    };
    let Some(cutoff) = SystemTime::now().checked_sub(Duration::from_secs(
        LOG_RETENTION_DAYS.saturating_mul(24 * 60 * 60),
    )) else {
        return;
    };

    let stats = prune_log_dir(&dir, cutoff);
    if stats.removed > 0 {
        log::info!(
            target: "thinking::log",
            "pruned {} stale log file(s)",
            stats.removed
        );
    }
    if stats.failed > 0 {
        log::warn!(
            target: "thinking::log",
            "failed to prune {} log file(s)",
            stats.failed
        );
    }
}

/// 按截止时间清理目录中的日志归档。可单测。
pub fn prune_log_dir(dir: &Path, cutoff: SystemTime) -> PruneStats {
    let mut stats = PruneStats::default();
    if !dir.is_dir() {
        return stats;
    }

    let Ok(entries) = fs::read_dir(dir) else {
        stats.failed += 1;
        return stats;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !is_log_file(&path) {
            stats.skipped += 1;
            continue;
        }

        let Ok(meta) = entry.metadata() else {
            stats.failed += 1;
            continue;
        };
        let Ok(modified) = meta.modified() else {
            stats.failed += 1;
            continue;
        };
        if modified >= cutoff {
            stats.skipped += 1;
            continue;
        }
        match fs::remove_file(&path) {
            Ok(()) => stats.removed += 1,
            Err(_) => stats.failed += 1,
        }
    }

    stats
}

fn is_log_file(path: &Path) -> bool {
    let Some(name) = path.file_name().and_then(|n| n.to_str()) else {
        return false;
    };
    name.ends_with(".log") || name.ends_with(".log.bak")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::UNIX_EPOCH;

    fn unique_dir() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "thinking-log-prune-{}-{}",
            std::process::id(),
            UNIX_EPOCH.elapsed().map(|d| d.as_nanos()).unwrap_or(0)
        ));
        fs::create_dir_all(&dir).expect("temp log dir");
        dir
    }

    #[test]
    fn prune_removes_expired_logs_only() {
        let dir = unique_dir();
        let stale = dir.join("app_2000-01-01.log");
        let keep = dir.join("notes.txt");
        fs::write(&stale, b"old").unwrap();
        fs::write(&keep, b"keep").unwrap();

        let future = SystemTime::now()
            .checked_add(Duration::from_secs(60))
            .expect("cutoff");
        let stats = prune_log_dir(&dir, future);

        assert_eq!(stats.removed, 1);
        assert!(!stale.exists());
        assert!(keep.exists());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn prune_keeps_recent_logs() {
        let dir = unique_dir();
        let recent = dir.join("i-thinking.log");
        fs::write(&recent, b"now").unwrap();

        let stats = prune_log_dir(&dir, UNIX_EPOCH);
        assert_eq!(stats.removed, 0);
        assert!(recent.exists());
        let _ = fs::remove_dir_all(&dir);
    }
}
