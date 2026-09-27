-- 0002_rag_chunk：RAG 分块的持久化。
--
-- 契约 `POST /internal/v1/assets/{assetID}/chunks` 只把「切了多少块 + 块集 id + 文本 sha」
-- 回给 core，**块正文留在 ai-worker**。否则编排历史会被正文撑爆，重放成本也失控。
-- 所以「块集」是 ai-worker 的一等实体：core 拿到的 chunkSetID 就是这里的 `chunk_set_id`，
-- 后续 embed / index 两步都只带这个 id，不再传文本。
--
-- 同一个资产可以被切多次（换了 chunkSize、换了抽取器、重跑一次新编排实例），
-- 每次都是一个新块集，互不覆盖 —— 索引侧的收敛由 chunkSetID 保证（P6b-4）。

CREATE TABLE IF NOT EXISTS rag_chunk_set (
    chunk_set_id   uuid        PRIMARY KEY,
    -- 租户只用于分区、排查与将来的清理任务，**不参与授权判定**：
    -- 授权完全来自 core 签发的服务身份令牌（作用域锁死租户与这一个资产）。
    tenant_id      text        NOT NULL,
    asset_id       uuid        NOT NULL,
    mime           text        NOT NULL,
    name           text,
    -- 抽取后纯文本的 sha256（十六进制）。与契约 `ChunkResponse.textSha` 同一口径：
    -- 用来回答「同一个资产两次切分是不是同一份文本」。
    text_sha       text        NOT NULL,
    chunk_count    integer     NOT NULL CHECK (chunk_count >= 0),
    -- 实际生效的分块参数（请求没给就用服务端默认值），排查「块为什么切这么碎」时要看它。
    chunk_size     integer     NOT NULL CHECK (chunk_size > 0),
    chunk_overlap  integer     NOT NULL CHECK (chunk_overlap >= 0),
    -- 实际选中的抽取器名（例如 `text` / `html` / `pdf`），排障时不用再猜走的是哪条分支。
    extractor      text        NOT NULL,
    -- 取到的正文字节数：`chunk_count = 0` 时这是第一个要看的数。
    source_bytes   integer     NOT NULL CHECK (source_bytes >= 0),
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- 「这个租户的这个资产都切过哪些版本」——运维与将来的重建索引用。
CREATE INDEX IF NOT EXISTS rag_chunk_set_tenant_asset_idx
    ON rag_chunk_set (tenant_id, asset_id, created_at DESC);

CREATE TABLE IF NOT EXISTS rag_chunk (
    chunk_set_id uuid    NOT NULL REFERENCES rag_chunk_set (chunk_set_id) ON DELETE CASCADE,
    -- 块在块集内的序号，从 0 开始。契约里的 `from`/`to` 区间就是它在数：
    -- 嵌入那一步按 `[from, to)` 分批重跑，序号必须稳定。
    ordinal      integer NOT NULL CHECK (ordinal >= 0),
    text         text    NOT NULL,
    -- 块在**抽取后纯文本**里的字符区间（含头不含尾）。正文会重叠，所以区间也重叠；
    -- 保留它是为了将来能把检索命中的块映射回原文位置（引用出处要用）。
    char_start   integer NOT NULL CHECK (char_start >= 0),
    char_end     integer NOT NULL CHECK (char_end >= char_start),
    PRIMARY KEY (chunk_set_id, ordinal)
);
