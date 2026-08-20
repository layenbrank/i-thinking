# Auth 模块

用户认证与个人资料自助管理。路由前缀 `/api/v1/auth`。

## 概述

| 能力        | 说明                                                            |
| ----------- | --------------------------------------------------------------- |
| 登录 / 注册 | 公开接口，返回 JWT                                              |
| 登出        | JWT 写入 Redis 黑名单，直至原 token 过期                        |
| Profile     | 当前用户读/改个人信息（email、phone、gender、birthday、avatar） |

**与 user 模块区别**：auth 面向**当前登录用户**；[`user`](../user/README.md) 面向**后台管理员** CRUD 任意用户。

## 路由一览

| 方法 | 路径                   | 鉴权 | 说明         |
| ---- | ---------------------- | ---- | ------------ |
| POST | `/api/v1/auth/signin`  | 无   | 登录         |
| POST | `/api/v1/auth/signup`  | 无   | 注册         |
| GET  | `/api/v1/auth/profile` | JWT  | 获取个人信息 |
| PUT  | `/api/v1/auth/profile` | JWT  | 更新个人信息 |
| POST | `/api/v1/auth/signout` | JWT  | 登出（Redis 黑名单） |

## 鉴权说明

- `signin` / `signup`：无 JWT
- `profile` / `signout`：挂载 [`JwtAuth::required()`](../../middlewares/jwt.rs)，从 `Authorization: Bearer` 解析 `Claims.sub` 作为用户 ID；中间件会查 Redis 黑名单
- 未登录返回 `300001`「用户未登录」
- 已登出 token 返回 `300002`「登录凭证已失效」

## 数据表

### auth（读写）

| 列                                  | profile 相关                             |
| ----------------------------------- | ---------------------------------------- |
| id, username, password              | 读；profile **不可改** username/password |
| email, phone, gender, birthday, age | 读/写                                    |
| avatar                              | FK → asset.id，读/写                     |
| createdAt, updatedAt, updater       | 读；更新时写 updater                     |

### asset（只读，avatar 联查）

更新/读取 profile 时，若 `avatar` 非空，联查 `asset` 表拼 `AvatarInfo`（id、url、mime、name）。

详见 [`guide/database.md`](../../../guide/database.md)。

## 表协作

```
auth.avatar ──FK──> asset.id
```

头像绑定流程：先 [upload](../upload/README.md) 完成图片上传 → `PUT /auth/profile` 传入 asset UUID。

## 实现架构

```
AuthController::signin/signup
  └── AuthService::signin/signup
        └── auth::Entity（查重/插入/校验密码）
        └── generate_token → JWT

AuthController::get_profile
  └── AuthService::get_profile(user_id)
        └── auth::Entity::find_by_id
        └── asset::Entity::find_by_id（avatar）

AuthController::update_profile
  └── AuthService::update_profile(user_id, req)
        └── ensure_phone_available
        └── validate_avatar_asset（COMPLETED + creator=本人 + image/*）
        └── auth::ActiveModel::update
```

源码：[`module.rs`](module.rs) · [`controller.rs`](controller.rs) · [`service.rs`](service.rs) · [`schema.rs`](schema.rs)

---

## 接口详情

### POST /api/v1/auth/signin

**请求**

```json
{
  "username": "admin",
  "password": "123456"
}
```

**成功 data**

```json
{
  "token": "eyJ...",
  "id": "uuid",
  "username": "admin",
  "createdAt": 1690000000000,
  "updatedAt": 1690000000000
}
```

**常见错误**

| code   | msg                    |
| ------ | ---------------------- |
| 500101 | 用户不存在（空库）     |
| 500301 | 用户名或密码错误       |
| 500102 | 用户名已存在（signup） |

---

### POST /api/v1/auth/signup

请求体同 signin。成功返回 token + 用户基本信息。

---

### GET /api/v1/auth/profile

**成功 data（ProfileResponse，camelCase）**

```json
{
  "id": "uuid",
  "username": "admin",
  "email": "a@b.com",
  "phone": "13800138000",
  "gender": "MALE",
  "birthday": "1990-01-01",
  "age": 36,
  "avatar": {
    "id": "asset-uuid",
    "url": "/api/v1/upload/files/{hash}",
    "mime": "image/png",
    "name": "avatar.png"
  },
  "createdAt": 1690000000000,
  "updatedAt": 1690000000000
}
```

---

### PUT /api/v1/auth/profile

**请求**（字段均可选，部分更新）

```json
{
  "email": "admin@example.com",
  "phone": "13800138000",
  "gender": "MALE",
  "birthday": "1990-01-01",
  "avatar": "asset-uuid"
}
```

- `gender`：`MALE` | `FEMALE`
- `birthday`：`YYYY-MM-DD`，会自动重算 `age`
- `avatar`：asset UUID；传 `null` 清除头像

**常见错误**

| code   | msg                             |
| ------ | ------------------------------- |
| 500104 | 手机号已被注册                  |
| 200003 | 性别/生日/头像参数无效          |
| 500204 | 文件不存在（avatar asset 无效） |
| 400004 | 资源访问被限制（非本人 asset）  |

---

## 使用示例

```bash
# 登录
curl -X POST http://127.0.0.1:3000/api/v1/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}'

# 获取 profile
curl http://127.0.0.1:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**HTTP 文件**

- [`http/01-auth.http`](../../../http/01-auth.http)
- [`http/PROFILE.http`](http/PROFILE.http)
