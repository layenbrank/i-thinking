# Findings & Decisions

## Requirements
- Overview Bing 建议搜索、展示、系统浏览器打开
- 滚动时触发 stagger（非削弱入场 stagger）
- Hover 后列表项不得大小跳动
- BING_ORIGIN → ENGINE.ORIGIN 嵌套常量

## Research Findings
- applyItemDepth 的 scale(0.985–1) + y 使相邻项尺度不同，鼠标划过像「大小在变」
- ScrollTrigger.batch + gsap.to stagger 才是滚动错峰
- ENGINE.ORIGIN.value = https://cn.bing.com

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| ScrollTrigger.batch | 滚动进入/离开时错峰 opacity |
| 无行级 scale/y | 稳定 hit-box |
| constants/engine.ts | coding-conventions 全大写嵌套 |

## Resources
- apps/client/src/lib/gsap-fragment.ts
- apps/client/src/constants/engine.ts
- apps/client/src/views/overview/overview.tsx
