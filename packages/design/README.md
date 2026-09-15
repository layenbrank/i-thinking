# @i-thinking/design

设计系统：**shadcn/ui 原子组件** + **assistant-ui elements** + 设计 token。被 `apps/studio`（Electron）与 `apps/extension`（MV3）共用。

## 结构

```text
packages/design/
├── components.json          # shadcn 配置（style/baseColor/iconLibrary 必须与各 app 一致）
├── src/
│   ├── components/          # shadcn 原子组件（CLI 安装）
│   ├── assistant/           # assistant-ui registry 组件（CLI 安装）
│   ├── hooks/
│   └── styles/globals.css   # Tailwind v4 入口 + 全部设计 token（唯一源）
└── tsconfig.json            # paths 把包名映射到 ./src/*，供 CLI 解析别名
```

对齐官方 monorepo 模板（`packages/ui`）的形态：**目录名即子路径**，`src/components` / `src/hooks` /
`src/styles` 三件套，没有通配包根这一类后门。

## 导入路径

| 导入写法                                         | 实际文件                             |
| ------------------------------------------------ | ------------------------------------ |
| `@i-thinking/design/components/button`           | `src/components/button.tsx`          |
| `@i-thinking/design/assistant/thread.aui`        | `src/assistant/thread.aui.tsx`       |
| `@i-thinking/design/hooks/use-copy-to-clipboard` | `src/hooks/use-copy-to-clipboard.ts` |
| `@i-thinking/design/globals.css`                 | `src/styles/globals.css`             |

`package.json` 里 **`exports`（对外）与 `imports`（包内自引用）两张表并存** —— 官方模板同款：

| 表        | 前缀                                     | 用途                       |
| --------- | ---------------------------------------- | -------------------------- |
| `exports` | `@i-thinking/design/*`                   | 各 app 消费                |
| `imports` | `#components/*`、`#assistant/*`、`#hooks/*` | 本包组件之间互相引用       |

新增一类组件 = 在 `src/` 建目录，并同时补 `exports` 与 `imports` 两张表。

## 约束

- **token 只在 `src/styles/globals.css` 定义**；app 侧通过 `@import "@i-thinking/design/globals.css"` 引入，不要再定义同名变量。
- 类名合并统一用 `cn`，直接从 `cn` 包导入（`import { cn } from 'cn'`）；不要再包一层 re-export。
- **包内互相引用用 `#components/*`、`#hooks/*`**（`package.json` 的 `imports` 表），不要用 `@/...`：
  app 的 `resolve.tsconfigPaths` 会用 app 自己的 tsconfig 解析**所有 importer** 的 `@/*`，
  会把本包的内部导入解析到 `apps/<app>/src`（Vite 插件也拦不住，因为改写发生在插件之前）。
  `#` 前缀是 Node 的子路径导入语法，**不与 app 的 `@/*` 冲突**，这正是官方模板用它做包内自引用的原因。
- 新增组件走 CLI，不要手写目录结构：

```bash
# 在本包目录下执行（CLI 读本包的 components.json）
pnpm --filter @i-thinking/design registry:add @assistant-ui/thread @assistant-ui/thread-list
```

CLI 靠本包 `tsconfig.json` 的 `paths`（`@i-thinking/design/*` → `./src/*`）解析 `components.json` 里的别名，
产物因此**直接落到** `src/components/`、`src/assistant/`，不需要任何后处理脚本。

> 若 CLI 提示「文件已存在，是否覆盖」：回答 `n` 保留本仓已规范化的文件，不要用 `--overwrite`。
> 装完检查 `package.json`：CLI 会按 registry 声明补依赖，需收敛到 `catalog:` 并删掉本包用不到的
> （例如 `form` 条目带来的 `@hookform/resolvers`、`zod`）。

`src/assistant/**` 是上游原样代码（已用 eslint override 放宽 `== null` / 空 catch / ref 读取），
不逐次改写——否则每次重新 add 都要重做一遍。

- 不执行 `shadcn eject`：保持 `shadcn/tailwind.css` 跟随上游更新。
- 商店/打包注意：本包只产出标准 React + 静态 CSS，无 `eval`，满足 MV3 CSP。

## 环境无关性

本包**不得**依赖 Node、Electron、`chrome.*`。需要这些能力时，通过端口接口由各 app 注入（见 `packages/chat`）。
