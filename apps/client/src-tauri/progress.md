# Progress Log

## Session: 2026-08-07

### Phase 0–3: pdfium 同目录
- **Status:** complete
- Actions taken:
  - resources map：`binaries/pdfium.dll` → `pdfium.dll`
  - 删除 sidecar `apply_pdfium_env` / `pdfium_candidate_dirs`
  - 更新 prepare.ts / README 注释
  - cargo check 通过
- Files modified:
  - tauri.conf.json
  - src/utils/sidecar.rs
  - scripts/prepare.ts
  - README.md
  - task_plan.md, findings.md, progress.md

## Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| cargo check | ok | ok | pass |

## 安装目录验收（重打包后）
```
{安装根}/
  主程序.exe
  corex-serve.exe
  pdfium.dll              ← 与 serve 同级
  binaries/pandoc.exe
  binaries/ffmpeg.exe
  binaries/ffprobe.exe
```
不需要 `corex.exe`，不需要用户设 `COREX_*`。

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | All phases complete |
| Where am I going? | Done |
| What's the goal? | pdfium 与 serve 同级 |
| What have I learned? | See findings.md |
| What have I done? | See above |
