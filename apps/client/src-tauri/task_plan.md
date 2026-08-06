# Task Plan: corex-serve / pdfium 同目录修复

## Goal
安装后无需用户环境变量：`corex-serve.exe` 与 `pdfium.dll` 同级；删除 `COREX_PDFIUM_DIR` 注入；不打包 `corex.exe`。

## Current Phase
Phase 3 complete

## Phases

### Phase 0: Planning files
- [x] 重写 task_plan / findings / progress
- **Status:** complete

### Phase 1: Resources remap
- [x] pdfium.dll → `$RESOURCE/pdfium.dll`
- **Status:** complete

### Phase 2: Remove pdfium env injection
- [x] 删除 apply_pdfium_env / pdfium_candidate_dirs
- **Status:** complete

### Phase 3: Docs + verify
- [x] prepare/README 注释；cargo check
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 不打包 corex.exe | serve 内嵌 corex-core；CLI 非运行时依赖 |
| pdfium 映射到资源根 | 与 serve 同目录，符合 corex 查找约定 |
| 删除 COREX_PDFIUM_DIR 注入 | 布局正确后不再需要 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       |         |            |
