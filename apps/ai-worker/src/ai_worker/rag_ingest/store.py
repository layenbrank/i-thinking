"""块集的读写。正文只落在这里，core 侧只持有 `chunkSetID`。

写入是**按 `chunk_set_id` 幂等**的：`chunk_set_id` 由幂等键确定性地推导（见
[`ai_worker.rag_ingest.router.chunk_set_id_for`]），所以同一个键重跑不会产生第二份块集，
也不会把块写成两份。这解决的是「进程在写库和记账之间被杀掉」这种最难查的情况：
下次接管时重算出的 id 一模一样，`save()` 覆盖掉半截数据，`textSha` 也就对得上。
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from asyncpg import Connection

_INSERT_SET = """
INSERT INTO rag_chunk_set (
    chunk_set_id, tenant_id, asset_id, mime, name,
    text_sha, chunk_count, chunk_size, chunk_overlap, extractor, source_bytes
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (chunk_set_id) DO NOTHING
"""

_INSERT_CHUNK = """
INSERT INTO rag_chunk (chunk_set_id, ordinal, text, char_start, char_end)
VALUES ($1, $2, $3, $4, $5)
"""

_SELECT_SET = """
SELECT chunk_set_id, tenant_id, asset_id, mime, name, text_sha,
       chunk_count, chunk_size, chunk_overlap, extractor, source_bytes
  FROM rag_chunk_set
 WHERE chunk_set_id = $1
"""

_SELECT_CHUNKS = """
SELECT ordinal, text, char_start, char_end
  FROM rag_chunk
 WHERE chunk_set_id = $1 AND ordinal >= $2 AND ($3::integer IS NULL OR ordinal < $3)
 ORDER BY ordinal
"""


@dataclass(frozen=True, slots=True)
class ChunkSet:
    """一个块集的元数据（不含正文）。"""

    chunk_set_id: UUID
    tenant_id: str
    asset_id: UUID
    mime: str
    name: str | None
    text_sha: str
    chunk_count: int
    chunk_size: int
    chunk_overlap: int
    extractor: str
    source_bytes: int


@dataclass(frozen=True, slots=True)
class StoredChunk:
    """一块正文（读回来时用）。"""

    ordinal: int
    text: str
    char_start: int
    char_end: int


async def save(
    connection: Connection,
    *,
    chunk_set: ChunkSet,
    chunks: list[StoredChunk],
) -> None:
    """整体落库：元数据 + 全部块，一个事务，可重复执行。"""
    async with connection.transaction():
        await connection.execute(
            _INSERT_SET,
            chunk_set.chunk_set_id,
            chunk_set.tenant_id,
            chunk_set.asset_id,
            chunk_set.mime,
            chunk_set.name,
            chunk_set.text_sha,
            chunk_set.chunk_count,
            chunk_set.chunk_size,
            chunk_set.chunk_overlap,
            chunk_set.extractor,
            chunk_set.source_bytes,
        )
        # 可能是重跑：先把上一次留下的块清掉，再整批写，避免 ordinal 撞主键或残留旧块。
        await connection.execute(
            "DELETE FROM rag_chunk WHERE chunk_set_id = $1", chunk_set.chunk_set_id
        )
        if chunks:
            await connection.executemany(
                _INSERT_CHUNK,
                [
                    (
                        chunk_set.chunk_set_id,
                        chunk.ordinal,
                        chunk.text,
                        chunk.char_start,
                        chunk.char_end,
                    )
                    for chunk in chunks
                ],
            )


async def load(connection: Connection, *, chunk_set_id: UUID) -> ChunkSet | None:
    row = await connection.fetchrow(_SELECT_SET, chunk_set_id)
    if row is None:
        return None
    return ChunkSet(
        chunk_set_id=row["chunk_set_id"],
        tenant_id=row["tenant_id"],
        asset_id=row["asset_id"],
        mime=row["mime"],
        name=row["name"],
        text_sha=row["text_sha"],
        chunk_count=row["chunk_count"],
        chunk_size=row["chunk_size"],
        chunk_overlap=row["chunk_overlap"],
        extractor=row["extractor"],
        source_bytes=row["source_bytes"],
    )


async def load_chunks(
    connection: Connection,
    *,
    chunk_set_id: UUID,
    start: int = 0,
    end: int | None = None,
) -> list[StoredChunk]:
    """按 `[start, end)` 读块（P6b-4 的嵌入分批就靠这个区间，序号必须稳定）。"""
    rows = await connection.fetch(_SELECT_CHUNKS, chunk_set_id, start, end)
    return [
        StoredChunk(
            ordinal=row["ordinal"],
            text=row["text"],
            char_start=row["char_start"],
            char_end=row["char_end"],
        )
        for row in rows
    ]
