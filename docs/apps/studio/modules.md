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

IPC 契约与实现同文件；guest 形状见 `src/host/contract/itc.ts`。

## 单文件约定

```text
models   → types + zod
desktop  → Service / Host
commands → registerHandler + CHANNELS
init     → buildPlugin()
```

## 新增插件检查清单

1. `host/contract/channels.ts` + `host/capabilities/<name>.ts` + `host/contract/itc.ts`
2. `main.ts` 注册
3. `preload.ts` 挂载
4. `host/contract/contract.test.ts` 绿
5. 更新 [api-reference.md](./api-reference.md) / [examples.md](./examples.md)

样例步骤见 [examples.md §9](./examples.md#9-端到端新增一条-ipc示例-settings)。
