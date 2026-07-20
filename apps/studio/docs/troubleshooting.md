# Studio 排障

## 快速对照

| 现象 | 可能原因 | 处理 |
|------|----------|------|
| 启动弹窗：`createRequire` / `filename` Received undefined | Vite 将 main 打成 CJS 时，`import.meta.url` 可能变成 `undefined` | 使用 [`src/main/paths.ts`](../src/main/paths.ts)（`argv[1]` / `APP_ROOT`）；勿在 Main 顶层 `createRequire(import.meta.url)` |
| `IPC_UNTRUSTED_SENDER` | webContents 未登记，或 URL 不在 Vite origin / 非 `file:` | 确认 window 模块已 `trustWebContents`；开发态检查 `MAIN_WINDOW_VITE_DEV_SERVER_URL` origin |
| `IPC_INVALID_PAYLOAD` | zod 校验失败 | 对照 [api-reference.md](./api-reference.md) 入参 |
| `window.studio is unavailable` | 网页模式或 preload 未注入 | Electron 用 `dev`；网页用 try/catch 降级，见 [examples.md](./examples.md) |
| `sidecar not allowed` / `sidecar not found` | 不在白名单或资源未打包 | 查 `ALLOWED_SIDECARS`；确认 `resources/sidecar` |
| DevTools 打不开 | 生产包或非开发态 | 仅 `!app.isPackaged` 允许 |
| highlight.js / lowlight `default` 导出错误 | monorepo 根依赖以 `/@fs/` 提供 CJS 未预构建 | 见 [renderer-vite-root-cause.md](./renderer-vite-root-cause.md) |
| Prisma / better-sqlite3 加载失败 | 未 generate 或未 rebuild | `prisma generate` + `electron-rebuild`；打包检查 unpacked native |
| 误以为本地 Nest 未启动 | 已去除 sidecar | 业务 API 配 `VITE_THINKING` 远程地址 |

## createRequire / import.meta.url（详解）

`package.json` 为 `"type": "commonjs"`，Forge Vite 默认将 main 打成 **CJS**。源码里的：

```ts
createRequire(import.meta.url)
```

可能被编译成：

```js
createRequire({}.url) // undefined → 崩溃
```

正确做法：`findAppRequire()` / `findBundleDir()`（基于 `process.argv[1]` 与 `APP_ROOT`）。窗口 preload 路径同样用 `findBundleDir()`。

Preload 在 `sandbox: true` 下保持 CJS bundler 产物。

## IPC 信任排查步骤

1. 是否 Electron 窗口（非 `dev:core`）？
2. Main 日志是否有 `rejected untrusted sender`？
3. 开发态：页面 URL 是否与 Vite origin 一致？
4. 生产：是否 `file:` 协议加载本地页面？

## 相关文档

- [开发指南](./development.md)
- [安全](./security.md)
- [打包](./packaging.md)
- [API 参考](./api-reference.md)
