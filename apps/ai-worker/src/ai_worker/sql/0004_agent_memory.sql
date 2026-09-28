-- 0004_agent_memory：服务端 agent 的长期记忆（P9d）。
--
-- 与 `rag_*` 三张表的关键区别：那些是**资产的派生数据**（源在 core，重建一次就有），
-- 而这一张是 agent 自己写下的结论，**没有可重建的源**——丢了就真丢了，
-- 所以它需要独立的备份策略（D8 的已知代价）。
--
-- 记忆是**租户内的共享知识**，不是某个人的私有便签：召回边界与 `rag_index` 完全一致
-- （tenant_id 进 WHERE 由库过滤）。同租户的另一个任务能读到本租户此前的结论，这正是
-- 「长期记忆」的意义（跨任务复用）；跨租户仍是硬边界。
--
-- 两处「幂等由表结构保证」，而不是靠应用记得先查一次：
-- * `memory_id` 是主键，id 由 `uuid5` **确定性**派生（见 memory.py）：收尾摘要按
--   `(tenant, task)`，模型的笔记按 `(tenant, content)` ⇒ 同一件事被重投、被接管续跑、
--   被两个任务先后写下，写的都是同一行，`ON CONFLICT DO NOTHING` 自然收敛，
--   不需要任何额外的唯一约束；
-- * 确定性也意味着「同一条笔记只留一行」：内容一模一样的两条笔记对召回毫无增量
--   （白占上下文），而措辞不同的笔记本来就是两条。

CREATE TABLE IF NOT EXISTS agent_memory (
    memory_id   uuid        NOT NULL,
    tenant_id   text        NOT NULL,
    -- 出处必须能区分：`task_summary` 是 core 在任务收尾时写的结论，`note` 是模型在任务
    -- 中途自己写的备忘。模型看到「这是此前任务的结论」与「这是我自己以前的笔记」，
    -- 对可靠性的判断完全不同，所以这个标签会原样进召回文本。
    kind        text        NOT NULL CHECK (kind IN ('note', 'task_summary')),
    -- 空白正文没有召回价值，直接拒绝（`btrim` 让「只有空格」也算空）。
    content     text        NOT NULL CHECK (length(btrim(content)) > 0),
    -- 写这条记忆的任务。`note` 也可能是 NULL：core 的单步端点载荷里没有 taskID
    -- （不给它加字段是为了不动 P9b 的幂等载荷），所以工具写的笔记只按租户与时间追溯。
    task_id     text,
    -- 嵌入模型与维度：召回必须与写入在同一个向量空间里，冗余列自我校验（同 0003）。
    model       text        NOT NULL,
    dimensions  integer     NOT NULL CHECK (dimensions > 0),
    -- 同样**不写**维度修饰符：记忆与 RAG 共用一套嵌入模型配置，写死维度就换不了模型。
    -- 代价是这一列建不了 HNSW/IVFFlat，召回靠顺序扫描——记忆的条数比块少一个数量级，
    -- 且过滤条件能把候选集定到一个租户的一个模型下（同 P6b-4 的立场：真实分布出来再建）。
    embedding   vector      NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (memory_id),
    CONSTRAINT agent_memory_dimensions_match CHECK (vector_dims(embedding) = dimensions),
    -- 收尾摘要没有 task_id 就既无从幂等也无从追溯，这种组合直接拒绝；
    -- 反过来 `note` 允许 NULL（见上）。
    CONSTRAINT agent_memory_summary_needs_task
        CHECK (kind <> 'task_summary' OR task_id IS NOT NULL)
);

-- 召回的过滤条件：租户 + 向量空间。把 `model` 也放进索引是因为
-- 「同一个租户换过嵌入模型」是常态，那批旧模型下的记忆不该被扫到。
CREATE INDEX IF NOT EXISTS agent_memory_recall
    ON agent_memory (tenant_id, model);

-- 运维/审计方向的一条索引：排查「记忆投毒」时先问「这条任务是哪个任务写进去的」。
CREATE INDEX IF NOT EXISTS agent_memory_task
    ON agent_memory (tenant_id, task_id)
 WHERE task_id IS NOT NULL;
