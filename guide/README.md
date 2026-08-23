# 项目指南

基础 URL：`http://127.0.0.1:3000`（见 [`configuration.md`](configuration.md)）

## 文档入口

| 类型 | 位置 |
|------|------|
| OpenAPI 规范（生成） | [`../spec/openapi.json`](../spec/openapi.json) · 开发环境 `/api-docs/openapi.json` |
| Swagger UI | `/swagger-ui/`（需 `--features openapi`） |
| 业务错误码 | [`error-codes.md`](error-codes.md) · 开发环境 `/guide/error-codes.md` |
| 数据库协作 | [`database.md`](database.md) |
| 配置（YAML） | [`configuration.md`](configuration.md) |
| 外部集成（Sidecar） | [`integrations.md`](integrations.md) |
| sidecars（Go 侧车入门） | [`../sidecars/README.md`](../sidecars/README.md) |
| Redis / Elasticsearch（调研） | [`redis-elasticsearch.md`](redis-elasticsearch.md) |
| 横切架构（Nest ↔ Actix） | [`architecture-cross-cutting.md`](architecture-cross-cutting.md) |
| 模块接口详情 | [`src/services/*/README.md`](../src/services/auth/README.md) |
| HTTP 测试 | [`http/`](../http/) |

生成 OpenAPI：`cargo run --bin docs`

## 统一响应

HTTP 状态码始终为 **200**，业务结果看 body：

- 成功：`code = 200000`，`success = true`
- 失败：`success = false`，`code` 见 [error-codes.md](error-codes.md)

## 鉴权

```
Authorization: Bearer <JWT>
```

Token 来自 `POST /api/v1/auth/signin` 或 `signup` 响应的 `data.token`。

## 模块导航

| 模块 | 前缀 | 文档 | HTTP 测试 |
|------|------|------|-----------|
| 系统 | `/api/health` | OpenAPI | [`http/00-health.http`](../http/00-health.http) |
| 认证 | `/api/v1/auth` | [auth](../src/services/auth/README.md) | [`http/01-auth.http`](../http/01-auth.http) |
| 用户(后台) | `/api/v1/users` | [user](../src/services/user/README.md) | [`http/02-users.http`](../http/02-users.http) |
| 上传 | `/api/v1/upload` | [upload](../src/services/upload/README.md) | [`http/03-upload.http`](../http/03-upload.http) |
| 搜索引擎代理 | `/api/v1/engine` | [engine](../src/services/engine/README.md) | [`http/04-engine.http`](../http/04-engine.http) |
| ES 全文检索 | `/api/v1/search` | [search](../src/services/search/README.md) | [`http/06-search.http`](../http/06-search.http) |
| 应用 | `/api/v1/application` | [application](../src/services/application/README.md) | [`http/05-application.http`](../http/05-application.http) |

## 典型调用顺序

### 登录后访问受保护接口

1. `POST /api/v1/auth/signin` → 取 `token`
2. 后续请求带 `Authorization: Bearer {token}`

### 更新个人资料 + 头像

1. signin
2. `GET /api/v1/auth/profile`
3. upload prepare → chunk → finalize
4. `PUT /api/v1/auth/profile` 设置 `avatar`

### 后台管理用户

1. signin（管理员）
2. `GET/POST/PUT/DELETE /api/v1/users`

## 历史文档

过时设计笔记见 [`archive/`](archive/README.md)，不作为现行规范。
