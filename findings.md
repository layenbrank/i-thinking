# Findings & Decisions

## Requirements
- Windows Tauri 安装包 + GitHub Release
- 拆 service 为独立 GHCR 推送工作流
- 新版 Actions：checkout@v6、cache@v5、softprops/action-gh-release@v3
- 清理 continuous-delivery / 空 continuous-deployment

## Research Findings
- client `build` = `tauri build`；`build:core` = 仅 Vite dist
- updater endpoint: `https://github.com/layenbrank/i-thinking/releases/latest/download/latest.json`
- sidecar 已跟踪：`apps/client/src-tauri/binaries/corex-serve-x86_64-pc-windows-msvc.exe` + `pdfium.dll`
- 根 package.json：node >= 24.18、pnpm@11.17

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| client-release.yaml | 独立子项目发布 |
| service-release.yaml | 从单体 CD 拆出 |
| CI 排除 tauri build | Ubuntu 无法可靠跑桌面包 |

## Resources
- corex: `D:/Documents/Rust/corex/master/.github/workflows/publish-release.yml`
- tauri.conf.json updater + createUpdaterArtifacts
