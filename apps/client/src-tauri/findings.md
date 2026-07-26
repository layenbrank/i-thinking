# Findings & Decisions

## Requirements
- 全量接线：autostart / log / updater / process / cli / localhost
- 不强制主窗切 localhost External
- updater 无完整 CI；配置 + 调用入口即可

## Research Findings
- autostart 已在 bootstrap 注册；前端现已 enable/disable
- process 已 plugin()；前端现有 exit/relaunch
- cli：`--minimized` / `--verbose`；desktop + default capability
- localhost 端口：18923 → `http://localhost:18923`
- updater endpoint：`https://github.com/layenbrank/i-thinking/releases/latest/download/latest.json`
- 公钥已写入 tauri.conf；私钥曾生成于 `%TEMP%\i-thinking-updater.key`（发版前请妥善保管，勿提交仓库）

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| LOCALHOST_PORT = 18923 | 避开 Vite 5173 |
| CLI `--minimized` / `--verbose` | 自启托盘 + 日志级别 |
| GeneralPanel 含自启/检查更新/退出 | 产品入口集中 |

## Plugin Utilization Matrix
| Plugin | Wired |
|--------|-------|
| autostart | yes — settings Switch + OS sync + `--minimized` |
| log | yes — Stdout/LogDir/(debug)Webview + attachConsole |
| updater | yes — plugin + conf + tray/settings checkUpdate |
| process | yes — exitApp / relaunchApp |
| cli | yes — conf args + applyCliMatches |
| localhost | yes — port 18923, main window unchanged |
