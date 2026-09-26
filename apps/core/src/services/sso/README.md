# SSO

路由前缀：`/api/v1/sso`

## 概述

单点登录（OIDC）。租户级配置 IdP 连接，登录走标准授权码流程。

| 能力     | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 连接管理 | 每个租户可配 OIDC 连接（issuer / clientID / clientSecret / redirectUri）               |
| 授权跳转 | `/sso/{id}/authorize` 重定向到 IdP                                                     |
| 回调     | `/sso/{id}/callback` 用 code 换取 token、校验 id_token，并在该连接所属租户处理成员关系 |

## 与同域其他模块的区别

- [`auth`](../auth/README.md)：账号密码 / OTP / 图形验证码等本服务自有的登录方式；本模块是**外部 IdP** 委托登录。
- [`tenant`](../tenant/README.md)：连接按 `tenantID` 归属；回调后落到该租户的成员关系。

## 路由一览

公开（无需 JWT）：

| 方法 | 路径                         | 说明                            |
| ---- | ---------------------------- | ------------------------------- |
| GET  | `/api/v1/sso/{id}/authorize` | 跳转 IdP 授权页                 |
| GET  | `/api/v1/sso/{id}/callback`  | IdP 回调，换取 token 并建立会话 |

后台（平台 ADMIN）：

| 方法   | 路径                           | 说明     |
| ------ | ------------------------------ | -------- |
| GET    | `/api/v1/sso/connections`      | 连接列表 |
| POST   | `/api/v1/sso/connections`      | 新建连接 |
| PUT    | `/api/v1/sso/connections/{id}` | 更新连接 |
| DELETE | `/api/v1/sso/connections/{id}` | 删除连接 |

## 鉴权说明

- `connections` 系列在 `Auth::admin()` 下，需令牌有效且库中平台角色为 `ADMIN`（令牌 `role` 声明只用于快速拒绝）。
- `authorize` / `callback` 是浏览器重定向入口，**不挂鉴权**，靠 `state` / `id_token` 校验。

## 数据表

Entity：[`entity/src/sso_connection.rs`](../../../entity/src/sso_connection.rs)（表 `sso_connection`）

| 列 (DB)                                                            | 类型    | 说明                              |
| ------------------------------------------------------------------ | ------- | --------------------------------- |
| id                                                                 | uuid PK | 连接 ID                           |
| tenantID                                                           | uuid FK | → `tenant.id`，删除租户时 CASCADE |
| provider                                                           | text    | IdP 类型标识                      |
| issuer                                                             | text    | OIDC Issuer                       |
| clientID                                                           | text    | 客户端 ID                         |
| clientSecretEnc                                                    | text    | 客户端密钥（密文）                |
| redirectUri                                                        | text    | 回调地址                          |
| status                                                             | text    | ACTIVE / DISABLED，默认 ACTIVE    |
| archivedAt / createdAt / creator / updatedAt / updater / expiresAt |         | 审计字段                          |

## 实现架构

```
SsoModule::configure
  ├── scope("") .wrap(Auth::admin())
  │     └── /connections CRUD → SsoController → SsoService
  └── 公开路由 /{id}/authorize、/{id}/callback → SsoController
        ├── authorize：组装授权 URL 并重定向
        └── callback ：code → token_endpoint 换 token → 校验 id_token(JWKS)
                       → 按 sso_connection.tenantID 处理租户成员关系
```

## 错误码

| code   | 场景                     |
| ------ | ------------------------ |
| 200003 | 参数无效                 |
| 300006 | 权限不足（非平台 ADMIN） |
| 400001 | 连接不存在               |
| 400002 | 连接已存在               |
| 600001 | 数据库错误               |
