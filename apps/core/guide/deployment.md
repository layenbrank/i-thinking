# 部署与运维探针

本文件说明 core 服务对外暴露的三个运维端点及其编排含义。契约本身见 `spec/openapi.json`（生成物），
版本策略见 [`api-versioning.md`](api-versioning.md)。

## 1. 三个端点各回答什么问题

| 端点 | 回答的问题 | HTTP 状态 | 用在哪里 |
|------|-----------|-----------|----------|
| `GET /api/live` | 进程还在跑吗 | **恒 200** | `livenessProbe`（实在不行就重启） |
| `GET /api/ready` | 现在能接流量吗 | 200 / **503** | `readinessProbe`（从负载均衡里摘掉/放回） |
| `GET /api/health` | 各依赖现在什么状态 | **恒 200** | 人工排查、看板、值班巡检 |

三者都不需要鉴权，都不带 `/api/v1` 版本前缀（运维语义不随业务版本变化）。

**为什么 liveness 不碰依赖**：依赖故障时重启本进程毫无帮助，只会把「一次故障」放大成「反复重启」。
liveness 只证明事件循环还在转；依赖坏了由 readiness 摘流量，由值班修依赖。

**为什么 health 恒 200**：它是给人看的依赖全景。探针化改造前它就是这么用的（异常只体现在
`data.status=degraded`），这条既有契约保持不变；用 HTTP 状态码表达可用性的是 `/api/ready`。

## 2. 关键依赖与非关键依赖

「关键」的判定标准只有一条：**缺了它，是不是所有请求都无法正确服务**。

| 依赖 | 关键 | 缺失后果 | 探针判定 |
|------|------|----------|----------|
| PostgreSQL | ✅ | 连接池一断，读写全线失败；两个二进制启动即 `expect` 它 | `ping()`：`up` / `down` |
| Redis | ✅ | 会话、限流、幂等、JWT 黑名单都在它上面，鉴权入口直接不可用 | `ping()`：`up` / `down` |
| Elasticsearch | ❌ | 只影响检索类接口 | 集群颜色（green/yellow/red）取不到即 `down`；只要可达即 `up` |
| ai-worker（Python） | ❌ | 只影响 RAG 长任务 | 未配置 → `unconfigured`（不算故障）；配了就按 2s 超时探 `/internal/v1/health` |

- 关键依赖任一故障 → `/api/ready` 返回 **503**，`code = 100002`（`system.SERVICE_UNAVAILABLE`），
  `msg` 点名故障项（例：`依赖未就绪：postgres`）。
- 仅非关键依赖异常 → **200**，`data.status = degraded`，**照常接流量**。
- 每条判定随响应自述：`data.checks[].critical`，运维侧不必对着本文档猜。

`/api/ready` 的 `details` 只在非生产环境返回完整快照（统一约定：生产不回调试细节）。

## 3. 响应示例

`GET /api/live`：

```json
{ "code": 200000, "success": true, "msg": "服务进程存活", "data": { "status": "alive", "version": "0.1.0", "timestamp": 1739000000000 } }
```

`GET /api/ready`（全部就绪）：

```json
{
  "code": 200000,
  "success": true,
  "msg": "依赖全部就绪",
  "data": {
    "status": "ready",
    "version": "0.1.0",
    "timestamp": 1739000000000,
    "checks": [
      { "name": "postgres", "critical": true, "status": "up" },
      { "name": "redis", "critical": true, "status": "up" },
      { "name": "elasticsearch", "critical": false, "status": "up", "detail": "集群状态 yellow" },
      { "name": "ai-worker", "critical": false, "status": "unconfigured", "detail": "未配置 ai_worker.base_url" }
    ]
  }
}
```

`GET /api/ready`（关键依赖故障）：

```json
{ "code": 100002, "success": false, "msg": "依赖未就绪：redis", "data": null }
```

## 4. 编排接线

一次最小接线（K8s 语义，compose 等编排器同理）：

```yaml
startupProbe:   { httpGet: { path: /api/ready, port: 3000 }, failureThreshold: 30, periodSeconds: 2 }
livenessProbe:  { httpGet: { path: /api/live,  port: 3000 }, periodSeconds: 10 }
readinessProbe: { httpGet: { path: /api/ready, port: 3000 }, periodSeconds: 10 }
```

- **不要**把 `/api/live` 配成 `readinessProbe`：它永远 200，摘不掉坏实例。
- **不要**把 `/api/ready` 配成 `livenessProbe`：依赖抖动会变成滚动重启风暴。
- **不要**把 `/api/health` 当摘流量判据：它恒 200，用它判断是把坏实例留在负载均衡里。

## 5. 已知边界

- 探针不缓存结果，每次请求都真探依赖；`/api/ready` 对 ai-worker 每次现建 HTTP 客户端
  （2s 超时），因此它比 `/api/health` 贵一点，仍属于同一量级。
- 探针路径在同一份 OpenAPI 里公开（tag `System`），便于契约漂移门禁覆盖；暴露探测结果
  不构成信息泄露（无业务数据），但若面向公网，建议只在编排器可达的内网端口暴露。
