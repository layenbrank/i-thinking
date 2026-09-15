# Studio host 能力说明

组合根：[`src/main.ts`](../../../apps/studio/src/main.ts)。

注册顺序（当前）：

1. security
2. store
3. dialog
4. database
5. window
6. devtools
7. updater
8. doc
9. screenshot
10. sidecar（`corex.start()` 后台启动，失败降级）

## 插件一览

| 插件       | 路径                                                       | 职责                                                   |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------ |
| security   | `src/host/capabilities/security.ts`                                  | session 权限、CSP、导航守卫                            |
| store      | `src/host/capabilities/store.ts`                                     | electron-store + IPC                                   |
| dialog     | `src/host/capabilities/dialog.ts`                                    | 打开/保存对话框                                        |
| database   | `src/host/capabilities/database.ts`                                  | better-sqlite3 + Drizzle 连接、迁移采纳、User 仓储 IPC |
| chat       | `src/host/capabilities/chat.ts`                                      | chat 域仓储 IPC（provider / session / message）        |
| assistant  | `src/host/capabilities/assistant.ts` + `assistant-{protocol,key}.ts` | 离线通路：MessagePort 流式 + safeStorage 密钥          |
| window     | `src/host/capabilities/window.ts`                                    | BrowserWindow、preload、信任登记                       |
| sidecar    | `src/host/capabilities/sidecar.ts`                                   | corex-daemon 宿主 + findStatus                         |
| doc        | `src/host/capabilities/doc.ts`                                       | pandoc 转换                                            |
| screenshot | `src/host/capabilities/screenshot.ts`                                | `capture.screenshot`                                   |
| updater    | `src/host/capabilities/updater.ts`                                   | electron-updater                                       |
| devtools   | `src/host/capabilities/devtools.ts`                                  | 开发态 DevTools                                        |

上述路径是**域内实现**（Repository / Service）。IPC 契约与装配不在其中：

| 放置        | 路径                                   | 内容                              |
| ----------- | -------------------------------------- | --------------------------------- |
| 契约        | `src/shared/ipc/`                      | 频道 + schema + 派生类型 + 错误码 |
| handler     | `src/host/ipc/handlers/<domain>.ts`    | invoke 入口（切片，装配点统一注册）|
| 插件        | `src/host/capabilities/<domain>.ts`    | **仅当该域有生命周期需求**才写     |

> **频道注册不再由各域承担** —— `host/ipc` 遍历契约统一注册。
> 多数域已经不再导出 `buildPlugin()`。

## 新增域检查清单

1. `shared/ipc/channels.ts` 加频道
2. `shared/ipc/specs/<domain>.ts` 加 in/out schema，并入 `specs/index.ts` 聚合
3. `shared/ipc/api.ts` 加 Api 叶子
4. `host/ipc/handlers/<domain>.ts` 实现切片，并入 `host/ipc/index.ts`
5. `preload.ts` 的 api 字面量加一行
6. 类型断言与测试全绿
7. 更新 [api-reference.md](./api-reference.md) / [examples.md](./examples.md)

样例步骤见 [examples.md §9](./examples.md#9-端到端新增一条-ipc示例-settings)。
