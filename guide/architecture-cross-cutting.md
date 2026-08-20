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
| Guard | [`Auth`](../src/guards/auth.rs)、[`blacklist`](../src/guards/blacklist.rs)、[`public`](../src/guards/public.rs) |
| Interceptor | [`Envelope` / `Paginated`](../src/interceptors/envelope.rs) |
| Filter | [`Exception`](../src/filters/exception.rs)（`details` 非生产才写入） |
| Guard | [`Auth::required` / `Auth::admin`](../src/guards/auth.rs) + [`permission`](../src/guards/permission.rs) |
| CORS | [`cors(config)`](../src/middlewares/cors.rs)，`CORS_ORIGINS` / 生产收紧 |
| 状态码 | [`code`](../src/utils/code.rs) |
| Pipe | `web::Json` + schema `*P` |
| Decorator | 模块 `configure` + Auth 作用域 |

统一响应形状：`code` / `success` / `msg` / `data` / `timestamp`。HTTP 状态码恒为 200，业务看 `code`（见 [error-codes.md](error-codes.md)）。

## 目录约定

| 目录 | 角色 |
|------|------|
| `src/middlewares/` | CORS、访问日志 |
| `src/guards/` | `auth` / `blacklist` / `public` |
| `src/interceptors/` | 成功信封 |
| `src/filters/` | 失败信封 |
| `src/utils/code.rs` | 业务码 |
| `src/services/upload/{validation,storage,repository,error,multipart}` | 上传拆分 + creator 校验（四文件例外） |
| `src/services/auth/service.rs` | 含 profile 辅助（user 等可复用） |
| `src/services/search/repository.rs` | ES 索引/检索（client 仅连接） |
| `scripts/check_architecture.py` | 模块结构 / 禁止路径卫生检查（CI） |

## 参考路径（Nest）

- `src/bootstrap.ts` — 全局 interceptor / pipe / CORS / cookie  
- `src/app.module.ts` — `APP_FILTER`  
- `src/filters/exception.filter.ts`  
- `src/interceptors/response/response.interceptor.ts`  
- `src/guards/auth.guard.ts`  
- `src/decorators/auth-token.decorator.ts`  
