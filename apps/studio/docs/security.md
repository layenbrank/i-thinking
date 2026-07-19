# Studio 安全模型

## 1. webPreferences 基线

窗口创建（`modules/window`）：

| 项 | 值 |
|----|-----|
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| `sandbox` | `true` |
| `webSecurity` | `true` |
| `allowRunningInsecureContent` | `false` |
| `devTools` | 仅 `!app.isPackaged` |
| `preload` | 打包目录下的 `preload.js` |

## 2. Preload 暴露面

- **仅** `contextBridge.exposeInMainWorld('studio', …)`
- **禁止**暴露裸 `ipcRenderer`
- 静态测试：`src/preload/expose.test.ts`

## 3. IPC 信任

`registerHandler` 调用 `isTrustedSender`：

1. `event.sender` 必须已通过 `ctx.trustWebContents` 登记（window 创建时登记，close 时取消）
2. URL 必须在允许范围：
   - **开发**：Vite origin（`MAIN_WINDOW_VITE_DEV_SERVER_URL` 的 origin）；未配置时回退 `localhost` / `127.0.0.1`
   - **生产**：仅 `file:`

失败返回 `IPC_UNTRUSTED_SENDER`。

## 4. 导航与开窗

`attachWindowGuards`：

- `will-navigate`：拒绝非允许 URL
- `setWindowOpenHandler`：一律 `deny`

## 5. CSP 与权限

- `session.defaultSession.webRequest.onHeadersReceived` 注入 CSP（开发放宽 connect/ws；生产收紧 script-src）
- `setPermissionRequestHandler`：默认拒绝（白名单当前为空）

`index.html` 另有 meta CSP，供非 Electron 预览兜底。

## 6. 数据面

| 风险 | 对策 |
|------|------|
| XSS → 任意 SQL | 废除 `db:query`；仅 `user:*` 仓储 |
| 任意执行本地二进制 | `ALLOWED_BINS` + 禁路径穿越；`spawn({ shell: false })` |
| 超大/恶意 args | zod 限制条数与长度，禁 `\0` |

## 7. Electron Fuses（打包时）

见 `forge.config.ts`：

| Fuse | 当前 | 说明 |
|------|------|------|
| `RunAsNode` | `false` | 去 Nest 后无需；降低被当 Node 宿主滥用 |
| `EnableNodeOptionsEnvironmentVariable` | `false` | 防 NODE_OPTIONS 注入 |
| `EnableNodeCliInspectArguments` | `false` | 防调试参数滥用 |
| `EnableCookieEncryption` | `true` | |
| `EnableEmbeddedAsarIntegrityValidation` | `true` | |
| `OnlyLoadAppFromAsar` | `true` | |

## 8. 与 Electron Security Checklist 对照（摘要）

| 建议 | Studio |
|------|--------|
| contextIsolation | 是 |
| 禁用 nodeIntegration | 是 |
| sandbox | 是 |
| 限制导航 / 新窗口 | 是 |
| 校验 IPC sender | 是（webContents + URL） |
| CSP | 是（headers） |
| 不暴露 Electron API 给不可信内容 | 仅 studio 白名单 |
| 保持 Electron 版本更新 | 依赖 catalog / 团队维护 |

完整清单见 [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security)。
