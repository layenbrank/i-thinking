# Master Service

基于 **Actix Web + SeaORM + PostgreSQL** 的 Rust HTTP 服务，提供认证、用户管理、分片上传、搜索建议等 API。

## 技术栈

| 组件 | 说明 |
|------|------|
| Actix Web 4 | HTTP 框架 |
| SeaORM 2 | PostgreSQL ORM |
| JWT | 登录鉴权 |
| Argon2 / AES-GCM | 密码与加密配置 |
| utoipa | OpenAPI 3.x 文档生成 |

## 快速开始

### 环境

复制 `.env` 并配置：

```env
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgres://user:pass@127.0.0.1:5432/dbname
JWT_SECRET=...
ENCRYPTION=aes
AES_KEY=...
```

### 数据库迁移

```bash
cargo run -p migration -- up
```

详见 [`migration/README.md`](migration/README.md)。

### 启动服务

```bash
# 开发环境（含 Swagger UI）
cargo run --bin service --features openapi

# 生产构建（不含 Swagger UI）
cargo run --bin service --release
```

服务默认监听 `http://127.0.0.1:3000`。

**Swagger UI**（debug 构建 + `openapi` feature 默认开启）：

- UI：`http://127.0.0.1:3000/swagger-ui/`
- OpenAPI JSON：`http://127.0.0.1:3000/api-docs/openapi.json`

环境变量：

| 变量 | 说明 |
|------|------|
| `ENABLE_SWAGGER=true` | 强制开启 Swagger UI 与 `/guide/*` 静态文档（release 亦可用，仅限内网） |
| `ENABLE_SWAGGER=false` | 强制关闭文档端点 |

生产环境默认不暴露 `/swagger-ui` 与 `/api-docs/openapi.json`。

### 导出 OpenAPI（Apifox 离线导入）

```bash
cargo run --bin docs
# 生成 spec/openapi.json
```

### 测试

```bash
cargo test --lib -p service
cargo test --test oas_consistency
```

## 项目结构

```
src/
  bin/service.rs          # 入口
  services/
    auth/                 # 登录、注册、个人 profile
    user/                 # 后台用户 CRUD
    upload/               # 分片上传
    engine/               # Bing 搜索建议代理
    application/          # 应用入口（挂载 v1 路由）
  middlewares/jwt.rs      # JWT 鉴权
  oas/                    # utoipa 文档定义（path doc + OpenDoc）
entity/                   # SeaORM Entity（auth、asset）
migration/                # 数据库迁移
http/                     # REST Client 测试文件
guide/                    # 项目指南（人工文档）
spec/                     # OpenAPI 生成物
```

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
   - `baseUrl` = `http://127.0.0.1:3000`
   - `token` = 登录后从 `POST /api/v1/auth/signin` 响应获取
4. 建议开启 Apifox「自动同步」，指向 openapi.json URL

> Apifox 断言请检查 `body.code === 200000`，而非 HTTP status code。

| 模块 | 文档 |
|------|------|
| 认证 | [src/services/auth/README.md](src/services/auth/README.md) |
| 用户(后台) | [src/services/user/README.md](src/services/user/README.md) |
| 上传 | [src/services/upload/README.md](src/services/upload/README.md) |
| 搜索引擎 | [src/services/engine/README.md](src/services/engine/README.md) |
| 应用 | [src/services/application/README.md](src/services/application/README.md) |

## HTTP 测试

使用 VS Code / Cursor **REST Client** 打开 [`http/`](http/) 目录下 `.http` 文件，按注释顺序执行。

## 职责划分

| 场景 | 接口 |
|------|------|
| 用户自助改资料 | `PUT /api/v1/auth/profile` |
| 后台管账号 | `/api/v1/users/*` |
| 文件/头像上传 | `/api/v1/upload/*` |
