# Studio 架构

> SSOT：Forge 扁平进程入口 + 按角色的宿主层（`src/host/`）；契约独立成层（`src/host/contract/`）。

## 1. 定位

**i thinking Studio**（`@i-thinking/studio`）是 monorepo 内的 Electron 桌面壳：

| 做                                          | 不做                      |
| ------------------------------------------- | ------------------------- |
| Forge + Vite 多进程桌面应用                 | NestJS 嵌在 Main          |
| host 能力模块 + 薄组合根                    | 跨进程物理 feature 共目录 |
| 契约 IPC（`window.itc` / 全局 `itc`）       | 暴露裸 `ipcRenderer`      |
| 本地能力：store / dialog / SQLite / sidecar | Renderer 任意 SQL         |
| 业务 HTTP → 远程 `VITE_THINKING`            | 本地再起一套 Nest         |

独立后端 `apps/service` 与 Studio **零运行时耦合**。

## 2. 进程与数据流

```mermaid
flowchart TB
  subgraph renderer [renderer]
    UI[React UI]
    SDK["window.itc / itc"]
    HTTP[ky VITE_THINKING]
  end
  subgraph preload [preload]
    Bridge[contextBridge 白名单]
  end
  subgraph host [main.ts + host/]
    Boot[bootstrap 组合根]
    Caps[capabilities]
  end
  Cloud[Remote Thinking API]
  UI --> SDK
  SDK --> Bridge
  Bridge -->|invoke + IpcResult| Boot
  Boot --> Caps
  UI --> HTTP
  HTTP --> Cloud
```

| 层              | 职责                                                          | 禁止                                              |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| **host**        | 宿主能力：框架 + 契约 + 能力域 + 生命周期                     | 依赖 UI（`@/`）                                   |
| **preload**     | `ITC` → `ipcRenderer.invoke/on`；仅 `contract/` 的 3 个模块   | 业务逻辑、其它 host 实现                          |
| **renderer**    | UI + 远程 HTTP；全局 `itc`                                    | `electron`、host 实现（可 `import type` `itc`）   |
| **forge**       | 打包 / makers / hooks / sidecar stage                         | 业务代码、IPC 契约                                |

## 3. 目录

```text
apps/studio/
├── forge/          # 打包 only
├── sidecar/        # staging 二进制
├── index.html
└── src/
    ├── main.ts       # 薄组合根
    ├── preload.ts
    ├── renderer.tsx
    ├── App.tsx
    ├── host/         # 唯一宿主聚合
    │   ├── framework/     # 插件框架：module / context / handle / logger / paths
    │   ├── contract/      # 跨进程契约：channels / result / itc
    │   ├── capabilities/  # 能力域：sidecar / chat / database / assistant / security …
    │   └── lifecycle/     # 进程生命周期：single-instance
    └── …             # UI（@ → src/）
```

四层的边界含义：

| 层             | 放什么                                   | 判据                                  |
| -------------- | ---------------------------------------- | ------------------------------------- |
| `framework/`   | 插件机制本身，不含任何业务域             | 被全部能力域引用，自身不引用能力域    |
| `contract/`    | 跨进程契约：频道名、`IpcResult`、`ITC`   | preload / renderer 唯一可见的宿主面   |
| `capabilities/`| 一个域一份实现，导出 `buildPlugin()`     | 在 `main.ts` 的注册表里出现           |
| `lifecycle/`   | 进程级钩子，非插件                       | 在 `main.ts` 里直接调用而非注册       |

ESLint：renderer / preload / host 边界规则（`eslint.config.ts`）。

## 4. 对话双通路

| 通路 | 路径                                                                | 要点                                                       |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| 离线 | renderer → `assistant:connect` → MessagePort → main → 本机 provider | 密钥只进主进程（safeStorage），渲染进程不读回              |
| 在线 | renderer → `AssistantChatTransport` → `${VITE_THINKING}/chat`       | service 的 AI SDK 路由；`Authorization` 用渲染进程登录令牌 |

- 两条通路共用同一份历史适配器与会话列表（`@i-thinking/chat`），差别只在 runtime hook：
  离线 `useLocalRuntime` + `ChatModelPort`，在线 `useChatRuntime` + 传输层。
- 通路选择持久化在设置存储 `chat.transport`；切换会换掉 `runtimeHook`，因此 `views/chat` 用
  `key={kind}` 重建运行时（hook 顺序不能跨通路复用）。
- 在线通路可用性 = 配置了 `VITE_THINKING` 且已登录，否则自动回落到离线并在选择器里禁用。

## 5. 组合根与插件

[`main.ts`](../../../apps/studio/src/main.ts) 注册顺序：

1. security → 2. store → 3. dialog → 4. database → 5. chat → 6. assistant → 7. window → 8. devtools → 9. updater → 10. doc → 11. screenshot → 12. sidecar

本地 IPC（含 DevTools）先于 sidecar；`corex.start()` 后台执行，失败降级不挡 UI。

```ts
interface Plugin {
  name: string
  register: (ctx: Context) => void | Promise<void>
  dispose?: () => void | Promise<void>
}
```

- **注册必须显式**：写在 `main.ts` 的数组里。不用基于 glob 的副作用自动注册 —— 那会破坏
  tree-shaking 与可测性。
- 能力域粒度：小域单文件（`capabilities/window.ts`）；有内部辅助的域用前缀分组
  （`capabilities/assistant.ts` + `assistant-protocol.ts` + `assistant-key.ts`）。
- 单文件超过约 300 行即拆分（`sidecar.ts` 目前 545 行，是本层待拆的已知项）。

## 6. IPC 契约

- Channel：`namespace:action`（[`contract/channels.ts`](../../../apps/studio/src/host/contract/channels.ts)）
- DTO + zod：各能力域（对象用 `interface`；zod 为 `ReadSchema` 大驼峰；禁止 `z.infer` 当业务类型）
- 返回：`IpcResult<T>`（[`contract/result.ts`](../../../apps/studio/src/host/contract/result.ts)）
- 前端形状：`ITC`（[`contract/itc.ts`](../../../apps/studio/src/host/contract/itc.ts)）
- 暴露名：仅 `window.itc`（全局标识符 `itc`）
- 契约同步：[`contract/contract.test.ts`](../../../apps/studio/src/host/contract/contract.test.ts)

## 7. 安全（摘要）

- `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`
- trusted sender + 允许 origin / `file:`
- 无任意 SQL IPC；无 Renderer 通用 sidecar spawn

## 8. 扩展新域

```text
1. host/contract/channels.ts
2. host/capabilities/<domain>.ts（models + desktop + commands + buildPlugin）
3. host/contract/itc.ts
4. main.ts 注册
5. preload.ts 挂载
6. contract.test 绿 + api-reference / examples
```

## 9. 决策

| 决策                              | 理由                                                          |
| --------------------------------- | ------------------------------------------------------------- |
| 保留 Forge 扁平进程入口           | `main.ts`/`preload.ts`/`renderer.tsx` 是 Forge 官方模板形态    |
| `host/` 按角色分四层              | 原 `plugins/` 单层平铺混了框架/契约/能力/生命周期四种角色      |
| 契约独立成 `contract/`            | preload 与 renderer 只该看见契约，不该看见能力实现             |
| 能力模块内嵌 host，不取代进程划分 | 对齐 VS Code `contrib/<feature>` 模式，注册显式                |
| 删除 `through.ts`                 | 0 字节空文件                                                   |
| `paths.ts` / Forge CJS            | 打包现实约束                                                   |
