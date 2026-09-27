-- 0003_rag_embedding：向量与检索索引的当前版本（P6b-4）。
--
-- 三张表的分工：正文在 `rag_chunk`（0002）、向量在 `rag_embedding`、索引的「当前版本」在
-- `rag_index`。core 全程只看到 `chunkSetID` 与统计值 —— 向量一个字节都不经过它，
-- 这让「换嵌入模型 → 重新嵌入」变成 ai-worker 内部的事，不必改契约、不必动编排历史。

CREATE TABLE IF NOT EXISTS rag_embedding (
    chunk_set_id uuid    NOT NULL REFERENCES rag_chunk_set (chunk_set_id) ON DELETE CASCADE,
    -- 与 `rag_chunk.ordinal` 同源：契约里的 `from`/`to` 区间数的就是它。
    -- 外键只挂到块集、**不挂到块**：块集重跑时会整批删块重写（见 store.save），
    -- 挂在块上会让向量在那一刻被级联删掉，而 core 那边嵌入这一步早就记成完成了。
    ordinal      integer NOT NULL CHECK (ordinal >= 0),
    -- 算这些向量的模型。进主键是为了「换模型」时新旧向量能并存，直到新模型全部嵌完；
    -- 被哪个模型服务由 core 的令牌作用域决定，这里只记录事实。
    model        text    NOT NULL,
    dimensions   integer NOT NULL CHECK (dimensions > 0),
    -- 故意**不写** `vector(1536)` 这类维度修饰符：维度由 core 指定的模型决定，一列装不下所有模型。
    -- 代价是这一列建不了 HNSW/IVFFlat（pgvector 要求索引列带维度），ANN 索引等检索面（P8）
    -- 定型后按 (model, dimensions) 分组再建 —— 现在建也是建在错的模型上。
    embedding    vector  NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (chunk_set_id, ordinal, model),
    -- 维度是冗余列（上游响应里带回来的），冗余就必须自我校验，否则「dimensions 说 1536、
    -- 向量实际 1024」这种脏数据会一路带到检索侧才炸。
    CONSTRAINT rag_embedding_dimensions_match CHECK (vector_dims(embedding) = dimensions)
);

-- 检索索引的**当前版本**：一个资产一行。
--
-- 契约 `PUT /internal/v1/assets/{assetID}/index` 的要求是「重复提交同一个 chunkSetID 必须收敛：
-- 索引条数不叠加、旧版本被替换而不是并存」。把「当前版本」做成主键唯一的一行，这个要求
-- 就由表结构本身保证，而不是靠应用层记得先删后插。
CREATE TABLE IF NOT EXISTS rag_index (
    -- 租户进主键：即使将来资产 id 出现跨租户撞车，也不会互相覆盖。
    tenant_id   text    NOT NULL,
    asset_id    uuid    NOT NULL,
    chunk_set_id uuid   NOT NULL REFERENCES rag_chunk_set (chunk_set_id) ON DELETE CASCADE,
    model       text    NOT NULL,
    -- 允许 0：空资产（空文件、图片型 PDF）也要走这一步把旧版本替换掉，
    -- 此时 core 压根没跑嵌入循环，传下来的 dimensions 就是 0。
    dimensions  integer NOT NULL CHECK (dimensions >= 0),
    chunk_count integer NOT NULL CHECK (chunk_count >= 0),
    -- 索引名（本实现的集合粒度 = 单资产：`asset-<assetID>`）。存下来是为了让检索侧
    -- 不必自己拼、也为了让响应里的 `collection` 有据可查。
    collection  text    NOT NULL,
    -- 本次物化的时间（不是块集创建时间）：排查「为什么检索结果还是旧的」时先看它。
    indexed_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, asset_id)
);
