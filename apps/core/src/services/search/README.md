# Search 模块

基于 Elasticsearch 的全文检索示范。路由前缀 `/api/v1/search`。

与 [`engine`](../engine/README.md) 的区别：engine 通过 HTTP 代理外部搜索引擎；本模块使用官方 `elasticsearch` 客户端连接本机/集群 ES。

## 路由一览

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| POST | `/api/v1/search/docs` | JWT | 索引文档（`toWrite`） |
| GET | `/api/v1/search/docs?q=&size=` | JWT | 全文检索（`toRead`） |

## 数据模型

索引名默认 `corex_docs`（环境变量 `ELASTICSEARCH_INDEX`）。

| 字段 | 类型 | 说明 |
|------|------|------|
| title | text | 标题（搜索加权） |
| content | text | 正文 |
| createdAt | date | 写入时间 |

**不以 ES 为系统 of record**；生产环境应从 PostgreSQL 经 outbox/异步任务同步投影。

## 环境变量

见 [`guide/env.md`](../../../guide/env.md) 与 [`guide/redis-elasticsearch.md`](../../../guide/redis-elasticsearch.md)。

## 示例

```http
POST /api/v1/search/docs
Authorization: Bearer <token>
{ "title": "Redis", "content": "缓存与黑名单" }

GET /api/v1/search/docs?q=Redis&size=10
Authorization: Bearer <token>
```
