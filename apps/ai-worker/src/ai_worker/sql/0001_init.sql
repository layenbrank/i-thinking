-- 0001_init：ai-worker 自己的库表。
-- 这套库里**只允许**出现 ai-worker 自己的表：core 的业务表（asset/tenant/...）由 core 自己管，
-- 服务间只走契约里的三个端点 + 服务令牌 + 服务身份资产内容端点，绝不共享库。

CREATE EXTENSION IF NOT EXISTS vector;

-- 幂等账本。
-- core 会因为超时/网络抖动重发同一个 Idempotency-Key，同一笔活不能干两遍：
--   * 同键同载荷 + completed  -> 直接回放上次的响应（不重复向量化/写索引）
--   * 同键不同载荷            -> 409 idempotency_conflict（复用键是调用方的 bug）
--   * 同键 in_progress        -> 409 并要求稍后重试；超过 stale 时限后允许接管，避免死键永久卡住
-- 主键用 (key, endpoint)：不同端点复用同一个键是合法用法。
CREATE TABLE IF NOT EXISTS idempotency_key (
    idempotency_key text        NOT NULL,
    endpoint        text        NOT NULL,
    payload_sha     text        NOT NULL,
    status          text        NOT NULL CHECK (status IN ('in_progress', 'completed')),
    response_status integer,
    response_body   jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (idempotency_key, endpoint)
);

-- 覆盖扫「进行中且已超时」的键，用于运维排查与将来的清理任务。
CREATE INDEX IF NOT EXISTS idempotency_key_status_updated_idx
    ON idempotency_key (status, updated_at);
