# i thinking Studio

Electron 桌面应用（`@i-thinking/studio`）：Forge + Vite，主进程域模块 + 契约 IPC（`window.studio`），业务 HTTP 走远程 API。

## 文档

完整文档索引：**[docs/README.md](./docs/README.md)**

| 文档 | 说明 |
|------|------|
| [架构方案](./docs/architecture.md) | 进程边界、组合根、IPC |
| [开发指南](./docs/development.md) | 环境、脚本、扩展 |
| [使用示例](./docs/examples.md) | 可复制调用与新增 IPC |
| [API 参考](./docs/api-reference.md) | Channel / 错误码 |
| [排障](./docs/troubleshooting.md) | 启动与 IPC 常见问题 |

## 快速开始

在 monorepo 根目录：

```bash
pnpm install
pnpm --filter @i-thinking/studio dev
```

仅网页预览（无 `window.studio`）：

```bash
pnpm --filter @i-thinking/studio dev:core
```

单元测试：

```bash
pnpm --filter @i-thinking/studio test:unit
```

## 源码结构

```text
src/main | src/preload | src/renderer | src/shared | sidecar/
```

详见 [docs/architecture.md](./docs/architecture.md)。
