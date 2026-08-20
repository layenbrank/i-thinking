# Upload 模块

大文件分片上传与下载。路由前缀 `/api/v1/upload`。

## 概述

企业级分片上传流程：**prepare → chunk（可多次）→ finalize**，支持断点续传、秒传检测、SHA256 校验。数据持久化在 **`asset` 表** + 本地磁盘。

## 路由一览

| 方法   | 路径                           | 鉴权   | 说明                  |
| ------ | ------------------------------ | ------ | --------------------- |
| POST   | `/api/v1/upload/prepare`       | JWT    | 初始化上传            |
| POST   | `/api/v1/upload/chunk`         | JWT    | 上传分片（multipart） |
| POST   | `/api/v1/upload/finalize`      | JWT    | 合并分片并完成        |
| GET    | `/api/v1/upload/progress/{id}` | JWT    | 查询进度              |
| DELETE | `/api/v1/upload/cancel/{id}`   | JWT    | 取消上传              |
| GET    | `/api/v1/upload/files/{hash}`  | JWT    | 下载已完成文件        |

## 鉴权说明

全路由挂载 [`Auth::required()`](../../guards/auth.rs)（**无匿名下载**）。

`prepare` 从 JWT `Claims.sub` 写入 `asset.creator`。  
`chunk` / `finalize` / `progress` / `cancel` 均校验 `Claims.sub == asset.creator`（防 IDOR）。  
`GET /files/{hash}` 需登录；头像等直链须带 `Authorization: Bearer`。

模块拆分：`validation` / `storage` / `repository` / `error` / `multipart`；`service` 仅编排用例。

## 数据表 — asset

| 列                          | 用途                                               |
| --------------------------- | -------------------------------------------------- |
| id                          | 上传任务 ID（UUID）                                |
| kind                        | `upload`                                           |
| hash                        | 整文件 SHA256（客户端提供，64 hex）                |
| sha                         | 合并后磁盘文件 SHA                                 |
| size, mime, name, extension | 文件元信息                                         |
| path                        | 合并后磁盘路径                                     |
| status                      | PENDING → UPLOADING → COMPLETED / FAILED / EXPIRED |
| chunk, total, chunks        | 分片配置与已传索引                                 |
| creator, updater, expiresAt | 归属与 24h 过期                                    |

索引：`hash`、`creator`。

## 磁盘协作

| 阶段 | 路径                             |
| ---- | -------------------------------- |
| 分片 | `chunks/{id}/chunk-{index}.part` |
| 成品 | `uploads/{id}-{filename}`        |

finalize 时合并分片、校验 hash、写 `path` 与 `status=COMPLETED`，并清理 `chunks/{id}/`。

## 表协作

- **auth.profile.avatar** → 绑定 `asset.id`（需 `COMPLETED` + `creator=当前用户` + `image/*`）
- 同一 `hash` + `creator` 可恢复未完成上传（prepare 返回已有 chunks）

详见 [`guide/database.md`](../../../guide/database.md)。

## 实现架构

```
UploadController::prepare
  └── UploadService::prepare
        └── validate（size≤5GB, chunk 1~10MB, hash 64 字符）
        └── find_completed / find_pending（秒传/续传）
        └── asset::ActiveModel::insert

UploadController::chunk
  └── UploadService::chunk
        └── validate_status / validate_chunk（索引、大小、分片 hash）
        └── store_chunk（磁盘）
        └── append_chunk（raw SQL 更新 chunks 数组）

UploadController::finalize
  └── UploadService::finalize
        └── sync_chunks → merge_chunks → verify_integrity
        └── mark_completed → cleanup_chunks

UploadController::serve_file
  └── UploadService::find_file_by_hash
        └── NamedFile 流式下载
```

常量（[`service.rs`](service.rs)）：最大 5GB、分片 1MB~10MB、过期 24h。

源码：[`module.rs`](module.rs) · [`controller.rs`](controller.rs) · [`service.rs`](service.rs) · [`schema.rs`](schema.rs)

---

## 接口详情

### POST /api/v1/upload/prepare

**请求（JSON，camelCase）**

```json
{
  "name": "sample.pdf",
  "size": 1048576,
  "hash": "64位sha256十六进制",
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
  "url": "/api/v1/upload/chunk"
}
```

- `exists: true`：文件已存在（秒传），无需再传
- `chunks`：断点续传时已上传分片索引

---

### POST /api/v1/upload/chunk

**multipart/form-data**

| 字段  | 类型   | 说明                |
| ----- | ------ | ------------------- |
| id    | string | prepare 返回的 id   |
| index | number | 分片序号，从 0 开始 |
| hash  | string | 当前分片 SHA256     |
| chunk | file   | 分片二进制          |

**成功 data**

```json
{
  "success": true,
  "index": 0,
  "message": "分片 0 上传成功"
}
```

---

### POST /api/v1/upload/finalize

```json
{ "id": "upload-uuid" }
```

**成功 data**

```json
{
  "success": true,
  "url": "/api/v1/upload/files/{hash}",
  "id": "upload-uuid"
}
```

---

### GET /api/v1/upload/progress/{id}

**成功 data**

```json
{
  "id": "uuid",
  "progress": 50.0,
  "chunks": [0, 1],
  "total": 4,
  "status": "UPLOADING"
}
```

---

### DELETE /api/v1/upload/cancel/{id}

标记 `FAILED`、设置 `archivedAt`、清理分片目录。

---

### GET /api/v1/upload/files/{hash}

按文件 hash 下载，响应为文件流（`Content-Disposition: attachment`）。

---

## 使用示例

```bash
# 需先 signin 获取 token
curl -X POST http://127.0.0.1:3000/api/v1/upload/prepare \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"a.pdf","size":1024,"hash":"...64hex...","mime":"application/pdf","chunk":1048576}'
```

**HTTP / Node 测试**

- [`http/03-upload.http`](../../../http/03-upload.http)
- [`http/upload.http`](http/upload.http)
- [`http/upload.mjs`](http/upload.mjs) — Node fetch：自动 SHA256、分片、秒传/续传、下载校验

```bash
# 服务启动后
node src/services/upload/http/upload.mjs
node src/services/upload/http/upload.mjs ./photo.png
```

头像场景见 [`auth/README.md`](../auth/README.md) 与 [`http/01-auth.http`](../../../http/01-auth.http)。
