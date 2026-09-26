# Tenant

路由前缀：`/api/v1/tenants`

## 概述

多租户组织与成员的 CRUD。租户类型由 `tenant.type` 区分：

| 类型       | 说明                                      |
| ---------- | ----------------------------------------- |
| `PERSONAL` | 个人租户，走免费/订阅档位配额；可开通订阅 |
| `TEAM`     | 团队租户，走全局兜底配额                  |

租户**不持有配额数字**：配额由「订阅档位 / 免费档 / 全局兜底」表达，优先级见 [`guide/configuration.md`](../../../guide/configuration.md#模型网关配额)。

## 与同域其他模块的区别

- [`subscription`](../subscription/README.md)：只管个人租户的付费档位与有效期，路由挂在本模块前缀下（`/tenants/{id}/subscriptions`）。
- [`payment`](../payment/README.md)：收钱并开通订阅，路由同样挂在本模块前缀下（`/tenants/{id}/orders`、`/tenants/{id}/pay/catalog`）。
- [`sso`](../sso/README.md)：按 `tenantID` 配置 OIDC 连接。
- [`gateway`](../gateway/README.md)：消费租户身份做配额与审计。

## 路由一览

| 方法   | 路径                                    | 鉴权              | 说明                                  |
| ------ | --------------------------------------- | ----------------- | ------------------------------------- |
| GET    | `/api/v1/tenants`                       | JWT               | 我所属的租户                          |
| POST   | `/api/v1/tenants`                       | JWT               | 创建租户（创建者自动成为 OWNER 成员） |
| GET    | `/api/v1/tenants/{id}`                  | JWT + 成员        | 租户详情                              |
| PUT    | `/api/v1/tenants/{id}`                  | JWT + OWNER/ADMIN | 更新名称 / 状态 / 类型                |
| DELETE | `/api/v1/tenants/{id}`                  | JWT + OWNER/ADMIN | 删除租户                              |
| GET    | `/api/v1/tenants/{id}/members`          | JWT + 成员        | 成员列表                              |
| POST   | `/api/v1/tenants/{id}/members`          | JWT + OWNER/ADMIN | 添加成员                              |
| PUT    | `/api/v1/tenants/{id}/members/{userId}` | JWT + OWNER/ADMIN | 改成员角色 / 状态                     |
| DELETE | `/api/v1/tenants/{id}/members/{userId}` | JWT + OWNER/ADMIN | 移除成员                              |

## 鉴权说明

- 整个 scope 挂 `Auth::isRequired()`，未登录返回 `300001`。
- 租户内角色 `TenantRole`：`OWNER` / `ADMIN` / `MEMBER`，`can_manage()` 仅前两者可改租户与成员。
- 平台 ADMIN（库中平台角色为 `ADMIN`，即 `Session::is_platform_admin()`）经 `TenantService::require_role` 旁路，视为租户 ADMIN。
- `require_role` / `membership_role` 是跨模块复用的公开入口（`subscription`、`gateway` 都调用）。

## 数据表

| 表              | Entity                                                                | 列                                                                                                            |
| --------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `tenant`        | [`entity/src/tenant.rs`](../../../entity/src/tenant.rs)               | `id / name / slug(唯一) / status / type / archivedAt / createdAt / creator / updatedAt / updater / expiresAt` |
| `tenant_member` | [`entity/src/tenant_member.rs`](../../../entity/src/tenant_member.rs) | `id / tenantID / userID / role / status / 审计字段`                                                           |

`tenant_member` 上 `(tenantID, userID)` 唯一（`uidx_tenant_member`），外键删除租户时 CASCADE。

## 实现架构

```
TenantModule::configure
  └── scope("/tenants") .wrap(Auth::isRequired())
        ├── configure(SubscriptionModule::configure)   # 订阅 / 配额，注册相对路径的 web::resource
        └── TenantController → TenantService
              ├── create / list / get / update / remove
              ├── list_members / add_member / update_member / remove_member
              └── require_role / membership_role     # 被 subscription、gateway 复用
                    └── 读写 tenant / tenant_member
```

## 错误码

| code   | 场景                               |
| ------ | ---------------------------------- |
| 200003 | 名称/slug 非法、状态或租户类型无效 |
| 300001 | 未登录                             |
| 300006 | 权限不足（非 OWNER/ADMIN）         |
| 300007 | 非租户成员                         |
| 400001 | 租户不存在                         |
| 400002 | slug 已存在、该用户已是成员        |
| 500101 | 待添加的用户不存在                 |
| 600001 | 数据库错误                         |
