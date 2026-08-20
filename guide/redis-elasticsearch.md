# Redis 与 Elasticsearch 接入指南

> **状态：已落地**  
> 选型与风险详见根目录 [`findings.md`](../findings.md)。  
> **推荐开发依赖**：`docker compose up -d`（见 [`docker-compose.yml`](../docker-compose.yml)）；ES 9.4.3 HTTP、安全关闭。

注入方式：

```
Configure::from_env → RedisPool / EsClient / Storage → Arc → bootstrap_app! → web::Data
```

实现位置：

| 组件 | 路径 |
|------|------|
| Redis | [`src/clients/redis.rs`](../src/clients/redis.rs) |
| Elasticsearch | [`src/clients/elasticsearch.rs`](../src/clients/elasticsearch.rs) |
| 配置 | [`src/configures/configure.rs`](../src/configures/configure.rs) |
| 启动注入 | [`src/bin/service.rs`](../src/bin/service.rs)、[`src/lib.rs`](../src/lib.rs) |
| JWT 黑名单 | [`src/guards/blacklist.rs`](../src/guards/blacklist.rs)、`POST /api/v1/auth/signout` |
| ES 检索 | [`src/services/search/repository.rs`](../src/services/search/repository.rs) |

---

## 依赖

```toml
fred = { version = "10", features = ["enable-rustls", "partial-tracing"] }
elasticsearch = { version = "9.1.0-alpha.1", default-features = false, features = ["rustls-tls"] }
```

---

## 环境变量

见 [env.md](env.md)。关键项：

| 变量 | 默认 | 说明 |
|------|------|------|
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis 连接 |
| `REDIS_POOL_SIZE` | `8` | fred 池大小 |
| `ELASTICSEARCH_URL` | `https://127.0.0.1:9200` | ES 节点 |
| `ELASTICSEARCH_INDEX` | `corex_docs` | 默认索引 |
| `ELASTICSEARCH_USERNAME` / `PASSWORD` | — | Basic |
| `ELASTICSEARCH_API_KEY` | — | `id:key` 或 EncodedApiKey |
| `ELASTICSEARCH_INSECURE` | `false` | `true` 时跳过证书校验（本地自签） |

启动时 **fail-fast**：Redis / ES 连不上则进程退出（与 PostgreSQL 一致）。

### 本机联调（Docker）

```powershell
docker compose up -d
docker compose ps
docker exec corex-redis redis-cli PING
curl http://127.0.0.1:9200
# 应用连宿主机映射端口，见 .env
```

---

## 业务能力

### Redis：JWT 黑名单

1. `POST /api/v1/auth/signout`（需 JWT）→ `SET auth:jwt:bl:{sha256(token)}` + TTL=剩余有效期  
2. `Auth` 在校验签名后查询黑名单；命中则拒绝  

### Elasticsearch：文档索引与检索

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/search/docs` | 索引（title/content） |
| GET | `/api/v1/search/docs?q=` | multi_match 检索 |

HTTP 示例：[`http/06-search.http`](../http/06-search.http)。

### 健康检查

`GET /api/health` 返回 `postgres` / `redis` / `elasticsearch` 状态字段。

---

## 与 `engine` 模块边界

[`engine`](../src/services/engine/README.md) 代理外部搜索 HTTP API；本指南的 ES 客户端是独立 `search` 模块，不要混用。
