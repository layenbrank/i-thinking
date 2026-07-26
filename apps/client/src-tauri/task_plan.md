# Task Plan: Tauri Plugins Wire-up

## Goal
把 src-tauri 未接线/半成品插件（autostart、log、updater、process、cli、localhost）全部打通。

## Current Phase
Phase 7 complete

## Phases

### Phase 1: Planning files
- [x] Create task_plan.md / findings.md / progress.md
- **Status:** complete

### Phase 2: Autostart
- [x] store 同步 + GeneralPanel Switch + --minimized args
- **Status:** complete

### Phase 3: Log
- [x] plugins.rs 注册 + attachConsole
- **Status:** complete

### Phase 4: Updater + Process
- [x] updater 注册与前端入口；process exit/relaunch
- **Status:** complete

### Phase 5: CLI
- [x] 注册 + conf + getMatches
- **Status:** complete

### Phase 6: Localhost
- [x] 固定端口注册 + 导出常量
- **Status:** complete

### Phase 7: Verify
- [x] cargo check + tsc + 注释更新
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| store 为自启期望态 | 设置页偏好驱动 OS |
| localhost 不改主窗协议 | 避免破坏 mica/overlay |
| autostart args `--minimized` | 与 cli 协作托盘启动 |
| updater pubkey 本机生成 | 发版需保存对应私钥 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |
