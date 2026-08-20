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

## Docker 本地依赖

```powershell
# 可选：减少 .env 中 $ 密钥触发的 compose 警告
$env:COMPOSE_ENV_FILES=".env.compose"
docker compose up -d
docker compose ps
```

| 服务 | 端口 | 数据目录（绑定挂载） |
|------|------|----------------------|
| postgres | 5432 | [`data/postgres`](../data/postgres)；镜像 `docker/postgres`（`zh_CN.UTF-8`） |

locale 只在**首次** initdb 写入。若已是 `en_US`，需：

```powershell
docker compose stop postgres
Remove-Item -Recurse -Force .\data\postgres
docker compose build postgres
docker compose up -d postgres
```
| redis | 6379 | [`data/redis`](../data/redis) |
| elasticsearch | 9200 | [`data/elasticsearch`](../data/elasticsearch) |

配置见 [`docker-compose.yml`](../docker-compose.yml)。`data/` 已 gitignore。

清空本地数据：停止容器后删除对应目录再 `up`。销毁旧命名卷见下方「迁移说明」。

### 销毁旧命名卷（若曾用过 named volume）

```powershell
docker compose down
docker volume ls
docker volume rm master_postgres18_data master_postgres_data master_redis_data master_es_data
# 卷名以 docker volume ls 为准；不存在的会报错可忽略
```
## Redis / Elasticsearch

接入说明见 [`redis-elasticsearch.md`](redis-elasticsearch.md)。启动时连接失败会 **fail-fast**（与 PostgreSQL 相同）。

| 变量 | 必需 | 默认值 | 说明 |
|------|------|--------|------|
| `REDIS_URL` | 否 | `redis://127.0.0.1:6379` | Redis 连接串 |
| `REDIS_POOL_SIZE` | 否 | `8` | fred 连接池大小 |
| `ELASTICSEARCH_URL` | 否 | `https://127.0.0.1:9200` | ES 节点 URL |
| `ELASTICSEARCH_INDEX` | 否 | `corex_docs` | 默认索引名 |
| `ELASTICSEARCH_API_KEY` | 否 | — | ApiKey（`id:key` 或 encoded） |
| `ELASTICSEARCH_USERNAME` | 否 | — | Basic 用户名 |
| `ELASTICSEARCH_PASSWORD` | 否 | — | Basic 密码 |
| `ELASTICSEARCH_CLOUD_ID` | 否 | — | Elastic Cloud ID |
| `ELASTICSEARCH_INSECURE` | 否 | `false` | `true`/`1` 跳过 TLS 证书校验 |

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

## 日志

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RUST_LOG` | `info` | EnvFilter |
| `LOG_FORMAT` | `pretty` | 控制台：`pretty` 多行 / `compact` 单行；文件始终 JSON |
| `LOG_DIR` | `logs` | 日志目录 |
| `LOG_FILE` | `service.log` | 按日轮转文件名前缀 |
| `LOG_RETENTION_DAYS` | `14` | 保留天数 |

## 示例 `.env`

```env
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgres://machenike:Li33333.@127.0.0.1:5432/i-thinking
REDIS_URL=redis://127.0.0.1:6379
REDIS_POOL_SIZE=8
ELASTICSEARCH_URL=http://127.0.0.1:9200
ELASTICSEARCH_INDEX=corex_docs
JWT_SECRET=your-secret-key-should-be-at-least-32-characters-long
ENCRYPTION=argon2
```
