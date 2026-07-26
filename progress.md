# Progress Log

## Session: 2026-07-26 (scroll stagger fix)

### Phase B: Scroll stagger + ENGINE naming
- **Status:** complete
- Actions taken:
  - gsap-fragment：删除 applyItemDepth scale/y；改用 ScrollTrigger.batch 滚动 stagger（opacity 0.9↔1）
  - 新增 constants/engine.ts（ENGINE.ORIGIN）
  - overview：BING_ORIGIN → ENGINE.ORIGIN.value
  - scss：去掉 fragmentValue 的 will-change:transform
- Files created/modified:
  - apps/client/src/lib/gsap-fragment.ts
  - apps/client/src/constants/engine.ts (created)
  - apps/client/src/views/overview/overview.tsx
  - apps/client/src/views/overview/overview.module.scss
  - task_plan.md / findings.md / progress.md

## Test Results
| Test | Expected | Status |
|------|----------|--------|
| 滚动列表 | 条目错峰淡入 | manual |
| Hover 划过 | 无大小跳动 | manual |
| 打开链接 | cn.bing.com via ENGINE.ORIGIN.value | code |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Phase B complete |
| What's the goal? | 滚动 stagger + 无 Hover 跳动 + ENGINE 命名 |
| What have I learned? | See findings.md |
| What have I done? | See above |
