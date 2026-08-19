# 环境变量

配置来源：[`src/configures/configure.rs`](../src/configures/configure.rs)

在项目根目录创建 `.env`，或通过 `dotenv` 自动加载。

## 服务器

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `HOST` | 否 | `127.0.0.1` | 监听地址 |
| `PORT` | 否 | `3000` | 监听端口 |

## 数据库

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `DATABASE_URL` | 否 | `postgres://postgres:postgres@localhost:5432/i-thinking?sslmode=disable` | PostgreSQL 连接串 |

迁移：`cargo run -p migration -- up`（详见 [migration/README.md](../migration/README.md)）

## 认证与安全

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `JWT_SECRET` | 否 | （内置占位） | JWT 签名密钥，生产环境务必修改 |
| `SECRET` | 否 | `secret` | 通用密钥 |
| `ENCRYPTION` | 否 | `argon2` | 密码存储：`argon2` 或 `aes` |
| `AES_KEY` | ENCRYPTION=aes 时必需 | — | AES-256 密钥（`ENCRYPTION=aes` 时必填） |

生成密钥：`cargo run --bin generate`

## 文档（开发环境）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ENABLE_SWAGGER` | debug 为 true | `true`/`1` 开启 Swagger UI 与 `/guide/*` 静态文档 |

## 示例 `.env`

```env
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/i-thinking?sslmode=disable
JWT_SECRET=your-secret-key-should-be-at-least-32-characters-long
ENCRYPTION=argon2
```
