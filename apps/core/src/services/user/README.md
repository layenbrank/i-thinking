# User 模块（后台管理）

后台管理员对用户账号的 CRUD。路由前缀 `/api/v1/users`。

## 概述

| 能力               | 说明                        |
| ------------------ | --------------------------- |
| 列表 / 详情        | 查看所有用户及 profile 字段 |
| 创建 / 更新 / 删除 | 管理账号、密码、资料        |

**与 auth 模块区别**：

|                      | auth             | user（本模块）           |
| -------------------- | ---------------- | ------------------------ |
| 对象                 | 当前登录用户     | 任意用户 `{id}`          |
| 典型场景             | 改自己的 profile | 后台开户、重置密码、运维 |
| 改 username/password | profile **不可** | **可以**                 |

用户自助改资料请用 [`PUT /api/v1/auth/profile`](../auth/README.md)。

## 路由一览

| 方法   | 路径                 | 鉴权 | 说明     |
| ------ | -------------------- | ---- | -------- |
| GET    | `/api/v1/users`      | JWT + ADMIN | 用户列表 |
| POST   | `/api/v1/users`      | JWT + ADMIN | 创建用户 |
| GET    | `/api/v1/users/{id}` | JWT + ADMIN | 用户详情 |
| PUT    | `/api/v1/users/{id}` | JWT + ADMIN | 更新用户 |
| DELETE | `/api/v1/users/{id}` | JWT + ADMIN | 删除用户 |

## 鉴权说明

全路由挂载 [`Auth::admin()`](../../guards/auth.rs)：JWT 有效且 `Claims.role == ADMIN`，否则 `300006` 权限不足。

注册默认 `role=USER`；管理员可通过本模块 `WriteP.role` / `UpdateP.role` 提升为 `ADMIN`。

## 数据表 — auth

路由名为 `users`，**数据库表名为 `auth`**（[`entity/auth`](../../../entity/src/auth.rs)）。

| 操作      | 涉及列                                                          |
| --------- | --------------------------------------------------------------- |
| 列表/详情 | 全部业务列 + avatar FK 联查 asset                               |
| 创建      | username, password（加密）, 其余默认 NULL                       |
| 更新      | username, password, email, phone, gender, birthday, age, avatar |
| 删除      | 物理删除行                                                      |

## 表协作

- **avatar**：更新时与 auth profile 相同规则（`asset` 须 COMPLETED、creator 匹配目标用户）
- 读 avatar 时 `JOIN` asset 拼 `AvatarSummary`

详见 [`guide/database.md`](../../../guide/database.md)。

## 实现架构

```
UserController::find_all / find_one / insert / update / remove
  └── UserService
        └── auth::Entity（CRUD）
        └── asset::Entity::find_by_id（avatar 联查）
        └── encrypt_password（create/update 密码）
```

源码：[`module.rs`](module.rs) · [`controller.rs`](controller.rs) · [`service.rs`](service.rs) · [`schema.rs`](schema.rs)

---

## 接口详情

### GET /api/v1/users

**成功 data**：`UserResponse[]`

```json
{
  "id": "uuid",
  "username": "admin",
  "email": null,
  "phone": "13800138000",
  "gender": "MALE",
  "birthday": "1990-01-01",
  "age": 36,
  "avatar": { "id": "...", "url": "...", "mime": "...", "name": "..." },
  "createdAt": 1690000000000,
  "updatedAt": 1690000000000
}
```

---

### POST /api/v1/users

**请求**

```json
{
  "username": "newuser",
  "password": "123456"
}
```

**成功**：`code=200000`，`data` 为 `UserResponse`。

---

### GET /api/v1/users/{id}

路径参数 `id`：用户 UUID。

---

### PUT /api/v1/users/{id}

**请求**（均可选）

```json
{
  "username": "renamed",
  "password": "newpass",
  "email": "a@b.com",
  "phone": "13800138001",
  "gender": "FEMALE",
  "birthday": "1995-06-15",
  "age": 30,
  "avatar": "asset-uuid"
}
```

---

### DELETE /api/v1/users/{id}

**成功**：`msg`「删除用户成功」，无 `data`。

**常见错误**

| code   | msg            |
| ------ | -------------- |
| 500101 | 用户不存在     |
| 500102 | 用户名已存在   |
| 500104 | 手机号已被注册 |
| 200003 | 用户 ID 无效   |

---

## 使用示例

```bash
curl http://127.0.0.1:3000/api/v1/users \
  -H "Authorization: Bearer TOKEN"

curl -X POST http://127.0.0.1:3000/api/v1/users \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"123456"}'
```

**HTTP 文件**

- [`http/02-users.http`](../../../http/02-users.http)
- [`src/services/user/http/`](http/) · [`Rest-Client/`](Rest-Client/)
