# @i-thinking/design

设计系统：**shadcn/ui 原子组件** + **assistant-ui elements** + 设计 token。被 `apps/studio`（Electron）与 `apps/extension`（MV3）共用。

## 结构

```text
packages/design/
├── components.json          # shadcn 配置（style/baseColor/iconLibrary 必须与各 app 一致）
├── scripts/registry.ts        # CLI 产物按分类落位（见下文；Node 直接执行，无需编译）
├── src/
│   ├── primitive/           # shadcn 原子组件（CLI 安装）
│   ├── assistant/           # assistant-ui registry 组件（CLI 安装）
│   ├── composite/           # 组合/装配层（shadcn CLI 的 components/ 落点）
│   ├── hooks/
│   ├── lib/                 # CLI 的 lib/ 落点（cn 直接走 'cn' 包）
│   └── styles/globals.css   # Tailwind v4 入口 + 全部设计 token（唯一源）
└── tsconfig.json            # 故意不声明 paths（见「约束」）
```

**目录名即子路径**：`src/<分类>/x.tsx` ↔ `@i-thinking/design/<分类>/x`，没有通配包根这一类后门。
新增一类组件 = 在 `src/` 建一个目录 + 在 `package.json` 的 exports 加一行 + 在
`scripts/registry.ts` 的 `AREAS` 表加一行（CLI 落点由这张表决定）。

## 导入路径

包名已含 `ui`，所以不再出现 `components/ui` 这样的重复段：

| 导入写法                                         | 实际文件                                              |
| ------------------------------------------------ | ----------------------------------------------------- |
| `@i-thinking/design/primitive/button`            | `src/primitive/button.tsx`                            |
| `@i-thinking/design/assistant/thread.aui`        | `src/assistant/thread.aui.tsx`                        |
| `@i-thinking/design/composite/<name>`            | `src/composite/<name>.tsx`（shadcn CLI 复合组件落点） |
| `@i-thinking/design/hooks/use-copy-to-clipboard` | `src/hooks/use-copy-to-clipboard.ts`                  |
| `@i-thinking/design/lib/<name>`                  | `src/lib/<name>.ts`（CLI 的 lib/ 落点）               |
| `@i-thinking/design/globals.css`                 | `src/styles/globals.css`                              |

`package.json` 的 exports 就是上面六个条目，每个通配一个**完整目录**（`./globals.css` 为显式条目）。
新增组件只要落在对应目录里就能直接导入；新开一类目录则同时补 exports 与 `AREAS` 表两行。

## 约束

- **token 只在 `src/styles/globals.css` 定义**；app 侧通过 `@import "@i-thinking/design/globals.css"` 引入，不要再定义同名变量。
- 类名合并统一用 `cn`，直接从 `cn` 包导入（`import { cn } from 'cn'`）；不要再包一层 re-export。
- **包内一律相对路径导入**，不要使用 `@/...`：
  app 的 `resolve.tsconfigPaths` 会用 app 自己的 tsconfig 解析所有 importer 的 `@/*`，
  会把本包的内部导入解析到 `apps/<app>/src`（Vite 插件也拦不住，因为改写发生在插件之前）。
  本包 `tsconfig.json` 因此不声明 `paths`，残留的 `@/` 会在 `tsc --noEmit` 阶段直接报错。
- 新增组件走 CLI，不要手写目录结构：

```bash
# 在本包目录下执行（CLI 读本包的 components.json）
pnpm --filter @i-thinking/design registry:add @assistant-ui/thread @assistant-ui/thread-list
pnpm --filter @i-thinking/design registry:fix
```

> CLI 的 `--yes` **不会**跳过「文件已存在，是否覆盖」提示；非交互执行会静默挂起。
> 该提示处请回答 `n`（保留本仓已规范化的文件），不要用 `--overwrite`。

### `registry:fix` 是做什么的（必须跟着跑一次）

CLI 靠 tsconfig 的 `paths` 解析 `components.json` 里的 `@/…` aliases，而本包**故意不声明 `paths`**
（见上文约束）→ 它把 aliases 当成相对路径，产物会落到字面量目录 `@/components/…`，导入也留着 `@/…`。

`scripts/registry.ts` 幂等地修掉这三件事：

1. `@/**` → `src/**`（目标已存在时保留本包版本，丢弃 CLI 的同名副本）
2. `@/…` 导入 → 相对路径
3. 去掉 `"use client"` 指令（Electron / MV3 非 RSC 环境）

之后再看 `package.json`：CLI 会按 registry 声明补依赖，需收敛到 `catalog:` 并删掉本包用不到的
（例如 `form` 条目带来的 `@hookform/resolvers`、`zod`）。

> 新增组件的**文件落点**由 registry 条目自己的 `target` 决定（CLI 写到 `@/components/ui/*` 等镜像目录），
> `registry:fix` 再按 `AREAS` 表把它归到 `src/primitive/*`、`src/assistant/*`、`src/composite/*`。
> 导出路径只是给消费方的入口，不影响 CLI 写到哪；反之新增组件也不会因为 exports 的写法跑到别处。

`src/components/assistant-ui/**` 是上游原样代码（已用 eslint override 放宽 `== null` / 空 catch / ref 读取），
不逐次改写——否则每次重新 add 都要重做一遍。

- 不执行 `shadcn eject`：保持 `shadcn/tailwind.css` 跟随上游更新。
- 商店/打包注意：本包只产出标准 React + 静态 CSS，无 `eval`，满足 MV3 CSP。

## 环境无关性

本包**不得**依赖 Node、Electron、`chrome.*`。需要这些能力时，通过端口接口由各 app 注入（见 `packages/chat`）。
