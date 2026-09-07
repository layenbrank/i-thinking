# 数据库表协作

PostgreSQL 业务表采用 **camelCase 列名**（Rust entity 字段仍为 snake_case，通过 `column_name` 映射）。

## ER 关系

```mermaid
erDiagram
  auth ||--o| asset : avatar
  auth ||--o| auth : creator
  auth ||--o| auth : updater
  asset ||--o| auth : creator
  asset ||--o| auth : updater
  asset ||--o{ chunk : has
  chunk ||--o| auth : creator
```

| 关系 | 说明 |
|------|------|
| `auth.avatar` → `asset.id` | 用户头像，删除 asset 时 SET NULL |
| `auth.creator/updater` → `auth.id` | 账号审计，自引用 |
| `asset.creator/updater` → `auth.id` | 上传/资源审计 |
| `chunk.assetID` → `asset.id` | 分片归属，删除 asset 时 CASCADE |
| `chunk.creator` → `auth.id` | 分片审计 |

## auth 表

Entity：[`entity/src/auth.rs`](../entity/src/auth.rs)

| 列 (DB) | 类型 | 说明 |
|---------|------|------|
| id | uuid PK | 用户 ID |
| username | text UNIQUE | 登录名 |
| password | text | 加密后密码 |
| email | text | 邮箱 |
| phone | text UNIQUE | 手机号（可 NULL，唯一） |
| age | int | 年龄 |
| gender | text | MALE / FEMALE |
| birthday | date | 生日 |
| avatar | uuid FK | → asset.id |
| role | text | USER / ADMIN，默认 USER |
| status | text | ACTIVE / DISABLED，默认 ACTIVE |
| archivedAt | timestamptz | 归档时间 |
| createdAt | timestamptz | 创建时间 |
| creator | uuid FK | → auth.id |
| updatedAt | timestamptz | 更新时间 |
| updater | uuid FK | → auth.id |
| expiresAt | timestamptz | 过期时间 |

**使用模块**：auth（登录/profile）、user（后台 CRUD）

## asset 表

Entity：[`entity/src/asset.rs`](../entity/src/asset.rs)

| 列 (DB) | 类型 | 说明 |
|---------|------|------|
| id | uuid PK | 资源 ID |
| tenantID | text | 租户 ID（可空） |
| kind | text | 类型，上传为 `upload` |
| hash | text | 文件 SHA256（64 位 hex），索引；prepare 时可先空串 |
| sha | text | finalize 校验后的整文件 SHA（与 hash 一致） |
| size | bigint | 文件总字节 |
| index | bigint | 租户内列表排序（默认 0）；≠ chunk.index |
| mime | text | MIME |
| extension | text | 扩展名 |
| name | text | 文件名 |
| status | text | PENDING / UPLOADING / COMPLETED / SUPERSEDED / FAILED / EXPIRED |
| visibility | text | PRIVATE（默认）/ PUBLIC / RESTRICTED |
| viewers | jsonb | RESTRICTED 时允许下载的用户 UUID 数组；其它可见性为 null |
| chunk | int | 分片大小（字节） |
| total | int | 分片总数 |
| archivedAt / createdAt / creator / updatedAt / updater / expiresAt | | 审计字段 |

## chunk 表

Entity：[`entity/src/chunk.rs`](../entity/src/chunk.rs)

| 列 (DB) | 类型 | 说明 |
|---------|------|------|
| id | uuid PK | 分片记录 ID |
| assetID | uuid FK | → asset.id，CASCADE |
| index | int | 分片序号（从 0）；与 assetID 唯一 |
| hash | text | 分片内容 SHA256（CAS key），索引 |
| size | bigint | 分片字节数 |
| createdAt | timestamptz | 创建时间 |
| creator | uuid FK | → auth.id |

**磁盘协作**（upload 模块）：

| 路径 | 用途 |
|------|------|
| `cas/{sha256}` | 分片内容寻址单副本（跨会话零拷贝复用） |

**使用模块**：upload（分片上传）、auth/user（avatar 联查）

## 审计字段约定

`archivedAt`、`createdAt`、`creator`、`updatedAt`、`updater`、`expiresAt` 在 auth / asset 上语义一致：

- **createdAt / creator**：创建时间与创建者
- **updatedAt / updater**：最后更新
- **archivedAt**：软归档/失败标记
- **expiresAt**：上传任务过期（默认 24h）

## 跨模块流程：头像绑定

```mermaid
sequenceDiagram
  participant Client
  participant Upload
  participant Asset as asset表
  participant Auth
  participant AuthTbl as auth表

  Client->>Upload: POST /upload/prepare (image/png)
  Upload->>Asset: INSERT status=PENDING
  Client->>Upload: POST /upload/chunk
  Note over Upload: INSERT chunk + 写 cas/{hash}
  Client->>Upload: POST /upload/finalize
  Upload->>Asset: UPDATE status=COMPLETED
  Client->>Auth: PUT /auth/profile avatar=assetID
  Auth->>Asset: 校验 COMPLETED + creator=当前用户
  Auth->>AuthTbl: UPDATE avatar FK
```

## 迁移

- 基线：[`migration/src/000001_20260819.rs`](../migration/src/000001_20260819.rs)
- Profile 字段：[`migration/src/000001_20260819.rs`](../migration/src/000001_20260819.rs)（`auth` 表内 `phone` / `gender` / `birthday` / `avatar`）

详见 [`migration/README.md`](../migration/README.md)。
