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
| 请求嵌入算力 | `POST /api/v1/service/embeddings` | `X-Service-Token`（`scope=embeddings` + `model`） |

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
├── core_client.py     # 唯一的出站客户端：token / 资产正文 / 嵌入
├── api/
│   └── health.py      # GET /internal/v1/health
├── rag_ingest/
│   ├── extract.py     # MIME → 纯文本（plain / json / html / pdf）
│   ├── chunking.py    # 纯函数切块器：尽量落在段落/句子边界，块可回溯原文偏移
│   ├── store.py       # 块集/块/向量/索引落库（按 chunk_set_id 与 (tenant, asset) 幂等覆盖）
│   ├── schemas.py     # 请求/响应模型
│   ├── router.py      # POST /internal/v1/assets/{assetID}/chunks
│   ├── embed.py       # POST /internal/v1/assets/{assetID}/embeddings
│   └── index.py       # PUT  /internal/v1/assets/{assetID}/index
├── providers/
│   └── embeddings.py  # 上游嵌入响应的严格校验与分批
├── sql/
│   ├── 0001_init.sql  # 迁移脚本（随包分发）
│   ├── 0002_rag_chunk.sql
│   └── 0003_rag_embedding.sql
└── agent_runtime/     # agent 运行时（P7 之后）
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

## 与 core 联调

两个进程、两个库：core 连着业务库（`database.url`），ai-worker 连着自己那个带 pgvector 的库。
**ai-worker 不直连 core 的业务库**，这条边界由 `tests/test_db_boundary.py` 反证（库里只有
`OWNED_TABLES` 那几张表）。

两侧的取值必须对上，对不上就是 401/503，而且报错信息不会告诉你「是哪一个没对上」：

| ai-worker 侧 | core 侧 | 说明 |
| --- | --- | --- |
| `AI_WORKER_INTERNAL_TOKEN` | `ai_worker.token` | 请求头 `X-Internal-Token` 的值（默认 `dev-internal-token`） |
| `AI_WORKER_CORE_BASE_URL` | `server.port` | core 默认监听 3000（**不是** 8080，8080 是 gocaptcha 侧车） |
| —— | `gateway.service_token_secret` | 必须显式给值：`config.yaml` 默认空串 = `/api/v1/service/**` 整体 503 |

第三个必填项 `AI_WORKER_DATABASE_URL` 没有对应的 core 配置：它就是 ai-worker 自己的库，
**不能**填成 core 的业务库。

```bash
# ── core ──（cwd: apps/core）
cp config.local.yaml.example config.local.yaml   # 至少填 gateway.service_token_secret
cargo run -p migration -- up
cargo run --bin service                          # :3000

# ── ai-worker ──（cwd: apps/ai-worker）
uv sync
cp .env.example .env                             # 填三个必填项：内部令牌 / 自己的库 / core 基址
uv run ai-worker                                 # :8081
```

先看 ai-worker 自己活没活（`capabilities` 里应出现 `rag.chunk` / `rag.embed` / `rag.index`）：

```bash
curl -s -H 'X-Internal-Token: dev-internal-token' http://127.0.0.1:8081/internal/v1/health
```

再打一条真实的摄取链路。注意 `Idempotency-Key` 有 **8–200 字符**的长度约束，太短会得到 400；
`tenantID` / `assetID` 由 core 在编排里传下来，这里手工发就得自己编。前提是 core 的库里
**已经有一个带正文的资产**，且 core 的 gateway 能真的连上嵌入模型（`ai_worker.embed_model`，
默认 `text-embedding-3-small`）——否则第三步（嵌入）会卡在上游：

```bash
ASSET=8f14e45f-ceea-467a-9a3e-1b7c2d5e9f01
H=(-H 'X-Internal-Token: dev-internal-token'
   -H 'Idempotency-Key: local-run-0001'
   -H "traceparent: 00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01"
   -H 'Content-Type: application/json')

# 1) 切块：正文由 ai-worker 反向调 core 的 /api/v1/service/assets/{id}/content 取
curl -s "${H[@]}" -X POST "http://127.0.0.1:8081/internal/v1/assets/$ASSET/chunks" \
  -d '{"schemaVersion":1,"tenantID":"tenant-a","mime":"text/plain","name":"local.txt"}'

# 2) 嵌入：以返回的 chunkSetID / chunkCount 继续（区间左闭右开，to 必须大于 from）
SET=$(...); N=$(...)
curl -s "${H[@]}" -X POST "http://127.0.0.1:8081/internal/v1/assets/$ASSET/embeddings" \
  -d "{\"schemaVersion\":1,\"tenantID\":\"tenant-a\",\"chunkSetID\":\"$SET\",\
\"model\":\"text-embedding-3-small\",\"from\":0,\"to\":$N}"

# 3) 落索引
curl -s "${H[@]}" -X PUT "http://127.0.0.1:8081/internal/v1/assets/$ASSET/index" \
  -d "{\"schemaVersion\":1,\"tenantID\":\"tenant-a\",\"chunkSetID\":\"$SET\",\
\"chunkCount\":$N,\"model\":\"text-embedding-3-small\",\"dimensions\":1536}"
```

带同一个 `Idempotency-Key` 再发一次第二步，会回 200 且 `embedded == 0`（幂等命中，不重复计费、
不重复写库）——这条不是猜的，`tests/test_contract_conformance.py` 把它钉住了。

真实联调的推荐姿势不是手工 curl，而是让 **core 自己发起**：起 `cargo run --bin orchestrator`
（长任务宿主）后触发 `rag.index-asset` 编排，它会按 `ai_worker.embed_batch_size` 分批调
ai-worker，进度写进 custom status（`chunked:<n>` / `embedded:<to>` / `indexed`）。

> 仓库里的 `apps/core/tests/rag_index.rs` 用的是 `StubAiWorker` 桩，**跨语言真实报文漂移它抓不到**；
> 下面两个测试文件补的就是这个空档。

### 契约一致性（`tests/test_contract_conformance.py`）

直接读 core 的契约文件 `apps/core/spec/internal.yaml`（`SPEC_PATH` 从仓库根定位），用
`referencing.Registry` + `jsonschema.Draft202012Validator` 校验 ai-worker 的真实响应报文：

- 状态码必须在该操作的 `responses` 里（多一个没声明的码就红）；
- 报文必须过对应 schema（`$ref` 指向 `#/components/schemas/*`）；
- 错误体的 `code` 必须是 `errors.ErrorCode` 认识的码；
- core 真实发出的请求体必须先过 `ChunkRequest` / `EmbedRequest` / `IndexRequest`；
- 有一组**自检**用例专门证明这套校验器抓得住错形状——否则 schema 一变宽松，整组测试会静默空转。

契约文件不在（比如只 checkout 了 `apps/ai-worker`）时整个文件 **skip**，不假装通过。

### 跨进程链路贯通（`tests/test_trace_handoff.py`）

用一个记账桩记录**每一次**出站请求带的 `traceparent`，断言：trace-id 与采样标记与入站一致、
每次出站的 span-id 都是全新的（既不复用入站的，彼此也不重复）。这条断言就是「core 的链路
真的接到了 ai-worker，再接到 ai-worker 打回 core 的那一跳」的机器判据；缺 `traceparent`
的请求必须 400 **且一个字节都不出网**。

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

**嵌入为什么按区间分批，而不是一次把整个资产发过去？**
一个资产的块可能有上千个，一次性发过去的响应体又大又慢，上游超时会把整批算力都作废。
分批之后每批算完就落库，超时重试时**只补缺**（`rag_embedding` 里已有的 `(chunk_set_id, ordinal, model)`
不再重算），重试成本随进度递减。批大小看 `AI_WORKER_EMBED_BATCH_SIZE`。
分批的边界是**块序号区间**（`from` / `to`），core 的编排也用同样的区间做活动幂等键
（`<instance>:embed:0-16`），所以「同一段区间重放」天然对上。
响应里回 `embedded: 0` 表示「这次没有算新东西、全是复用」——core 只看 `from` / `to` / `dimensions`
是否与请求一致，不看 `embedded`，所以**重放时回 0 是安全的**。

**为什么模型名要写进令牌，而不是只写进请求体？**
令牌的 `scope=embeddings` + `model` 一起构成「这枚令牌只能用来算这个模型」。
不然一枚令牌可以拿去调任何模型，模型维度不同就直接污染向量表。
令牌的缓存键也是 `(scope, tenant, asset, model)`，换模型 = 换令牌 = 重新签一次。

**上游响应为什么要严格校验，而不是「拿不到就跳过」？**
向量维度一旦写错，会静静地在库里留下一批没法检索的数据，事后只能全量重算。
所以 `providers/embeddings.py` 逐条核对 `index` 去重与越界、逐条量向量长度、拒绝 `NaN` / `Inf`，
任何形状不对就当**上游故障**（503，可重试），维度真的不一致就当**请求问题**（400，不重试）。

**为什么向量表的维度用 `CHECK (vector_dims(embedding) = dimensions)` 钉住，而不是建表时写死 `vector(1536)`？**
同一个库要装多个模型的向量，`vector(1536)` 会把表锁死在单一模型上。
用「每行自带 `dimensions` + CHECK 自洽」换来多模型共存，代价是 ANN 索引要按 `(model, dimensions)`
分组建（部分索引），这件事留给 P8 按真实数据分布做。

**为什么 `rag_embedding` 不建外键指向 `rag_chunk`？**
重跑分块层时 `store.save()` 会**整批重插**块（先删后插），带 `ON DELETE CASCADE` 的话
已经算好的向量会被连带删掉 —— 而这些向量的值只跟文本有关，跟块行的物理 id 无关。
所以这里刻意不建外键，用 `(chunk_set_id, ordinal)` 做逻辑关联。

**为什么 `rag_index` 的主键是 `(tenant_id, asset_id)`？**
「索引」描述的是资产**当前**这一版块集，不是历史快照。主键落在资产上，
「重复提交收敛到一行」和「旧版本被新版本替换」就是表结构自带的性质，
不需要应用层先删后插，也永远不会出现两行互相矛盾。
块数为 0 的资产同样要写这一行 —— 那是「这一版没有任何块了」的正式声明，不能靠删行表达。

**`collection` 为什么是 `asset-<assetID>`？**
它是向量库那边的一级命名空间。派生而非随机，是为了让「同一资产的块永远落在同一个 collection」
不依赖任何一张表；等 P8 接外部向量库时，它同时也是可直接使用的物理名。

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
