# 横切架构：NestJS ↔ Actix

对照仓库：

- NestJS：`D:\Documents\Node\service`
- 本服务：Actix（按 Nest 管道阶段拆分目录）

详细调研记录见根目录 [`findings.md`](../findings.md)。

## Nest 功能分类

| 分类 | 职责 | Nest 典型位置 | 本 Nest 项目 |
|------|------|---------------|--------------|
| Middleware | 最早横切（日志、Cookie、CORS） | `middleware/` 或 Express `app.use` | `bootstrap.ts` + pino（无自定义 NestMiddleware） |
| Guard | 鉴权 / 是否放行 Handler | `guards/` | `guards/auth.guard.ts`（**未注册**） |
| Interceptor | 成功路径 AOP（包装响应、计时） | `interceptors/` | 全局 `ResponseInterceptor` |
| Pipe | 入参校验与转换 | 全局 / 参数级 | 全局 `ValidationPipe` |
| Filter | 异常 → 统一错误响应 | `filters/` | 全局 `ExceptionFilter`（`APP_FILTER`） |
| Decorator | 元数据或参数注入 | `decorators/` | `@AuthToken()`（**未使用**） |

### 请求管道

```
Middleware → Guard → Interceptor(pre) → Pipe → Handler
  → Interceptor(post)  （成功）
  → Filter             （异常）
```

## 与本仓库映射（已落地）

| Nest | Actix / 本仓库 |
|------|----------------|
| Middleware | [`cors`](../src/middlewares/cors.rs)、[`access_log`](../src/middlewares/access_log.rs)、[`logger`](../src/utils/logger.rs) |
| Guard | [`Auth`](../src/guards/auth.rs)、[`Session`](../src/guards/session.rs)（请求身份上下文）、[`TenantCtx`](../src/guards/tenant.rs)（租户作用域入口）、[`blacklist`](../src/guards/blacklist.rs)、[`public`](../src/guards/public.rs) |
| Interceptor | [`Envelope` / `Paginated`](../src/interceptors/envelope.rs) |
| Filter | [`Exception`](../src/filters/exception.rs)（`details` 非生产才写入） |
| Guard | [`Auth::required` / `Auth::admin`](../src/guards/auth.rs) + [`permission`](../src/guards/permission.rs) |
| CORS | [`cors(config)`](../src/middlewares/cors.rs)，`CORS_ORIGINS` / 生产收紧 |
| 状态码 | [`code`](../src/utils/code.rs) |
| Pipe | `web::Json` + schema `*P` |
| Decorator | 模块 `configure` + Auth 作用域 |

统一响应形状：`code` / `success` / `msg` / `data` / `timestamp` / `traceID`。HTTP 状态码由错误码归属推导（成功恒为 200，失败按 `code` 段位返回 4xx/5xx），业务仍以 `code` 为准（见 [error-codes.md](error-codes.md)）。
链路追踪：请求可带 W3C `traceparent`（缺省由服务端生成），响应始终回显该头，信封 `traceID` 即其 trace-id（见 [`trace`](../src/middlewares/trace.rs)）。

### 请求身份管道

[`Auth`](../src/guards/auth.rs) 中间件按固定顺序执行，任一步失败即短路返回：

```
令牌解析 → 公开路由放行 → Configure(500) → verify_token(401)
  → 声明级快速拒绝(403) → Redis 黑名单(500/300002) → Storage(500)
  → Session::resolve(401/500) → authz 复核(403) → 注入 Session
```

- 令牌只证明身份（`sub` + 过期时间）；**平台角色与账号状态以库为准**，每请求读取一次。
- `Session`（[`guards/session.rs`](../src/guards/session.rs)）是 handler 取用身份的唯一途径，取代了原先直接读 `Claims` 的做法。
- 解析失败一律 fail-closed：未知角色字面量、`sub` 非 UUID、账号不存在、账号被停用都会拒绝请求，不会静默降级为普通用户。
- 声明级快速拒绝保证「令牌里不是 ADMIN」时无需访问 Redis / 数据库即可 403；`Auth::admin()` 再以 `authz::require(Resource::Account, Action::Manage)` 复核，避免散落的角色字面量比较（R3）。

### 租户作用域管道

中间件只到「是谁」为止；「在哪个租户、是什么角色」由 handler 首行的 [`TenantCtx`](../src/guards/tenant.rs) 决定（[`database.md`](database.md#租户隔离rls)）：

```
TenantCtx::enter(storage, &session, tenant_id)
  → Storage::tenant_tx(tenant_id)（事务 + SET LOCAL app.tenant_id）
  → identity::persistence::membership（在作用域内读成员关系）
  → 非成员且非平台管理员 → 403(300007)
  → Principal::with_tenant(..) → Session 的 principal 变成当前租户的身份

handler 只用：ctx.tx() 读写 / ctx.require(permission) 判权限 / ctx.commit() 提交
```

- 权限判定统一走 [`authz`](../crates/authz/src/lib.rs)：`Resource::Tenant`、`Resource::Member` … 的策略表决定角色能否执行动作；
  平台管理员走运维通道（上下文的租户角色为空也放行）。
- 角色不再由业务代码比较：`ctx.require(..)` 失败即 403(300006)，`tenantID = ?` 不再手写。
- 写操作必须显式 `commit()`，未提交即随事务回滚，租户作用域同时失效。

## 目录约定

| 目录 | 角色 |
|------|------|
| `src/middlewares/` | CORS、访问日志 |
| `src/guards/` | `auth` / `session` / `tenant` / `blacklist` / `permission` / `public` |
| `src/interceptors/` | 成功信封 |
| `src/filters/` | 失败信封 |
| `src/utils/code.rs` | 业务码 |
| `src/services/upload/{validation,storage,repository,error,multipart}` | 上传拆分 + creator 校验（四文件例外） |
| `src/services/auth/service.rs` | 含 profile 辅助（user 等可复用） |
| `src/services/search/repository.rs` | ES 索引/检索（client 仅连接） |
| `scripts/arch.ts`（`bun run arch`） | 模块结构 / 禁止路径卫生检查（CI） |

## 参考路径（Nest）

- `src/bootstrap.ts` — 全局 interceptor / pipe / CORS / cookie  
- `src/app.module.ts` — `APP_FILTER`  
- `src/filters/exception.filter.ts`  
- `src/interceptors/response/response.interceptor.ts`  
- `src/guards/auth.guard.ts`  
- `src/decorators/auth-token.decorator.ts`  
