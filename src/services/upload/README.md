# Upload 模块

大文件分片上传与下载。路由前缀 `/api/v1/upload`。

## 概述

企业级分片流程：**prepare →（并行）chunk + hash 绑定 → finalize → 流式下载**。

| 能力 | 说明 |
|------|------|
| 异步 hash | `prepare` 可不传整文件 hash，稍后 `PATCH /hash` |
| 文件秒传 | 同 SHA-256 已 COMPLETED → `exists: true` |
| 分片秒传 | 分片写入全局 `cas/{sha256}` 单副本；命中则 `reused: true`，**零拷贝** |
| 断点续传 | 返回 `uploaded[{index,hash}]`；同 hash+用户恢复 PENDING/UPLOADING |
| 不合并落盘 | finalize 只校验；下载时按序流式输出分片，客户端一次收到完整文件 |

## 路由一览

| 方法   | 路径                           | 鉴权   | 说明                          |
| ------ | ------------------------------ | ------ | ----------------------------- |
| POST   | `/api/v1/upload/prepare`       | JWT    | 初始化（hash 可选）           |
| PATCH  | `/api/v1/upload/hash`          | JWT    | 绑定整文件 SHA-256            |
| POST   | `/api/v1/upload/chunk`         | JWT    | 上传/秒传分片（multipart）    |
| POST   | `/api/v1/upload/finalize`      | JWT    | 校验完成（不合并）            |
| GET    | `/api/v1/upload/progress/{id}` | JWT    | 查询进度                      |
| DELETE | `/api/v1/upload/cancel/{id}`   | JWT    | 取消上传                      |
| GET    | `/api/v1/upload/files/{hash}`  | JWT    | 按序流式下载完整文件          |

## 鉴权说明

全路由挂载 [`Auth::required()`](../../guards/auth.rs)。

`prepare` 从 JWT `Claims.sub` 写入 `asset.creator`。  
`chunk` / `hash` / `finalize` / `progress` / `cancel` 校验归属。  
`GET /files/{hash}` 需登录。

## 数据表 — asset

| 列                          | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| id                          | 上传任务 ID（UUID）                                     |
| kind                        | `upload`                                                |
| hash                        | 整文件 SHA256；可先空，再 PATCH 绑定                    |
| sha                         | finalize 校验后的整文件 SHA                             |
| size, mime, name, extension | 文件元信息                                              |
| path                        | 新流程为 null；旧版合并文件路径兼容                     |
| metadata                    | JSON：`{"chunkHashes":{"0":"hex",...}}`                 |
| status                      | PENDING → UPLOADING → COMPLETED / FAILED / EXPIRED      |
| chunk, total, chunks        | 分片配置与已传索引                                      |
| creator, updater, expiresAt | 归属与 24h 过期（完成后 clears expiresAt）              |

## 磁盘协作

| 路径 | 用途 |
|------|------|
| `cas/{sha256}` | **唯一**分片物理副本；跨会话复用，不拷贝 |
| `chunks/{id}/` | 旧临时目录，可清理 |
| `uploads/...` | 旧合并成品，仅兼容下载 |

finalize **不会**生成整文件；下载时服务端按 `chunkHashes` 顺序读 CAS 写入同一 HTTP 响应（`Content-Length` = `size`），浏览器/客户端一次保存即为完整文件。

**CAS 回收**：本阶段不做自动 GC。`cas/{sha256}` 会随分片秒传长期保留以节省重复上传带宽与空间；后续可按引用计数（扫描 `metadata.chunkHashes`）或孤儿扫描清理无引用对象，避免磁盘无限增长。

**并发写分片**：`append_chunk` 在 SQL 内用 `jsonb_set` 原子更新 `chunkHashes`，避免并行上传不同 index 时互相覆盖丢失 hash。

## 推荐前端交互

1. 选文件后**立刻** `prepare`（可不带 hash），本地用 IndexedDB/localStorage 持久化 `(fingerprint → uploadId)`（fingerprint 可用 `name+size+lastModified`）。
2. Worker 并行计算各 chunk hash 与整文件 hash；UI 分「校验/指纹进度」与「上传进度」两条。
3. 每个 chunk hash 就绪即可 `POST /chunk`；若服务端/本地已知 CAS 可命中，可不带 `chunk` 字节（分片秒传）。
4. 整文件 hash 就绪后 `PATCH /hash`：若 `exists` → 停止队列并提示秒传。
5. 刷新/断网续传：以**服务端** `progress` / `uploaded[{index,hash}]` 为准（本地缓存仅辅助找回 `uploadId`）；hash 一致则跳过，不一致则强制重传该片。
6. 全部就绪后 `finalize`，再按返回 `url` 下载。
7. 小文件（如 &lt; 8MB）可仍先算 hash 再 prepare，以尽早命中文件秒传。

并发建议 3–4。
## 实现架构

```
UploadController::prepare
  └── UploadService::prepare
        └── validate（size≤5GB, chunk 1~10MB, hash 可选）
        └── find_completed / find_pending（秒传/续传）
        └── insert asset + metadata

UploadController::bind_hash
  └── UploadService::bind_hash
        └── 文件秒传或写入 asset.hash

UploadController::chunk
  └── UploadService::chunk
        └── CAS 命中 → 仅登记 chunkHashes（零拷贝）
        └── 未命中 → 写入 cas/{hash} 一份

UploadController::finalize
  └── UploadService::finalize
        └── 按序流式读 CAS 校验整文件 hash
        └── mark_completed（path=null，保留 CAS）

UploadController::serve_file
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

须已绑定 hash 且分片齐全。校验通过后 `status=COMPLETED`，**不写合并文件**。

### GET /api/v1/upload/files/{hash}

流式拼接分片；`Content-Disposition: attachment`。

## 手工测试

- [`http/upload.ts`](http/upload.ts) — 先 prepare（无 hash）→ 分片上传/秒传 → bind hash → finalize → 流式下载校验
- [`http/03-upload.http`](../../../http/03-upload.http)
