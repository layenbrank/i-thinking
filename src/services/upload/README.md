# Upload 模块

大文件分片上传与下载。路由前缀 `/api/v1/upload`。

## 概述

企业级三层模型：

| 层 | 含义 | 本仓库对应 |
|----|------|------------|
| 物理 CAS | 按内容 hash 全局单副本，跨用户复用字节 | `cas/{sha256}` |
| 上传会话 | 短暂任务；`cancel` 才硬删。秒传标 **SUPERSEDED**，会话 id 仍可调用 | `asset` 行 PENDING/UPLOADING/SUPERSEDED |
| 逻辑文件 | 按用户隔离的成片元数据 | `asset` COMPLETED + 本人 `chunk` 元数据行 |

流程：**prepare →（分片上传 ∥ 算 hash，算完即 PATCH）→ finalize → 流式下载**。

| 能力 | 说明 |
|------|------|
| 异步 hash | `prepare` 可不传整文件 hash；**与分片并行计算**，算完立刻 `PATCH /hash`（勿等全部分片传完，也不必等 hash 才开传） |
| 文件秒传 | 同 hash 且 size/chunk 一致：本人返回已有 COMPLETED；跨用户 **克隆**逻辑行（`name` 用当前请求）；当前会话标 **SUPERSEDED**（不 DELETE） |
| 分片秒传 | 分片写入全局 `cas/{sha256}`；任意用户 hash 命中即可 `reused`（零拷贝） |
| 断点续传 | 按**本会话**返回 `uploaded[{index,hash}]`；同 hash+用户可恢复 PENDING/UPLOADING |
| 废弃会话 | `cancel` → `discard_session`（删 asset，CASCADE chunk 元数据，CAS 保留）。秒传**不**硬删；在途 chunk 对 SUPERSEDED/COMPLETED 幂等 200 |
| FAILED | 仅真实失败（校验等）；**不是**秒传或取消 |
| SESSION_GONE | `500207`：会话 id 无效或已被 cancel/GC。秒传路径不用此码，也不再用 `200003` |
| 不合并落盘 | finalize 只校验；下载时按 `chunk` 表顺序流式输出 |
| 下载隔离 | 仅 **creator** 可下载自己的完成件 |
| 本人列表 | `GET /files` 分页列出当前用户资产（默认 COMPLETED） |

## 路由一览

| 方法   | 路径                           | 鉴权   | 说明                          |
| ------ | ------------------------------ | ------ | ----------------------------- |
| POST   | `/api/v1/upload/prepare`       | JWT    | 初始化（hash 可选）           |
| PATCH  | `/api/v1/upload/hash`          | JWT    | 绑定整文件 SHA-256（宜尽早）  |
| POST   | `/api/v1/upload/chunk`         | JWT    | 上传/秒传分片（multipart）    |
| POST   | `/api/v1/upload/finalize`      | JWT    | 校验完成（不合并）            |
| GET    | `/api/v1/upload/progress/{id}` | JWT    | 查询进度                      |
| DELETE | `/api/v1/upload/cancel/{id}`   | JWT    | Abort：硬删未完成会话         |
| GET    | `/api/v1/upload/files`         | JWT    | 本人资产列表（分页）          |
| GET    | `/api/v1/upload/files/{hash}`  | JWT    | 按 hash 流式下载（仅本人）    |
| GET    | `/api/v1/upload/asset/{id}`    | JWT    | 按资产 id 流式下载（仅本人）  |

## 鉴权说明

全路由挂载 [`Auth::required()`](../../guards/auth.rs)。

`prepare` 从 JWT `Claims.sub` 写入 `asset.creator`。  
`chunk` / `hash` / `finalize` / `progress` / `cancel` 校验归属。  
下载与列表均只覆盖 **当前用户** 的资产（跨用户文件秒传会为命中用户克隆逻辑行）。  
分片 CAS **全局**共享；逻辑文件与下载按 creator 隔离。

## 数据表 — asset

| 列                          | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| id                          | 上传任务 / 资产 ID（UUID）                              |
| tenantID                    | 租户 ID（可空；租户模型未接线前可不传）                 |
| kind                        | `upload`                                                |
| hash                        | 整文件 SHA256；可先空，hash 就绪后立即 PATCH 绑定       |
| sha                         | finalize 校验后的整文件 SHA                             |
| superseded                   | 秒传后指向目标 COMPLETED；本行 status=SUPERSEDED        |
| size, mime, name, extension | 文件元信息                                              |
| index                       | **资产列表排序**（用户可自定义，默认 0）；≠ chunk.index |
| status                      | PENDING → UPLOADING → COMPLETED / SUPERSEDED / FAILED / EXPIRED |
| chunk, total                | 分片大小与分片总数                                      |
| creator, updater, expiresAt | 归属与 24h 过期（完成后 clears expiresAt）              |

## 数据表 — chunk

| 列                          | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| id                          | 分片记录 UUID                                           |
| assetID                     | → asset.id（CASCADE）                                   |
| index                       | **分片序号**（从 0 起）；与 assetID 唯一                |
| hash                        | 分片内容 SHA-256（CAS key）                             |
| size                        | 分片字节数                                              |
| createdAt, creator          | 审计                                                    |

> **注意**：`asset.index` 是租户内文件排序；`chunk.index` 是分片下标。二者无关。

## 磁盘协作

| 路径 | 用途 |
|------|------|
| `cas/{sha256}` | **唯一**分片物理副本；跨会话/跨用户复用，不拷贝 |

finalize **不会**生成整文件；下载时服务端按 `chunk` 表 `index` 顺序读 CAS 写入同一 HTTP 响应（`Content-Length` = `size`）。

**CAS 回收**：本阶段不做自动 GC。后续可按 `chunk.hash` 引用计数或孤儿扫描清理。

**并发写分片**：`upsert_chunk` 用 `INSERT … ON CONFLICT DO NOTHING` + 再读校验，避免并行同 index 冲突。

## 推荐前端交互

服务端**不按文件大小分流**。同时支持 `prepare` 带 hash（入口秒传）与不带 hash（分片 ∥ 算 hash，算完 `PATCH /hash`）。何时先算、何时先传由客户端决定：

- **小文件**：先算完整 hash 再 prepare（命中则 0 分片）
- **大文件**：先 prepare 并上传，hash 并行，算完即绑

1. 选文件后**立刻** `prepare`（可不带 hash），同时开始算整文件 hash **并并行上传分片**。
2. 整文件 hash **一算完**就 `PATCH /hash`（不必等分片传完）：若 `exists` → 停止分片队列。临时会话变为 **SUPERSEDED**（id 仍有效）；在途 `chunk` / `progress` / `finalize` 幂等成功，`superseded` 指向已完成资产。
3. 未秒传：继续缺片；CAS 可命中时可不带字节。
4. 续传以服务端 `progress` / `uploaded[{index,hash}]` 为准（本会话）。
5. `finalize` 后用 `/api/v1/upload/asset/{id}` 下载；或 `GET /files` 取 url。秒传后也可用原会话 id 下载（服务端跟随 `superseded`）。
6. 小文件仍可先算 hash 再 prepare，以在 prepare 阶段命中文件秒传。

并发建议 3–4。**不要**等全部分片传完再 PATCH hash；也**不必**等 hash 算完才开始传分片。

`500207`（SESSION_GONE）仅表示 id 无效或已 cancel；**不要**把它和「CAS 中不存在」或秒传混为一谈。秒传时 chunk 返回 `200000` + `reused`。

### 与常见对象存储的差异（企业级对齐）

| 点 | OSS / S3 Multipart 等 | 本服务 |
|----|----------------------|--------|
| 上传会话 id | Complete 前稳定，不中途换成另一个 UploadId | 秒传将当前会话标 SUPERSEDED，**id 仍可调用**；返回的 `exists.id` 是 COMPLETED 资产 |
| 整对象校验 | 多在 Complete 时核对 | 允许提前 bind hash；未完成前会话 id 不变 |
| 客户端停传 | 仅在服务端明确「已完成/秒传」时 Abort | 仅 `exists: true` 时 abort；在途请求应对 SUPERSEDED 视为成功 |

## 实现架构

```
UploadController::prepare
  └── UploadService::prepare
        └── validate / find_completed(+layout) / clone_completed_for(name) / insert

UploadController::bind_hash
  └── UploadService::bind_hash
        └── COMPLETED 布局一致 → 文件秒传：当前会话 SUPERSEDED + superseded，不 DELETE
        └── 另有同 hash 的 PENDING → discard *旧* 会话，保留当前正在传的会话并 bind
        └── 否则 bind asset.hash，继续分片（靠 CAS 复用）

UploadController::chunk
  └── UploadService::chunk
        └── SUPERSEDED / COMPLETED → 幂等 200 reused（不写 chunk 行）
        └── CAS 命中 → 仅 INSERT chunk 行（零拷贝）
        └── 未命中 → 写入 cas/{hash} + INSERT chunk

UploadController::finalize
  └── UploadService::finalize
        └── 按 chunk 表顺序流式校验整文件 hash
        └── mark_completed（保留 CAS）

UploadController::cancel
  └── discard_session（硬删未完成会话）

UploadController::toRead_files
  └── 本人资产分页列表

UploadController::serve_asset / serve_file
  └── 按序 stream_cas_chunks → 单一响应体
```

常量（[`validation.rs`](validation.rs)）：最大 10GB、分片 10MB~100MB、过期 24h。

---

## 接口详情

### POST /api/v1/upload/prepare

```json
{
  "name": "sample.pdf",
  "size": 1048576,
  "hash": "可选，64位sha256",
  "mime": "application/pdf",
  "chunk": 1048576
}
```

**成功 data**

```json
{
  "id": "upload-uuid",
  "exists": false,
  "chunks": [0, 1],
  "uploaded": [{ "index": 0, "hash": "..." }],
  "url": "/api/v1/upload/chunk"
}
```

### PATCH /api/v1/upload/hash

```json
{ "id": "upload-uuid", "hash": "64位sha256" }
```

返回 `exists` / `uploaded`（同 prepare 语义）。秒传时 `id` 为已完成资产；原会话变为 SUPERSEDED。

### POST /api/v1/upload/chunk

multipart 字段：`id`、`index`、`hash`、`chunk`（CAS 已存在时可省略）。

**成功 data**：`{ "success": true, "index": 0, "reused": true, "message": "..." }`

### POST /api/v1/upload/finalize

须已绑定 hash 且 `chunk` 表分片齐全。校验通过后 `status=COMPLETED`，**不写合并文件**。  
返回 `url`：`/api/v1/upload/asset/{id}`。

### GET /api/v1/upload/files

Query：`page`（默认 1）、`size`（默认 20，最大 100）、`status`（默认 `COMPLETED`）。

**成功 data**：分页 `items[]`（`AssetR`：id / tenantID / name / size / mime / hash / index / status / createdAt / url）。

### GET /api/v1/upload/files/{hash}

流式拼接分片；仅本人 COMPLETED 同 hash 资产。

### GET /api/v1/upload/asset/{id}

按资产 id 流式下载；仅本人 COMPLETED。

## 手工测试

- [`scripts/upload.ts`](../../../scripts/upload.ts) — prepare → chunk → bind hash → finalize → 列表 / asset 下载
- [`http/upload.http`](http/upload.http)
- [`http/03-upload.http`](../../../http/03-upload.http)
