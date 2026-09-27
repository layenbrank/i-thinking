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

## 6. 全栈一键起（`apps/core/docker-compose.yml`）

本文件描述的是「进程怎么被编排」，落地形态就在仓库里的 compose：依赖四个
（Postgres+pgvector / Redis / go-captcha / Elasticsearch）+ 后端四个进程
（core-api / core-worker / core-orchestrator / ai-worker），一条命令起齐。

```bash
cd apps/core
docker compose up -d          # 全栈
docker compose logs -f core-api
docker compose down
```

手动（不走容器）时的对应关系，供对照排障：

| compose 服务 | 二进制 / 镜像 | 端口 | 说明 |
|--------------|---------------|------|------|
| `postgres` | `corex-postgres:18-zh-pgvector` | 5432 | 带 pgvector 与 zh_CN locale，首次 initdb 会建 `ai_worker` 库 |
| `redis` | `redis:7-alpine` | 6379 | 会话/限流/幂等/JWT 黑名单 |
| `gocaptcha` | `wenlng/go-captcha-service:1.0.5` | 8080 | 侧车，不是 core |
| `elasticsearch` | `elasticsearch:9.4.3` | 9200 | 非关键依赖 |
| `migrate` | core 镜像 | — | 一次性 `./migration up`，跑完即退（core-api 等它成功） |
| `core-api` | core 镜像 | 3000 | `./service` |
| `core-worker` | core 镜像 | — | `./worker`，outbox 投递 |
| `core-orchestrator` | core 镜像 | — | `./orchestrator`，可靠执行运行时 |
| `ai-worker` | `corex-ai-worker:local` | 8081（仅内网） | `./migration up` 由它自己启动时 apply |

接线要点（都和上面的探针约定对应）：

- `core-api` 的健康检查打 `/api/live`（进程活着），`depends_on` 用 `migrate: service_completed_successfully`
  ——迁移没成功就不该放它接流量。真正的「能不能接流量」由 `readinessProbe` 打 `/api/ready` 决定。
- `core-orchestrator` 的 `stop_grace_period: 30s` 必须大于 `durable.shutdown_grace_ms`（默认 5000），
  否则停机时在跑的活动会被硬杀。
- `ai-worker` **不对宿主机发布端口**：它的 `X-Internal-Token` 是长期共享密钥，只在内网可达即可。
  想单独验证它：`docker compose exec ai-worker curl -fsS http://127.0.0.1:8081/internal/v1/health`。
- `ai-worker` 的迁移**不由 `migrate` 服务负责**：它在自己库上启动时自动 apply（`apps/ai-worker/src/ai_worker/db.py`），
  所以探针在 DB 不可用时回 503 而不是崩掉。
- `gocaptcha` 关掉了 healthcheck（compose 里 `healthcheck: disable: true`）。该镜像是 distroless（无
  sh/curl/wget），镜像自带的自检 `--health-check` 在 1.0.5 里恒失败：它少传参数，且要求
  `/status/health` 返回 404 而实际返回 200。留着只会永远显示 unhealthy 掩盖真问题；
  要手工确认它活着：`curl -fsS http://127.0.0.1:8080/status/health`。`core-api` 对它只要求
  `service_started`，不依赖它的健康态。

### 6.1 起完自查（4 条命令）

```bash
curl -sS http://127.0.0.1:3000/api/live                       # 进程活着
curl -sS http://127.0.0.1:3000/api/ready                      # 四个依赖 + ai-worker 全部 up
docker compose exec ai-worker curl -fsS http://127.0.0.1:8081/internal/v1/health
docker compose exec postgres psql -U machenike -d postgres -c 'SELECT datname FROM pg_database'
```

### 6.2 两个容易误判的现象

- **首次冷启动慢**：`core-api` 要等 Elasticsearch 初始化完再建索引，全栈从零（`./data` 为空）
  起齐大约 2–3 分钟；之后 `down` 再 `up` 约 30 秒就 `/api/live` 200。
  这就是 §4 里 `startupProbe` 给 30×2s 宽限的原因，别把冷启动慢当成卡死。
- **`/api/ready` 里 elasticsearch 显示 `集群状态 red`**：这是 ES 的磁盘水位保护
  （默认 `cluster.routing.allocation.disk.watermark.high=90%`），宿主机磁盘用量超线后
  ES 拒绝分配任何分片。此时 ES 端口通、探针判 `up`（非关键依赖），但**索引不进去**。
  宿主机腾出空间即可，或者临时调低要求（不要长期关掉水位保护，那是唯一的磁盘护栏）：

  ```bash
  curl -X PUT http://127.0.0.1:9200/_cluster/settings -H 'Content-Type: application/json' \
    -d '{"persistent":{"cluster.routing.allocation.disk.watermark.high":"97%"}}'
  ```
- **容器里 `/guide/*.md` 打不开**：这是故意的——镜像只装二进制与 `config*.yaml`，不放仓库文档
  （`docker/core/Dockerfile` 里建的是空 `guide/` 目录，只为了不让 actix 在构造静态挂载时报
  `Specified path is not a directory`）。看文档直接看仓库里的 [guide/](.)。

## 7. 配置从哪来：文件 → 环境变量

加载顺序（后者覆盖前者）：`config.yaml` → `config.{profile}.yaml` → `config.local.yaml` → **`CORE__*` 环境变量**。

镜像里**只有** `config.yaml` / `config.development.yaml` / `config.production.yaml`
三个文件，且和二进制同目录（`configures/src/loader.rs` 按可执行文件所在目录找配置）。
容器态的地址与密钥全部由环境变量注入，键名规则：`CORE__` 前缀 + 层级用 `__` 分隔，
例：`CORE__DATABASE__URL` → `database.url`、`CORE__SERVER__PORT` → `server.port`。

两个放环境变量的位置（都在 `.gitignore` 里）：

| 文件 | 作用 | 例子 |
|------|------|------|
| `apps/core/.env` | 只参与 compose 的 `${VAR}` 插值 | `POSTGRES_PASSWORD`、`AI_WORKER_INTERNAL_TOKEN`、`SERVICE_TOKEN_SECRET`、`APP_ENV` |
| `apps/core/docker/stack.env` | 直接注入 core 容器的额外 `CORE__*` | `CORE__EVENTS__ENDPOINT`、`CORE__LOGGING__FORMAT` |

模板：`cp docker/stack.env.example docker/stack.env`（不建这两个文件也能 `up -d` 跑起来，默认值指向本机开发环境）。
优先级：compose 里显式写的 `CORE__*` > `stack.env` > 镜像内的 `config*.yaml`。

三处**必须成对一致**的值，不一致的表现往往是「能起但一发请求就 401/503」：

| 值 | core 侧 | ai-worker 侧 |
|----|---------|--------------|
| 内部共享令牌 | `ai_worker.token`（= `CORE__AI_WORKER__TOKEN`） | `AI_WORKER_INTERNAL_TOKEN` |
| 服务身份密钥 | `gateway.service_token_secret` | 无需配置（core 用它验令牌） |
| ai-worker 库 | 不涉及（core 不连它） | `AI_WORKER_DATABASE_URL` 必须指向 `ai_worker` 库 |

`gateway.service_token_secret` 为空 = `/api/v1/service/**` 整体 503，
表现就是 ai-worker 的摄取/嵌入全部失败（它换不到服务令牌）。

## 8. 切到生产要改什么

1. `APP_ENV=production`（compose 里 `CORE__APP__ENV` 随之切换；ai-worker 用 `AI_WORKER_ENVIRONMENT`）。
2. 换掉三个默认值：`POSTGRES_PASSWORD`、`AI_WORKER_INTERNAL_TOKEN`、`SERVICE_TOKEN_SECRET`。
3. `CORE__SECURITY__SECRET` / `CORE__SECURITY__JWT_SECRET` 必须是真随机值：
   生产下占位值（含 `change-me`、`your-` 前缀等）会被 `validate()` 直接拒绝启动。
4. `CORE__EVENTS__ENDPOINT` 不能为空：`worker` 二进制在 production 下启动即校验；
   留空等于让事件永远压在 outbox 里。
5. `auth.captcha.enabled` 必须为 `true`、`otp.mock` 强制为 `false`（生产校验项，配置文件里已是安全值）。
6. 数据目录（`./data/*`）与日志要纳入备份策略；`docker compose down -v` 会连数据一起删。

