# Findings & Decisions

## Requirements
- 安装后用户不设环境变量
- pdfium 与 corex-serve 同目录
- 不打包 corex.exe CLI

## Research Findings
- corex-serve 静态链接 corex-core（feature serve）；不 spawn corex.exe
- `\\.\pipe\corex` 仅为管道名
- pdfium::load 只搜 serve 旁目录，再搜 COREX_PDFIUM_DIR
- 原 resources 列表项 `binaries/pdfium.dll` → `$RESOURCE/binaries/pdfium.dll`，与 serve 分离

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| resources map: binaries/pdfium.dll → pdfium.dll | Windows $RESOURCE ≈ 主程序目录 |
| 删除 apply_pdfium_env | 避免用 env 掩盖错误布局 |
| pandoc/ffmpeg 仍在 binaries/ | 非 serve 同目录依赖 |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- tauri.conf.json bundle.resources / externalBin
- src/utils/sidecar.rs
- scripts/prepare.ts
- corex: corex-core/src/morph/pdfium.rs
