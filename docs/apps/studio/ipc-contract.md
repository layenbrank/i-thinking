# Studio IPC 契约

Studio 的 IPC（`invoke`）按一份**单一事实源**的契约组织。本文是该契约的完整规范；
`architecture.md` 只保留摘要。

## 0. 三条不可绕过的平台约束

所有设计都从这三条推导。它们不是取舍，是 Electron 给定的前提。

| #   | 约束                                                                   | 后果                                                                   |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `contextBridge` 只传可克隆值（函数被代理，其余复制并冻结）             | 渲染进程无法拿到真实桥对象，**类型必须独立声明**，运行时边界天然无类型 |
| 2   | Electron 丢弃跨 IPC 抛出错误的身份 —— 只保留 `message`，自定义属性全丢 | 领域错误**绝不可靠 `throw` 跨 IPC**；渲染侧只会看到重建的 `Error`      |
| 3   | 主进程是信任边界，渲染进程可能发任何东西且类型已擦除                   | 校验**必须**在 main 侧、在 handler 之前                                |

第 2 条还决定了**渲染进程拿不到 `IpcClientError.code`**：preload 与渲染进程是两个 JS realm，
自定义属性跨桥即丢。所以 **code 必须以 message 前缀为载体**（`[CODE] 文本`），
渲染侧用 `decodeIpcMessage` 还原 —— 见 `src/shared/ipc/error.ts`。

## 1. 分层与不变式

```text
src/
├── shared/ipc/          # 契约：零 electron / node / dom import
│   ├── channels.ts      # 48 个频道 + Domain/ChannelOfDomain/InvokeChannel/PushChannel
│   ├── spec.ts          # ChannelSpec（in/out 用 ZodType<any>）
│   ├── specs/           # 每域一个 spec + 聚合 + In/Out/ArgsOf
│   ├── api.ts           # Api —— 渲染进程可见的唯一宿主面
│   └── error.ts         # IpcErrorCode / IpcEnvelope / IpcError / IpcClientError / codec
├── host/ipc/            # 主进程装配
│   ├── types.ts         # Handler<K> / Handlers / DomainHandlers<D>
│   ├── register.ts      # wrapHandler / assertExhaustive / registerAll
│   ├── index.ts         # buildHandlers / registerStudioIpc
│   └── handlers/        # 13 个域切片
└── preload.ts           # 纯适配器：契约驱动构建 api + 解信封
```

| 层            | 放什么                               | 禁止                                             |
| ------------- | ------------------------------------ | ------------------------------------------------ |
| `shared/ipc/` | 频道、schema、派生类型、错误码词汇表 | `electron`、Node 内置、DOM —— 它要被三端同时打包 |
| `host/ipc/`   | handler 实现与装配                   | 依赖渲染侧模块                                   |
| `preload.ts`  | 契约驱动的桥对象、解信封             | 业务逻辑、暴露 `ipcRenderer`、让频道字符串外流   |
| 渲染侧        | 调用点、错误文案归一                 | 看见频道字符串、`import electron`                |

**`shared/**` 的框架无关是机器强制的**，不是口头约定 —— `eslint.config.ts` 的
`shared-framework-free` 规则禁止该目录 import `electron` 与 `node:*`。

## 2. 契约层：schema 是源，类型是推导

```ts
// src/shared/ipc/specs/store.ts
export const storeSpecs = {
  [CHANNELS.STORE.READ]: { in: ReadSchema, out: z.unknown() },
  …
} as const satisfies Record<ChannelOfDomain<'store'>, ChannelSpec>
```

- **schema-first**：`type In<K> = z.infer<…>`。手写两遍同一形状是漂移的头号来源，TS 不会强制它们相等
- 每个域的 `satisfies Record<ChannelOfDomain<D>, ChannelSpec>` 保证该域的频道**不多不少**
- 聚合在 `specs/index.ts`，带四条穷尽性断言：`_SpecsMissing` / `_SpecsExtra` / `_PushMissing` / `_PushExtra`
  —— 缺一个频道、多一个频道，都是**编译错误**

频道用点分命名空间字符串（`chat:provider.toRead`）。不用嵌套对象树：那需要递归映射类型才能
还原成调用的形状，成本高且容易在同名冲突上翻车。

## 3. 三处 `satisfies` 闭环

这是整套机制的核心 —— **用编译期断言把四层锁死**：

```ts
// main：漏频道 / 多频道 / 返回类型错 → 编译错误
const handlers = { ...13 个切片 } satisfies Handlers

// preload：缺键 / 多键 / 键映射错频道 → 编译错误
const api = { … } satisfies Api

// renderer：window.itc 的唯一类型来源（纯声明，不 import 实现）
declare global { interface Window { itc: Api } }
```

外加启动期的 `assertExhaustive(handlers)`，**在任何 `ipc.handle` 之前**抛错 ——
失败快，不留"注册了一半"的应用。

## 4. 错误模型

**分工，不是二选一**：

| 错误类型              | 处理                                                      |
| --------------------- | --------------------------------------------------------- |
| 预期内的业务失败      | `throw new IpcError(code, msg)` → wrapper 编码进信封      |
| 编程错误 / 未预期异常 | 让它 reject → `IPC_HANDLER_ERROR`（语义正确，不混为一谈） |

信封：

```ts
type IpcEnvelope<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error: {
        code: IpcErrorCode
        name: string
        message: string
        details?: unknown
        stack?: string
      }
    }
```

- `code` —— 有限联合（`IPC_ERROR_CODES`），调用方可穷尽检查
- `name` —— 保留原始错误类名，跨桥后 `instanceof` 不可用，靠它判别
- `details` —— **必须结构化克隆安全**；zod 失败拍平成 `{path,code,message}[]`，**绝不塞 `ZodError` 实例**
- `stack` —— 仅 `ctx.isDev` 附带

**为什么不用 reject 传领域错误**：Electron 会丢弃错误身份（约束 2）。信封里的结构化 code 是
唯一能活着到达渲染侧的诊断信息。

**渲染侧必须让它无法被静默忽略**：`utils/ipc.errors.ts` 的 `toIpcMessage` 剥掉 `[CODE] `
前缀用于展示；`toIpcFailure` 还原出 `{code, message}` 供逻辑判断。

## 5. 校验归属：只在 main，一次，在 handler 边界

- main 是信任边界 → 必做
- **preload 里校验是无意义的开销** —— preload 跑在不可信的渲染进程内，可被绕过
- 渲染侧校验只是 UX

推论：payload 必须**结构化克隆安全**（无类实例、无函数）。

**客户端生成的 id 只约束形状，不约束格式**：消息 id 由渲染侧 runtime 产出
（assistant-ui 的 `generateId()` 是 7 位 nanoid），若在契约里写成 `z.uuid()`，每次
`chat:message.toAppend` 都会先被 `IPC_INVALID_PAYLOAD` 挡回 —— 表现是会话能建、标题能改，
**历史却一条都存不下**（写入失败只 reject 在 runtime 内部，界面不报错）。会话 id 才是主进程
`randomUUID()` 生成的 uuid，两者不共用 schema。

## 6. 装配与生命周期

```ts
// main.ts —— IPC **必须先于插件循环注册**
const ipc = registerStudioIpc(ctx.ipc, { ctx, overlay: overlayPort })
for (const plugin of plugins) await plugin.register(ctx)
```

**顺序不可颠倒**：window 插件会 `loadURL`，渲染进程随即 `invoke`。注册晚一拍会让首个
`store:toRead` 失败，而 `/agent` 在 `loaded === false` 时永远渲染 `null` ——
**是白屏而不是崩溃，冒烟测试很难发现**。

`registerAll` 遍历 `INVOKE_CHANNELS` 注册，**频道字符串的唯一来源是契约，循环里不出现字面量**。
返回幂等 `Disposable`，`before-quit` 时 LIFO 拆除，**只拆自己注册的**。

插件只负责生命周期（安全会话 / 关库 / 建窗 / 起 sidecar）；频道注册已不由插件承担。
`ipcMain.handle` 对重复频道会 throw —— 保留它，那是重复注册的探测器。

## 7. 推送通道

`assistant:port` 与 `updater:event` 不走 invoke，在 `PUSH_SPECS` 里单独声明（无入参）。
渲染侧以 `subscribe(cb) → unsubscribe` 形态暴露，**`IpcRendererEvent` 一律不外传**
（它会泄漏 `senderFrame`）。

`assistant:port` 的竞态队列（端口可能先于回调到达）在 `src/preload.port.ts`，
与主进程侧的端口协议见 [api-reference](./api-reference.md#assistantagent-运行时)。

端口交付到渲染侧后**必须 `start()`**：`MessagePort` 在接收端默认处于「未启动」状态，
只挂 `addEventListener('message')` 一条消息都收不到（Electron 44 实测）。开闸放在交付边界
（`features/chat/port/assistant-port.ts` 收到即 `start()`），订阅者拿到的端口一定可用；
漏掉这一步的表现是「主进程把模型跑完了，界面与终端却毫无动静」。

## 8. 反模式

权威来源点名的，本仓一律不采用：

- 暴露裸 `ipcRenderer` / `ipcRenderer.on` —— Electron 安全清单 #20 原话：
  _"gives renderer processes direct access to the entire IPC event system"_
- 跳过 sender 校验（#17）
- 信任渲染进程输入、main 侧不做 schema 校验
- 为方便开 `nodeIntegration: true` / `contextIsolation: false` / `sandbox: false`
- **单个 God 频道 + 未类型化的 `action` 字符串**
- 跨边界依赖 `instanceof` / 自定义属性 ← 约束 2 直接否掉
- reject 一个非 Error（触发 "could not be cloned"）
- fire-and-forget 的 `invoke()` 不消费 promise
- 在 preload 里写业务逻辑或校验、把频道字符串泄漏给渲染进程
- 装饰性的生命周期机制（`dispose` 不接真实资源释放）

## 9. 已知缺口

诚实记录当前未做到的部分：

- **渲染侧调用点未全部加固**。仍有约 1/4 的站点会吞掉失败：
  `features/magnetic-tile/layout-menu.tsx` 的 `void itc.overlay.toUpdate(...)`、
  两个 `utility.tsx` 的 `void ….then()`、`provider/dialog.tsx` 的 `toggleMutation` 缺 `onError`。
  计划中的做法是 `handleIpc` 包装 + `unhandledrejection` 全局兜底，另排期
- **`z.infer` 的静默退化**：zod 4.4.3 的 `z.infer` 无类型约束，spec 值一旦不再是 zod 实例会
  静默变成 `unknown`。目前靠 `specs/index.ts` 的穷尽性断言间接兜底，尚未加"精确相等"的金样本测试
- `sidecar.ts`（545 行）与 `chat.ts` 未拆分，与 IPC 重构正交
