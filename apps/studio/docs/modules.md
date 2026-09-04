# Studio plugins 说明

组合根：[`src/main.ts`](../src/main.ts)。

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

| 插件 | 路径 | 职责 |
|------|------|------|
| security | `src/plugins/security.ts` | session 权限、CSP、导航守卫 |
| store | `src/plugins/store.ts` | electron-store + IPC |
| dialog | `src/plugins/dialog.ts` | 打开/保存对话框 |
| database | `src/plugins/database.ts` | Prisma + User 仓储 IPC |
| window | `src/plugins/window.ts` | BrowserWindow、preload、信任登记 |
| sidecar | `src/plugins/sidecar.ts` | corex-daemon 宿主 + findStatus |
| doc | `src/plugins/doc.ts` | pandoc 转换 |
| screenshot | `src/plugins/screenshot.ts` | `capture.screenshot` |
| updater | `src/plugins/updater.ts` | electron-updater |
| devtools | `src/plugins/devtools.ts` | 开发态 DevTools |

IPC 契约与实现同文件；guest 形状见 `src/plugins/itc.ts`。

## 单文件约定

```text
models   → types + zod
desktop  → Service / Host
commands → registerHandler + CHANNELS
init     → buildPlugin()
```

## 新增插件检查清单

1. `plugins/channels.ts` + `plugins/<name>.ts` + `itc.ts`  
2. `main.ts` 注册  
3. `preload.ts` 挂载  
4. `plugins/contract.test.ts` 绿  
5. 更新 [api-reference.md](./api-reference.md) / [examples.md](./examples.md)  

样例步骤见 [examples.md §9](./examples.md#9-端到端新增一条-ipc示例-settings)。
