# 工程文档索引（markdown/）

本目录是 monorepo **内部工程笔记与运维手册**，与 VitePress 站点 [`apps/docs`](../apps/docs) 分离：

| 区域 | 职责 |
|------|------|
| `markdown/` | CI/CD、排查记录、应用专题、第三方 API 参考 |
| `apps/docs` | 对外/产品向文档站 |

## 运维（ops/）

| 文档 | 说明 |
|------|------|
| [ops/ci-cd.md](./ops/ci-cd.md) | CI、发版、Secrets、bump |
| [ops/testing.md](./ops/testing.md) | Vitest / Jest 约定与示例入口 |
| [ops/pnpm-and-native-mirrors.md](./ops/pnpm-and-native-mirrors.md) | pnpm 11 配置与 Electron 镜像 |

## Client（client/）

| 文档 | 说明 |
|------|------|
| [client/zustand-dexie-rxjs.md](./client/zustand-dexie-rxjs.md) | Zustand + Dexie + RxJS（项目级） |
| [client/components-api.md](./client/components-api.md) | Client 业务组件 API |
| [client/components-semantic.md](./client/components-semantic.md) | Client 组件语义化 class |
| [client/tauri-remote.md](./client/tauri-remote.md) | Tauri `remote.urls` 白名单 |

Zustand 基础用法见 [apps/docs/guides/zustand.md](../apps/docs/guides/zustand.md)。

## Extension（extension/）

| 文档 | 说明 |
|------|------|
| [extension/ai-streaming-iframe.md](./extension/ai-streaming-iframe.md) | AI 流式 + iframe 渲染 |
| [extension/examples/ai-streaming-iframe-demo.md](./extension/examples/ai-streaming-iframe-demo.md) | 父页 API 调用示例 |

## 参考（reference/）

| 文档 | 说明 |
|------|------|
| [reference/dnd-kit-grid.md](./reference/dnd-kit-grid.md) | @dnd-kit 网格拖拽笔记（client / studio） |
| [reference/sortablejs.md](./reference/sortablejs.md) | Sortable.js API 笔记（client / extension） |
| [reference/antd/llms-full-cn.txt](./reference/antd/llms-full-cn.txt) | Ant Design 官方 llms-full 中文 dump |
| [reference/antd/llms-semantic-cn.md](./reference/antd/llms-semantic-cn.md) | Ant Design 官方 semantic 中文 dump |

## 调试入口

不另维护长篇 DEBUG 指南。日常调试请使用：

- 仓库 `.vscode/` 启动与任务配置
- 各应用 README：`apps/client`、`apps/studio`、`apps/extension` 等
