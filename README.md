# Master Service

基于 **Actix Web + SeaORM + PostgreSQL** 的 Rust HTTP 服务，提供认证、用户管理、分片上传、搜索建议等 API。

## 技术栈

| 组件             | 说明                                                                   |
| ---------------- | ---------------------------------------------------------------------- |
| Actix Web 4      | HTTP 框架                                                              |
| SeaORM 2         | PostgreSQL ORM                                                         |
| JWT              | 登录鉴权                                                               |
| Argon2 / AES-GCM | 密码与加密配置                                                         |
| utoipa           | OpenAPI 3.x 文档生成                                                   |
| Bun + ky         | 仓库脚本（`scripts/`，`@/` 由 tsconfig paths 解析）；见 `package.json` |

## 快速开始

### 配置

分层 YAML（见 [`guide/configuration.md`](guide/configuration.md)）：

```powershell
Copy-Item config.local.yaml.example config.local.yaml
# 编辑 database.url、security.jwt_secret 等
```

默认 `config.yaml` 已包含开发连接串；本机差异用 `config.local.yaml` 覆盖。

### 数据库迁移

```bash
cargo run -p migration -- up
```

详见 [`migration/README.md`](migration/README.md)。

### 启动服务

```bash
# 安装 Bun 与脚本依赖（架构检查 / 格式化 / 上传 e2e）
bun install

# 开发热重载（cargo-watch；监听 src/entity/migration，Windows 下 --poll）
bun run dev
# 不打断正在运行的进程：变更排队，等当前 cargo run 结束后再启
bun run dev:no-restart
# 需已安装: cargo install cargo-watch --locked
# 无 watch（可选）
cargo run --bin service --features openapi

# 生产构建（不含 Swagger UI）
cargo run --bin service --release
# 或：bun run build
```

服务默认监听 `http://127.0.0.1:3000`。

**Swagger UI**（debug 构建 + `openapi` feature 默认开启）：

- UI：`http://127.0.0.1:3000/swagger-ui/`
- OpenAPI JSON：`http://127.0.0.1:3000/api-docs/openapi.json`

环境变量：

| 变量                   | 说明                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| `ENABLE_SWAGGER=true`  | 强制开启 Swagger UI 与 `/guide/*` 静态文档（release 亦可用，仅限内网） |
| `ENABLE_SWAGGER=false` | 强制关闭文档端点                                                       |

生产环境默认不暴露 `/swagger-ui` 与 `/api-docs/openapi.json`。

### 导出 OpenAPI（Apifox 离线导入）

```bash
bun run docs
# 或：cargo run --bin docs
# 生成 spec/openapi.json
```

### 测试

```bash
bun run arch
cargo test --lib -p service
cargo test --test oas_consistency
```

## 项目结构

```
scripts/                  # Bun 脚本（bun run …）
  apis/                   # 接口封装（auth / upload）
  types/                  # 请求/响应类型
  utils/                  # http（ky）/ auth / http.errors
  arch.ts | dev.ts | imports.ts | upload.ts
src/
  bin/service.rs          # 入口
  services/
    auth/                 # 登录、注册、个人 profile（含 profile 辅助）
    user/                 # 后台用户 CRUD（复用 auth::service 中 profile 辅助）
    upload/               # 分片上传（validation/storage/repository）
    search/               # ES 检索（repository 领域查询）
    engine/               # Bing 搜索建议代理
    markdown/             # Markdown 占位脚手架（未挂载到路由）
    tenant/               # 多租户组织与成员
    subscription/         # 个人租户订阅（免费 / 付费档位）
    gateway/              # 模型网关：转发 / 配额 / 用量 / 审计
    sso/                  # 单点登录（OIDC）
    application/          # 应用入口（挂载 v1 路由）
  middlewares/            # CORS、AccessLog（Nest Middleware）
  guards/                 # Auth、黑名单、公开路径（Nest Guard）
  interceptors/envelope.rs    # Body / Paginated（Nest Interceptor）
  filters/exception.rs   # Exception（Nest Filter）
  utils/code.rs   # 业务状态码
  oas/                    # utoipa 文档定义（path doc + OpenDoc）
entity/                   # SeaORM Entity（auth / asset / chunk / tenant / tenant_member / subscription / gateway_* / sso_connection）
migration/                # 数据库迁移
http/                     # REST Client 测试文件
guide/                    # 项目指南（人工文档）
spec/                     # OpenAPI 生成物
```

## 模块文档

每个 `src/services/{name}/` 的职责、路由、数据表与错误码见其 README：

| 模块         | 路由前缀                             | 文档                                                |
| ------------ | ------------------------------------ | --------------------------------------------------- |
| 认证         | `/api/v1/auth`                       | [auth](src/services/auth/README.md)                 |
| 用户(后台)   | `/api/v1/users`                      | [user](src/services/user/README.md)                 |
| 上传         | `/api/v1/upload`                     | [upload](src/services/upload/README.md)             |
| 搜索引擎代理 | `/api/v1/engine`                     | [engine](src/services/engine/README.md)             |
| Markdown     | —（未挂载）                          | [markdown](src/services/markdown/README.md)         |
| ES 全文检索  | `/api/v1/search`                     | [search](src/services/search/README.md)             |
| 租户         | `/api/v1/tenants`                    | [tenant](src/services/tenant/README.md)             |
| 订阅         | `/api/v1/tenants/{id}/subscriptions` | [subscription](src/services/subscription/README.md) |
| 模型网关     | `/api/v1/gateway`                    | [gateway](src/services/gateway/README.md)           |
| 单点登录     | `/api/v1/sso`                        | [sso](src/services/sso/README.md)                   |
| 应用         | `/api/v1/application`                | [application](src/services/application/README.md)   |

模块导航（含 HTTP 测试文件）见 [`guide/README.md`](guide/README.md#模块导航)。

## API 文档

- **OpenAPI 规范**：[`spec/openapi.json`](spec/openapi.json)（`cargo run --bin docs` 生成）
- **Swagger UI**：开发环境 `http://127.0.0.1:3000/swagger-ui/`
- **业务错误码**：[`guide/error-codes.md`](guide/error-codes.md)
- **[项目指南](guide/README.md)** — 鉴权、调用顺序、模块导航
- **[数据库表协作](guide/database.md)** — ER 图、auth/asset 字段、跨模块流程

> `cargo doc` 生成 Rustdoc；`cargo run --bin docs` 导出 OpenAPI 规范。

### Apifox 导入

1. Apifox → **导入** → **OpenAPI**
2. 选择以下任一方式：
   - URL：`http://127.0.0.1:3000/api-docs/openapi.json`（需先启动服务并开启 Swagger）
   - 文件：导入 `spec/openapi.json`
3. 配置环境变量（参考 [`http/http-client.env.json`](http/http-client.env.json)）：
   - `baseUrl` / 前置 URL = `http://127.0.0.1:3000`
   - `token` = 登录后从 `POST /api/v1/auth/signin` 的 `data.token` 写入（后置提取）
4. **鉴权组件 `bearer_auth`**：Token 填 `{{token}}`（不要用导入时默认的 `{{bearerToken}}`）
5. 建议开启 Apifox「自动同步」，指向 openapi.json URL

> Apifox 断言请检查 `body.code === 200000`，而非 HTTP status code。  
> OpenAPI 的 `bearer_auth` 已标注 `x-default: {{token}}`；若导入后仍是 `bearerToken`，按上一步手动改一次即可。

| 模块             | 文档                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| 认证             | [src/services/auth/README.md](src/services/auth/README.md)               |
| 用户(后台)       | [src/services/user/README.md](src/services/user/README.md)               |
| 上传             | [src/services/upload/README.md](src/services/upload/README.md)           |
| 搜索 (ES)        | [src/services/search/README.md](src/services/search/README.md)           |
| 搜索引擎         | [src/services/engine/README.md](src/services/engine/README.md)           |
| 应用             | [src/services/application/README.md](src/services/application/README.md) |
| Markdown（占位） | [src/services/markdown/README.md](src/services/markdown/README.md)       |

## HTTP 测试

使用 VS Code / Cursor **REST Client** 打开 [`http/`](http/) 目录下 `.http` 文件，按注释顺序执行。

## 职责划分

| 场景           | 接口                       |
| -------------- | -------------------------- |
| 用户自助改资料 | `PUT /api/v1/auth/profile` |
| 后台管账号     | `/api/v1/users/*`          |
| 文件/头像上传  | `/api/v1/upload/*`         |
