# Studio 文档

**i thinking Studio** 是基于 Electron Forge + Vite 的桌面应用：主进程域模块 + 契约 IPC + 安全白名单 preload；业务 HTTP 走远程 API，**不**嵌入 Nest sidecar。

## 按角色阅读

| 你想… | 先看 |
|-------|------|
| 了解整体怎么分层 | [架构方案](./architecture.md) |
| 本地跑起来 / 加功能入口 | [开发指南](./development.md) |
| 复制粘贴调 `window.studio` | [使用示例](./examples.md) |
| 查方法、Channel、错误码 | [API 参考](./api-reference.md) |
| 查 Main 模块职责与路径 | [模块说明](./modules.md) |
| 安全基线与威胁模型 | [安全](./security.md) |
| 打包、bin 资源、Fuses | [打包](./packaging.md) |
| 启动失败 / IPC 拒绝 | [排障](./troubleshooting.md) |

## 文档列表

| 文档 | 说明 |
|------|------|
| [architecture.md](./architecture.md) | 进程边界、组合根、IPC、决策表 |
| [development.md](./development.md) | 环境、脚本、别名、测试、扩展入口 |
| [examples.md](./examples.md) | 调用样例 + 新增 IPC 全链路 |
| [api-reference.md](./api-reference.md) | `StudioApi` / channels / 错误码 |
| [modules.md](./modules.md) | Main 各模块职责 |
| [security.md](./security.md) | sandbox、CSP、信任模型、Fuses |
| [packaging.md](./packaging.md) | Forge、资源、产物 |
| [troubleshooting.md](./troubleshooting.md) | 常见故障与处理 |
| [renderer-vite-root-cause.md](./renderer-vite-root-cause.md) | monorepo + Vite CJS 预构建问题 |

## 源码地图（速查）

```text
apps/studio/src/
├── main/       # Electron 主进程（组合根 + modules）
├── preload/    # contextBridge → window.studio
├── renderer/   # React UI（@ → 此处）
├── shared/     # 跨进程契约（ipc）
└── bin/        # 白名单原生可执行文件
```
