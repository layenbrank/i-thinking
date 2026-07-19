# Findings: Studio 企业级重构

## 目录边界（进程优先）

```text
apps/studio/src/
  main/       # Electron Main only
  preload/    # Preload bridge only
  shared/     # 跨进程契约（无 Node/Electron 副作用）
  renderer/   # 全部 UI / 业务前端（@ → 此处）
  bin/        # 原生可执行（Main 白名单加载）
```

- `@/*` → `src/renderer/*`
- `@main/*` / `@shared/*` / `@preload/*` 分进程别名
- ESLint 禁止 renderer↔main 交叉引用
