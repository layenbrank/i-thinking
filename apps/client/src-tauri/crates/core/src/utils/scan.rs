use serde::{Deserialize, Serialize};
use sysinfo::System;

#[derive(Debug, Serialize, Deserialize)]
pub struct Memory {
    /// 总内存 (单位: KB)
    total: u64,
    /// 已用内存 (单位: KB)
    used: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Swap {
    /// 总交换空间 (单位: KB)
    total: u64,
    /// 已用交换空间 (单位: KB)
    used: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CPU {
    /// CPU 品牌
    brand: String,
    /// CPU 频率 (单位: MHz)
    frequency: u64,
    /// CPU 核心数
    cores: usize,
    /// 系统架构
    arch: String,
}

// #[serde(rename_all = "camelCase")]

// #[serde(rename = "UPPERCASE")]
#[derive(Debug, Serialize, Deserialize)]
// #[serde(rename_all = "camelCase")]
// #[serde(rename_all = "PascalCase")]
pub struct OSContext {
    /// 操作系统类型 (如: windows, linux, macos)
    #[serde(rename = "OS")]
    pub os: String,
    /// 操作系统版本
    // #[serde(rename = "version")]
    pub version: String,
    /// 内核版本
    pub kernel: String,
    /// 主机名
    pub hostname: String,

    // #[serde(rename = "ARCH")]
    // pub arch: String,
    #[serde(rename = "CPU")]
    pub cpu: CPU,

    pub memory: Memory,

    pub swap: Swap,
}

pub struct Scan;

impl Scan {
    pub fn os() -> OSContext {
        let mut sys = System::new_all();
        sys.refresh_all();

        // 获取第一个 CPU 的信息
        let cpu = sys.cpus().first();

        OSContext {
            os: System::name().unwrap_or_else(|| "Unknown".to_string()),
            version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
            kernel: System::kernel_version().unwrap_or_else(|| "Unknown".to_string()),
            hostname: System::host_name().unwrap_or_else(|| "Unknown".to_string()),
            cpu: CPU {
                brand: cpu
                    .map(|c| c.brand().to_string())
                    .unwrap_or_else(|| "Unknown".to_string()),
                frequency: cpu.map(|c| c.frequency()).unwrap_or(0),
                cores: sys.cpus().len(),
                arch: System::cpu_arch(),
            },
            memory: Memory {
                total: sys.total_memory(),
                used: sys.used_memory(),
            },
            swap: Swap {
                total: sys.total_swap(),
                used: sys.used_swap(),
            },
        }
    }
}
