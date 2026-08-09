# Worker：R2 安装包下载

Cloudflare Worker（TypeScript），从 R2 桶 `i-thinking` 按版本路径流式提供 Windows 安装包，供 Microsoft Store 使用。

| 项 | 值 |
|----|-----|
| 包名 | `@i-thinking/worker` |
| 线上地址 | `https://i-thinking-downloads.layenbrank.workers.dev` |
| 入口 | [`src/worker.ts`](src/worker.ts) |
| 绑定 | `DOWNLOADS` → 桶 `i-thinking` |
| 密钥 | `AUTH_KEY_SECRET`（写操作） |

上架填写见 [`markdown/store-package-handoff.md`](../../markdown/store-package-handoff.md)。

本包是 monorepo workspace 成员：依赖由**仓库根**统一安装与锁定，与其它 `@i-thinking/*` 一致。

---

## API

对象键须匹配：`{major}.{minor}.{patch}/*-setup.exe`  
示例：`1.3.0/i-thinking_1.3.0_x64-setup.exe`

### 公开读

| 方法 | 路径 / 查询 | 说明 |
|------|-------------|------|
| `GET` / `HEAD` | `/{version}/{name}-setup.exe` | 流式下载；`Content-Type: application/octet-stream` |
| `GET` | 同上 + `?meta=1` | 仅返回 JSON：`key` / `size` / `etag`（不传 body） |

### 鉴权写

请求头：`X-Custom-Auth-Key: <AUTH_KEY_SECRET>`

| 方法 | 说明 |
|------|------|
| `PUT` | 整对象写入（小文件） |
| `DELETE` | 删除对象 |
| `POST` / `PUT` + `action=mpu-*` | 分片上传（大文件，>300MB 用此路径） |

---

## 开发与部署

在**仓库根**安装依赖后，用 filter 操作本包：

```powershell
# 仓库根
pnpm install
pnpm --filter @i-thinking/worker typecheck
pnpm secret:worker    # 首次或轮换 AUTH_KEY_SECRET
pnpm deploy:worker
```

等价写法：

```powershell
pnpm --filter @i-thinking/worker secret
pnpm --filter @i-thinking/worker deploy
pnpm --filter @i-thinking/worker dev
```

类型来自 `@cloudflare/workers-types`。`workerd` 已列入根 `pnpm-workspace.yaml` 的 `allowBuilds`。不要提交 `worker-configuration.d.ts`。

---

## 上传安装包

```powershell
cd apps/worker
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\multipart-upload.ps1

powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\upload-setup.ps1 `
  -AccountId "..." -AccessKeyId "..." -SecretAccessKey "..."
```

对象键约定：`{version}/i-thinking_{version}_x64-setup.exe`。
