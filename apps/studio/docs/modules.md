# Studio Main 模块说明

组合根：[`src/main/bootstrap.ts`](../src/main/bootstrap.ts)。

注册顺序（当前）：

1. security  
2. store  
3. dialog  
4. database  
5. bin  
6. devtools  
7. window  

## 模块一览

| 模块 | 路径 | 职责 |
|------|------|------|
| security | `src/main/modules/security` | session 权限默认拒绝、CSP headers、导航/开窗守卫辅助 |
| store | `src/main/modules/store` | `electron-store` 键值持久化 + IPC |
| dialog | `src/main/modules/dialog` | 打开/保存文件对话框 |
| database | `src/main/modules/database` | Prisma + User 仓储 IPC（无 raw SQL） |
| bin | `src/main/modules/bin` | 白名单可执行路径与 spawn |
| devtools | `src/main/modules/devtools` | 开发态开关 DevTools |
| window | `src/main/modules/window` | BrowserWindow、preload、加载 URL、登记可信 webContents |

支撑代码：

| 文件 | 职责 |
|------|------|
| `app-context.ts` | `AppContext`：window、logger、信任集合、allowed origins |
| `ipc/handle.ts` | 统一 registerHandler |
| `ipc/trusted-sender.ts` | sender / URL 信任判断 |
| `paths.ts` | bundle 目录、`createRequire`（无 `import.meta.url`） |
| `logger.ts` | 结构化日志 |
| `module.ts` | `StudioModule` 接口 |

## 分层约定

推荐每个有业务的模块：

```text
index.ts       → createXxxModule()
handlers.ts    → registerHandler + zod
service.ts     → 用例
repositories/  → 仅 database 需要
```

`dispose`：释放资源（如 `database` disconnect Prisma）；bootstrap 退出时逆序 await。

## 新增模块检查清单

1. 在 `modules/<name>/` 实现 `createXxxModule`
2. 扩展 `shared/ipc`（channels / schemas / contracts）
3. `bootstrap.ts` 数组中注册
4. `preload/preload.ts` 挂到 `window.studio`
5. 更新 [api-reference.md](./api-reference.md) 与 [examples.md](./examples.md)

完整样例步骤见 [examples.md §9](./examples.md#9-端到端新增一条-ipc示例-settings)。

## Renderer 侧对应

- SDK 封装：`src/renderer/lib/studio.ts`
- 全局类型：`src/renderer/types/studio.d.ts`（`Window.studio: StudioApi`）
- UI 与业务：`src/renderer/**`（`@/`）
- 远程 HTTP：`src/renderer/utils/http.ts` → `VITE_THINKING`
