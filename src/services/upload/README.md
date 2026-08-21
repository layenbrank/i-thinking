# Upload 模块

大文件分片上传与下载。路由前缀 `/api/v1/upload`。

## 概述

企业级分片流程：**prepare →（并行）chunk + hash 绑定 → finalize → 流式下载**。

| 能力 | 说明 |
|------|------|
| 异步 hash | `prepare` 可不传整文件 hash，稍后 `PATCH /hash` |
| 文件秒传 | 全局按 SHA-256 去重；命中后为**当前用户**克隆 COMPLETED 记录（共享 CAS） |
| 分片秒传 | 分片写入全局 `cas/{sha256}` 单副本；任意用户 hash 命中即可 `reused`（零拷贝） |
| 断点续传 | 返回 `uploaded[{index,hash}]`；同 hash+用户恢复 PENDING/UPLOADING |
| 不合并落盘 | finalize 只校验；下载时按 `chunk` 表顺序流式输出 |
| 下载隔离 | 仅 **creator** 可下载自己的完成件（按 hash 或按 asset id） |
| 本人列表 | `GET /files` 分页列出当前用户资产（默认 COMPLETED） |

## 路由一览

| 方法   | 路径                           | 鉴权   | 说明                          |
| ------ | ------------------------------ | ------ | ----------------------------- |
| POST   | `/api/v1/upload/prepare`       | JWT    | 初始化（hash 可选）           |
| PATCH  | `/api/v1/upload/hash`          | JWT    | 绑定整文件 SHA-256            |
| POST   | `/api/v1/upload/chunk`         | JWT    | 上传/秒传分片（multipart）    |
| POST   | `/api/v1/upload/finalize`      | JWT    | 校验完成（不合并）            |
| GET    | `/api/v1/upload/progress/{id}` | JWT    | 查询进度                      |
| DELETE | `/api/v1/upload/cancel/{id}`   | JWT    | 取消上传                      |
| GET    | `/api/v1/upload/files`         | JWT    | 本人资产列表（分页）          |
| GET    | `/api/v1/upload/files/{hash}`  | JWT    | 按 hash 流式下载（仅本人）    |
| GET    | `/api/v1/upload/asset/{id}`    | JWT    | 按资产 id 流式下载（仅本人）  |

## 鉴权说明

全路由挂载 [`Auth::required()`](../../guards/auth.rs)。

`prepare` 从 JWT `Claims.sub` 写入 `asset.creator`。  
`chunk` / `hash` / `finalize` / `progress` / `cancel` 校验归属。  
下载与列表均只覆盖 **当前用户** 的资产（文件秒传会为命中用户克隆记录）。  
分片 CAS 为**全局**共享（策略 1A）；整文件下载按 creator 隔离（策略 2B）。

## 数据表 — asset

| 列                          | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| id                          | 上传任务 / 资产 ID（UUID）                              |
| kind                        | `upload`                                                |
| hash                        | 整文件 SHA256；可先空，再 PATCH 绑定                    |
| sha                         | finalize 校验后的整文件 SHA                             |
| size, mime, name, extension | 文件元信息                                              |
| status                      | PENDING → UPLOADING → COMPLETED / FAILED / EXPIRED      |
| chunk, total                | 分片大小与分片总数                                      |
| creator, updater, expiresAt | 归属与 24h 过期（完成后 clears expiresAt）              |

## 数据表 — chunk

| 列                          | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| id                          | 分片记录 UUID                                           |
| assetId                     | → asset.id（CASCADE）                                   |
| index                       | 分片序号（从 0 起）；与 assetId 唯一                    |
| hash                        | 分片内容 SHA-256（CAS key）                             |
| size                        | 分片字节数                                              |
| createdAt, creator          | 审计                                                    |

## 磁盘协作

| 路径 | 用途 |
|------|------|
| `cas/{sha256}` | **唯一**分片物理副本；跨会话复用，不拷贝 |

finalize **不会**生成整文件；下载时服务端按 `chunk` 表 `index` 顺序读 CAS 写入同一 HTTP 响应（`Content-Length` = `size`）。

**CAS 回收**：本阶段不做自动 GC。后续可按 `chunk.hash` 引用计数或孤儿扫描清理。

**并发写分片**：`upsert_chunk` 用 `INSERT … ON CONFLICT DO NOTHING` + 再读校验，避免并行同 index 冲突。

## 推荐前端交互

1. 选文件后**立刻** `prepare`（可不带 hash），本地持久化 `(fingerprint → uploadId)`。
2. Worker 并行计算各 chunk hash 与整文件 hash。
3. 每个 chunk hash 就绪即可 `POST /chunk`；CAS 可命中时可不带字节。
4. 整文件 hash 就绪后 `PATCH /hash`：若 `exists` → 停止队列并提示秒传。
5. 续传以服务端 `progress` / `uploaded[{index,hash}]` 为准。
6. `finalize` 后用返回的 `/api/v1/upload/asset/{id}` 下载；或用 `GET /files` 列表取 url。
7. 小文件可仍先算 hash 再 prepare，以尽早命中文件秒传。

并发建议 3–4。

## 实现架构

```
UploadController::prepare
  └── UploadService::prepare
        └── validate / find_completed / find_pending / insert asset

UploadController::bind_hash
  └── UploadService::bind_hash
        └── 文件秒传（克隆 asset + chunk 行）或写入 asset.hash

UploadController::chunk
  └── UploadService::chunk
        └── CAS 命中 → 仅 INSERT chunk 行（零拷贝）
        └── 未命中 → 写入 cas/{hash} + INSERT chunk

UploadController::finalize
  └── UploadService::finalize
        └── 按 chunk 表顺序流式校验整文件 hash
        └── mark_completed（保留 CAS）

UploadController::toRead_files
  └── 本人资产分页列表

UploadController::serve_asset / serve_file
  └── 按序 stream_cas_chunks → 单一响应体
```

常量（[`validation.rs`](validation.rs)）：最大 5GB、分片 1MB~10MB、过期 24h。

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

返回 `exists` / `uploaded`（同 prepare 语义）。

### POST /api/v1/upload/chunk

multipart 字段：`id`、`index`、`hash`、`chunk`（CAS 已存在时可省略）。

**成功 data**：`{ "success": true, "index": 0, "reused": true, "message": "..." }`

### POST /api/v1/upload/finalize

须已绑定 hash 且 `chunk` 表分片齐全。校验通过后 `status=COMPLETED`，**不写合并文件**。  
返回 `url`：`/api/v1/upload/asset/{id}`。

### GET /api/v1/upload/files

Query：`page`（默认 1）、`size`（默认 20，最大 100）、`status`（默认 `COMPLETED`）。

**成功 data**：分页 `items[]`（`AssetR`：id / name / size / mime / hash / status / createdAt / url）。

### GET /api/v1/upload/files/{hash}

流式拼接分片；仅本人 COMPLETED 同 hash 资产。

### GET /api/v1/upload/asset/{id}

按资产 id 流式下载；仅本人 COMPLETED。

## 手工测试

- [`http/upload.ts`](http/upload.ts) — prepare → chunk → bind hash → finalize → 列表 / asset 下载
- [`http/upload.http`](http/upload.http)
- [`http/03-upload.http`](../../../http/03-upload.http)
