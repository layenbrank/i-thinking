use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use config::{Config, File, FileFormat};

/// 解析 profile：shell `APP_ENV` / `RUST_ENV` 可覆盖，否则读 `config.yaml` 的 `app.env`。
pub fn resolve_profile() -> String {
    if let Ok(v) = std::env::var("APP_ENV").or_else(|_| std::env::var("RUST_ENV")) {
        return v.to_ascii_lowercase();
    }
    peek_app_env_from_base().unwrap_or_else(|| "development".to_string())
}

/// 配置文件目录：可执行文件旁；debug 下回退 crate 根或 workspace 根。
pub fn config_dir() -> PathBuf {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    let exe_config = exe_dir.join("config.yaml");
    if exe_config.exists() {
        return exe_dir;
    }

    if cfg!(debug_assertions) {
        if let Ok(manifest) = std::env::var("CARGO_MANIFEST_DIR") {
            let root = PathBuf::from(manifest);
            if root.join("config.yaml").exists() {
                return root;
            }
            if let Some(parent) = root.parent() {
                if parent.join("config.yaml").exists() {
                    return parent.to_path_buf();
                }
            }
        }
    }

    exe_dir
}

fn peek_app_env_from_base() -> Option<String> {
    let dir = config_dir();
    let base = dir.join("config.yaml");
    if !base.exists() {
        return None;
    }
    Config::builder()
        .add_source(File::from(base.as_path()).format(FileFormat::Yaml))
        .build()
        .ok()?
        .get_string("app.env")
        .ok()
        .map(|s| s.to_ascii_lowercase())
}

fn yaml_file(dir: &Path, name: &str) -> PathBuf {
    dir.join(name)
}

/// 合并 `config.yaml` → `config.{profile}.yaml` → `config.local.yaml`。
pub fn load_merged_config(profile: &str) -> Result<Config> {
    let dir = config_dir();
    let base = yaml_file(&dir, "config.yaml");
    if !base.exists() {
        anyhow::bail!(
            "missing config file: {} (config_dir={})",
            base.display(),
            dir.display()
        );
    }

    let profile_name = format!("config.{}.yaml", profile);
    let profile_file = yaml_file(&dir, &profile_name);
    let local_file = yaml_file(&dir, "config.local.yaml");

    let mut builder =
        Config::builder().add_source(File::from(base.as_path()).format(FileFormat::Yaml));

    if profile_file.exists() {
        builder = builder.add_source(File::from(profile_file.as_path()).format(FileFormat::Yaml));
    }

    if local_file.exists() {
        builder = builder.add_source(File::from(local_file.as_path()).format(FileFormat::Yaml));
    }

    builder
        .build()
        .with_context(|| format!("failed to build config from dir {}", dir.display()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_dir_points_at_repo_config_in_tests() {
        let dir = config_dir();
        assert!(dir.join("config.yaml").exists());
    }
}
