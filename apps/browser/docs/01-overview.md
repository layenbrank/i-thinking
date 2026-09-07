# 01 — 总览：三块东西分别干什么

把「浏览器产品」拆成三层，避免和 Electron Studio 或临时目录搞混。

## 1. `apps/browser`（本仓库里的产品包）

**是什么：** monorepo 中的 `@i-thinking/browser`。

**干什么：**

- React WebUI（最终挂到 `chrome://i-thinking`）
- Chromium **overlay / patches**（品牌、书签栏「应用」按钮、WebUI 注册等）
- 仓库 CLI：`pnpm command browser`（实现于 `scripts/commands/features/browser`）
- 面向开发者的文档

**特点：** 体积小、进 Git、可 PR。**不包含**完整 Chromium 源码。

## 2. `D:\i-thinking-browser\depot_tools`（工具链）

**是什么：** Google 官方 Chromium 开发工具集（`gclient` / `fetch` / `gn` / `autoninja` / CIPD 等）。

**干什么：** 下载 Chromium、同步依赖、生成构建文件、调用编译器。

**特点：** 本机安装一份即可；不进 monorepo。

## 3. `D:\i-thinking-browser\chromium\src`（引擎源码）

**是什么：** Chromium 源码树（`CHROMIUM_ROOT`）。

**干什么：** 真正的浏览器内核与壳；你的 overlay 会拷进这里再编译出 `chrome.exe` / `i-thinking.exe`。

**特点：** 体积极大（十余 GB 起）；不提交进 monorepo。

## 关系图

```text
┌─────────────────────────────────────────────────────────┐
│  monorepo: apps/browser                                 │
│  - WebUI / overlay / patches / docs                     │
│  CLI: scripts/commands/features/browser                 │
└───────────────────────────┬─────────────────────────────┘
                            │ browser apply / sync
                            ▼
┌─────────────────────────────────────────────────────────┐
│  D:\i-thinking-browser\                                 │
│  ├─ depot_tools\     ← browser bootstrap                │
│  └─ chromium\                                           │
│       ├─ .gclient                                       │
│       └─ src\            ← browser fetch / build        │
│            └─ out\i-thinking\chrome.exe                 │
└─────────────────────────────────────────────────────────┘
```

## 和 `apps/studio` 的关系

| | `apps/studio` | `apps/browser` |
|--|---------------|----------------|
| 技术 | Electron | Chromium fork |
| 职责 | 桌面应用壳 | 浏览器产品（WebUI + 内核定制） |
| 是否编 Chromium | 否 | 是 |

Chromium fork 相关代码与脚本只放在 `apps/browser`。

## 下一步

→ [02-environment.md](./02-environment.md)
