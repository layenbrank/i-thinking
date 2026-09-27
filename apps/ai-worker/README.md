# ai-worker

`core`（Rust）的**叶子计算服务**。它不面向终端用户、不出网、不持有业务真值，只做两件事：

1. **RAG 摄取**：把 `core` 交给它的资产正文切成块、算嵌入、写进自己的向量库；
2. **agent 运行时**（后续阶段）：跑 Python 生态独有的 AI 能力。

服务身份、租户、资产、计费、对外 API 全部留在 `core`。ai-worker 是纯函数式的算力车间：**输入是 core 给的数据 + 令牌，输出是结果 + 落库**。

```
        ┌──────────── core (Rust, 唯一对外 API) ────────────┐
        │  api  ·  orchestrator  ·  业务表  ·  gateway 出网  │
        └───────┬───────────────────────────────▲───────────┘
   X-Internal-Token + HTTP 调用                  │ HTTP 回打（取正文 / 要嵌入算力）
                ▼                               │
        ┌───────┴───────────────────────────────┴───────────┐
        │  ai-worker (Python)   POST /internal/v1/rag/*      │
        │  ─ 自己的 Postgres schema（pgvector）              │
        │  ─ 不直连 core 的业务库，不持有业务真值             │
        └───────────────────────────────────────────────────┘
```

## 契约

**唯一契约源是 `apps/core/spec/internal.yaml`**（OpenAPI）。本服务只实现其中列出的路径与字段，
既不新增对外路径，也不吞掉未知字段。`core` 侧的实现见 `apps/core/src/clients/ai_worker.rs`，
两侧不一致时**以 `spec/internal.yaml` 为准**。

除契约中明确允许的三条例外，ai-worker **不得**对 core 发起任何其他请求：

| 用途 | 端点 | 鉴权 |
| --- | --- | --- |
| 换取短期服务令牌 | `POST /api/v1/service/token` | `X-Internal-Token` |
| 读取资产正文 | `GET /api/v1/service/assets/{assetID}/content` | `X-Service-Token`（`scope=asset-read`） |
| 请求嵌入算力 | `POST /api/v1/service/embeddings` | `X-Service-Token`（`scope=embeddings`） |

第三条例外在 P6b-4 落地。

### 两种令牌，别搞混

- **`X-Internal-Token`**：ai-worker → core 的「我是内部服务」声明。值 = core 配置里的
  `ai_worker.token`（core 侧由 `src/guards/service.rs::verify_internal` 比对）。
- **`X-Service-Token`**：core 签发的短期服务令牌，**由 ai-worker 用上面那把令牌去换**。
  换来的令牌带 `scope` / `tenantID` / `assetID` / `ttlSecs`，只能用于对应端点和对应受众
  （一件受众一件事，跨端点即 401）。ai-worker **不需要**也不应该拿到 `gateway.service_token_secret`。

## 目录

```
src/ai_worker/
├── __main__.py        # 入口：uvicorn.run(create_app(...))，无 import 期副作用
├── app.py             # create_app(settings)：装配中间件与路由
├── config.py          # Settings（pydantic-settings，前缀 AI_WORKER_，可选 .env）
├── errors.py          # 统一错误体 {error:{code,message}} 与错误码枚举
├── trace.py           # W3C traceparent 解析/生成 + ContextVar
├── logging_setup.py   # JSON 行日志（带 trace_id）
├── middleware.py      # 裸 ASGI 中间件：内部令牌闸门 + traceparent
├── db.py              # asyncpg 连接池 + pgvector 注册
├── migrations.py      # 启动时按 sql/NNNN_*.sql 顺序迁移
├── idempotency.py     # Idempotency-Key 预定/重放/冲突
├── capabilities.py    # 能力注册表（健康探针据此上报）
├── core_client.py     # 唯一的出站客户端：token / 资产正文 / （后续）嵌入
├── api/
│   └── health.py      # GET /internal/v1/health
├── rag_ingest/
│   ├── extract.py     # MIME → 纯文本（plain / json / html / pdf）
│   ├── chunking.py    # 纯函数切块器：尽量落在段落/句子边界，块可回溯原文偏移
│   ├── store.py       # 块集与块落库（按 chunk_set_id 幂等覆盖）
│   ├── schemas.py     # 请求/响应模型
│   └── router.py      # POST /internal/v1/assets/{assetID}/chunks
├── sql/
│   ├── 0001_init.sql  # 迁移脚本（随包分发）
│   └── 0002_rag_chunk.sql
├── agent_runtime/     # agent 运行时（P7 之后）
└── providers/         # 具体模型/向量库适配（P6b-4）
```

## 本地开发

```bash
cd apps/ai-worker
uv sync                                  # 建 .venv 并装依赖（含 dev 组）
cp .env.example .env                     # 按需改端口/令牌
uv run ai-worker                         # 监听 :8081
```

测试需要一个**带 pgvector 的 Postgres**：

```bash
docker run -d --name ai-worker-test-pg \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=ai_worker_test \
  -p 55433:5432 pgvector/pgvector:pg18

uv run pytest
uv run ruff check . && uv run ruff format --check .
uv run mypy
```

默认测试库是 `postgres://postgres:postgres@127.0.0.1:55433/ai_worker_test`，
可用 `AI_WORKER_TEST_DATABASE_URL` 覆盖。连不上数据库时测试会 **skip 并说明原因**，而不是假装通过。

## 设计决策

**为什么是独立的 uv 项目，而不是 uv workspace？**
本目录只有一个包。uv workspace 的价值在多包共享一把 `uv.lock`，单包时只剩一层间接；
等到 `providers` 之类需要拆包时再升格，成本很低（加一行 `[tool.uv.workspace]`）。
它同样**不进 pnpm workspace**（`pnpm-workspace.yaml` 里显式 `!apps/ai-worker`），
理由与 `apps/core` 一致：Python 的依赖由 uv 管，混进 pnpm 只会让两边都变脆。

**为什么不用 Alembic？**
ai-worker 的表是自己的私有数据（幂等表、块表、向量表），schema 变更只有 ai-worker 一个消费者，
不需要「离线生成 diff / 分支合并」这类协作能力。按 `sql/NNNN_*.sql` 顺序执行 + `schema_migration`
记账（40 行）就够，且迁移在启动时完成、多副本用 `pg_advisory_xact_lock` 串行化。
反过来说，`core` 的业务迁移仍然用它自己那套（`apps/core/migration`），两边互不知情。

**为什么健康探针不探测 core？**
`spec/internal.yaml` 的边界规则是「除三条例外，ai-worker 不得对 core 发起任何请求」——
健康探针每几秒一次，会稳稳地把这条规则压成噪音。而且方向本就该反过来：**core 探 ai-worker**
（`AiWorkerClient::health`），ai-worker 只在被探时如实上报自己这一侧的状态。
探针返回 `ok` 或 `degraded`；**自己这一侧**（数据库、pgvector 扩展）坏掉时回 **503**，
响应体仍是契约里的同一 schema，具体哪一项坏了写进日志，不写进响应体。

**为什么 `capabilities` 现在是空列表？**
能力要能被 core 的编排按名字发现，而「注册了但没实现」的功能会让编排跑到一半才发现 404。
所以注册表是**显式登记**的：P6b-2 为空，P6b-3 登记 `rag.chunk`，P6b-4 登记 `rag.embed`、`rag.index`。

**幂等为什么要落库？**
编排会重试活动。同一个 `Idempotency-Key` 重放必须返回**和第一次完全相同**的结果
（包括那次分配的 `chunkSetID`），否则重试会在向量库里留下两套平行数据。
所以先 `INSERT` 预定，跑完后把状态与响应体写回；同键不同载荷 → 409，同键仍在跑 → 409 + `Retry-After`。

**`chunkSetID` 为什么是推导出来的，而不是随机生成？**
`uuid5(endpoint, 幂等键, 载荷指纹)`。这样「块已经写进库、账本那一行还没写、进程被杀」的半截状态
会在重跑时落到**同一个** `chunkSetID` 上：`store.save()` 按 `chunk_set_id` 覆盖写，自己把半截数据修好。
用随机 id 的话，接管者只能看出「这行卡住了」，没法知道上一次写的是哪一份。
载荷指纹取的是**生效后**的参数（省略 `chunkSize` 与显式写默认值视为同一个请求），
否则 core 少带一个可选字段就会被判成 409。

**为什么切块要记 `char_start` / `char_end`？**
检索命中后要能把块定位回原文，高亮和「引用出处」都靠这两个偏移。
所以切块器不"重排"文本：块文本必须是原文的连续子串，块与块之间可以不重叠，但不能凭空造字。

**为什么中间件用裸 ASGI 而不是 `BaseHTTPMiddleware`？**
`BaseHTTPMiddleware` 会把请求体与下游执行挪进anyio 的独立 task，
`ContextVar` 的写入不会传回给路由处理函数 —— trace_id 会静默丢失。
裸 ASGI 中间件在同一个任务里跑，`ContextVar` 正常传播。

## 部署要点

- **不暴露到公网**：只监听内网地址；`X-Internal-Token` 是共享密钥，泄漏即等于拿到内部调用权。
- **反向依赖**：需要 Postgres（16+，带 pgvector 扩展）。`core` 与 ai-worker 必须用**各自独立的库/账号**，
  边界由测试钉住（`tests/test_db_boundary.py` 断言 ai-worker 的库里没有 core 的业务表）。
- **迁移失败 = 降级运行，不是启动失败**：进程照常起来，`/internal/v1/health` 回 503 `degraded`；
  探针每几秒重试一次连接并重跑迁移（迁移在 `pg_advisory_xact_lock` 下串行化，重复执行安全）。
  配置改对后不用重启容器就能自愈。**但「降级」不等于「可用」**：业务路由在池没起来时一律 503，
  不会带着半截 schema 提供服务；迁移一旦真的失败（例如 SQL 报错），日志里会有完整原因。
- **OpenAPI / docs 关闭**：`docs_url` / `redoc_url` / `openapi_url` 全为 `None`；
  契约以 `apps/core/spec/internal.yaml` 为唯一来源，避免出现第二份会漂移的定义。
