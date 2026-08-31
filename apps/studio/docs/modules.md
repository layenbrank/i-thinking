# Studio Main 模块说明

组合根：[`src/main/bootstrap.ts`](../src/main/bootstrap.ts)。

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

## 模块一览

| 模块 | 路径 | 职责 |
|------|------|------|
| security | `src/main/modules/security` | session 权限、CSP、导航守卫 |
| store | `src/main/modules/store` | electron-store + IPC |
| dialog | `src/main/modules/dialog` | 打开/保存对话框 |
| database | `src/main/modules/database` | Prisma + User 仓储 IPC |
| window | `src/main/modules/window` | BrowserWindow、preload、信任登记 |
| sidecar | `src/main/modules/sidecar` | corex-daemon 宿主 + findStatus |
| doc | `src/main/modules/doc` | pandoc 转换 |
| screenshot | `src/main/modules/screenshot` | `capture.screenshot` |
| updater | `src/main/modules/updater` | electron-updater |
| devtools | `src/main/modules/devtools` | 开发态 DevTools |

IPC DTO：`src/shared/ipc/<domain>.ts`（非 main）。

## 分层约定

```text
index.ts       → buildModule()
handlers.ts    → registerHandlers + @shared schemas
service.ts     → 可选用例
repositories/  → 仅 database
```

- 纯 CRUD：handlers → repository  
- 有用例：具名 service，禁止透传门面  
- `dispose`：bootstrap 退出逆序 await  

## 新增模块检查清单

1. `shared/ipc/channels.ts` + `shared/ipc/<name>.ts` + `studio.ts`  
2. `main/modules/<name>/`（handlers + 按需 service）  
3. `bootstrap.ts` 注册  
4. `preload/preload.ts` 挂载  
5. `shared/ipc/contract.test.ts` 绿  
6. 更新 [api-reference.md](./api-reference.md) / [examples.md](./examples.md)  

样例步骤见 [examples.md §9](./examples.md#9-端到端新增一条-ipc示例-settings)。
