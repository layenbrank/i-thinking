# @i-thinking/ui

共享 React UI 层：**shadcn/ui 原子组件** + **assistant-ui elements** + 设计 token。被 `apps/studio`（Electron）与 `apps/extension`（MV3）共用。

## 结构

```text
packages/ui/
├── components.json          # shadcn 配置（style/baseColor/iconLibrary 必须与各 app 一致）
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn 原子组件（CLI 安装）
│   │   └── assistant-ui/    # assistant-ui registry 组件（CLI 安装）
│   ├── hooks/
│   ├── lib/utils.ts         # cn()
│   └── styles/globals.css   # Tailwind v4 入口 + 全部设计 token（唯一源）
└── tsconfig.json            # @/* → ./src/*
```

## 约束

- **token 只在 `src/styles/globals.css` 定义**；app 侧通过 `@import "@i-thinking/ui/globals.css"` 引入，不要再定义同名变量。
- 组件的类名合并统一用 `cn()`（本包导出），app 不要各自再包一层。
- **包内一律相对路径导入**，不要使用 `@/...`：
  app 的 `resolve.tsconfigPaths` 会用 app 自己的 tsconfig 解析所有 importer 的 `@/*`，
  会把本包的内部导入解析到 `apps/<app>/src`（Vite 插件也拦不住，因为改写发生在插件之前）。
  本包 `tsconfig.json` 因此不声明 `paths`，残留的 `@/` 会在 `tsc --noEmit` 阶段直接报错。
- 新增组件走 CLI，不要手写目录结构：

```bash
# 在本包目录下执行（CLI 读本包的 components.json）
pnpm --filter @i-thinking/ui registry:add @assistant-ui/thread @assistant-ui/thread-list
pnpm --filter @i-thinking/ui registry:fix
```

> CLI 的 `--yes` **不会**跳过「文件已存在，是否覆盖」提示；非交互执行会静默挂起。
> 该提示处请回答 `n`（保留本仓已规范化的文件），不要用 `--overwrite`。

### `registry:fix` 是做什么的（必须跟着跑一次）

CLI 靠 tsconfig 的 `paths` 解析 `components.json` 里的 `@/…` aliases，而本包**故意不声明 `paths`**
（见上文约束）→ 它把 aliases 当成相对路径，产物会落到字面量目录 `@/components/…`，导入也留着 `@/…`。

`scripts/normalize-registry.mjs` 幂等地修掉这三件事：

1. `@/**` → `src/**`（目标已存在时保留本包版本，丢弃 CLI 的同名副本）
2. `@/…` 导入 → 相对路径
3. 去掉 `"use client"` 指令（Electron / MV3 非 RSC 环境）

之后再看 `package.json`：CLI 会按 registry 声明补依赖，需收敛到 `catalog:` 并删掉本包用不到的
（例如 `form` 条目带来的 `@hookform/resolvers`、`zod`）。

`src/components/assistant-ui/**` 是上游原样代码（已用 eslint override 放宽 `== null` / 空 catch / ref 读取），
不逐次改写——否则每次重新 add 都要重做一遍。

- 不执行 `shadcn eject`：保持 `shadcn/tailwind.css` 跟随上游更新。
- 商店/打包注意：本包只产出标准 React + 静态 CSS，无 `eval`，满足 MV3 CSP。

## 环境无关性

本包**不得**依赖 Node、Electron、`chrome.*`。需要这些能力时，通过端口接口由各 app 注入（见 `packages/chat`）。
