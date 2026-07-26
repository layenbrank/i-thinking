# Task Plan: Overview Engine Search + Scroll FX

## Goal
Overview 搜索建议 + 系统浏览器打开；滚动 batch stagger；Hover 无尺寸跳动；ENGINE 嵌套常量。

## Current Phase
Phase: Scroll FX fix — complete

## Phases

### Phase A: Engine IPC search
- [x] IPC action + whitelist engine
- [x] engine-ipc + overview 搜索/打开
- **Status:** complete

### Phase B: Scroll stagger + hover fix + ENGINE naming
- [x] 移除 scale/y depth，ScrollTrigger.batch 滚动 stagger
- [x] constants/engine.ts ENGINE.ORIGIN
- [x] overview 使用 ENGINE.ORIGIN.value
- [x] scss 去掉行级 will-change:transform
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| batch stagger 非 continuous scale | 滚动错峰 + 避免 Hover 尺度跳动 |
| ENGINE 放 constants/engine.ts | 对齐现有 constants/ |
| 仅改 opacity | 行盒几何稳定 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| 误读「入场 stagger 突兀」 | 1 | 澄清为滚动时也要 stagger |
| applyItemDepth scale 导致 Hover 跳动 | 1 | 删除 scale/y，改 batch |
