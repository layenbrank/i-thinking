"""测试公共设施：配置工厂与请求头工具（保持 `conftest.py` 只管夹具）。"""

from __future__ import annotations

import hashlib
import json
import os
import time
from collections.abc import Callable, Sequence
from typing import Any
from uuid import UUID

import httpx
from httpx import AsyncClient

from ai_worker.config import Settings
from ai_worker.core_client import (
    EMBEDDINGS_PATH,
    SCOPE_ASSET_READ,
    SERVICE_TOKEN_PATH,
    CoreClient,
)
from ai_worker.db import Database
from ai_worker.rag_ingest import store

#: `conftest.make_core` 的类型：传进来的第一个参数是 `httpx.MockTransport` 的 handler。
MakeCore = Callable[..., CoreClient]

INTERNAL_TOKEN = "test-internal-token-0123456789abcdef"
#: 本地 pgvector 容器（见 README 的 `docker run` 一行）；CI 用同一个端口。
DEFAULT_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:55433/ai_worker_test"
#: `.invalid` 是 RFC 2606 保留的不可解析 TLD：防止测试意外打到真实的 core。
UNREACHABLE_CORE_URL = "http://core.invalid:8080"
#: 必然连不上的库（端口 1 上不会有人监听），用来验证降级路径。
UNREACHABLE_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:1/ai_worker_test"

#: 合法的最小 traceparent（全 0 非法，所以这里用非零十六进制）。
TRACEPARENT = "00-11111111111111111111111111111111-2222222222222222-01"

#: ai-worker 自己的表，**顺序即清空顺序**（子表在前，避免外键报错）。
#: `tests/test_db_boundary.py` 用它反证「这库里没有 core 的业务表」。
OWNED_TABLES = ("rag_embedding", "rag_index", "rag_chunk", "rag_chunk_set", "idempotency_key")


def database_url() -> str:
    return os.environ.get("AI_WORKER_TEST_DATABASE_URL", DEFAULT_DATABASE_URL)


def make_settings(**overrides: Any) -> Settings:
    """构造测试配置：显式值优先于环境变量，避免被开发机上的 `AI_WORKER_*` 污染。"""
    values: dict[str, Any] = {
        "environment": "test",
        "log_level": "WARNING",
        "internal_token": INTERNAL_TOKEN,
        "database_url": database_url(),
        "core_base_url": UNREACHABLE_CORE_URL,
        "db_connect_timeout_seconds": 2.0,
        "db_reconnect_interval_seconds": 0.0,
    }
    values.update(overrides)
    return Settings(**values)


def internal_headers(
    *,
    token: str = INTERNAL_TOKEN,
    traceparent: str | None = TRACEPARENT,
    idempotency_key: str | None = None,
) -> dict[str, str]:
    headers = {"X-Internal-Token": token}
    if traceparent is not None:
        headers["traceparent"] = traceparent
    if idempotency_key is not None:
        headers["Idempotency-Key"] = idempotency_key
    return headers


def traceparent_only(traceparent: str = TRACEPARENT) -> dict[str, str]:
    """只要 traceparent：用来证明「缺的确实是令牌」而不是别的头。"""
    return {"traceparent": traceparent}


def echo_payload(tag: str = "a") -> dict[str, str]:
    return {"tag": tag}


#: core 的「剧本」：`httpx.MockTransport` 的 handler，决定 core 怎么回应每次调用。
CoreHandler = Callable[[httpx.Request], httpx.Response]

#: `conftest.core_backed_client` 的类型：传一个 core 剧本，拿回一个可用的异步客户端。
HandlerClient = Callable[..., AsyncClient]


def service_token_body(
    *,
    scope: str = SCOPE_ASSET_READ,
    tenant_id: str = "tenant-a",
    asset_id: str | None = None,
    model: str | None = None,
    expires_in: int = 300,
) -> dict[str, Any]:
    """core `POST /api/v1/service/token` 的成功响应体（`CoreClient` 就按这些键解）。"""
    body: dict[str, Any] = {
        "token": f"tok-{scope}",
        "expiresAt": int(time.time()) + expires_in,
        "tenantID": tenant_id,
        "scope": scope,
        "tokenType": "service",
    }
    if asset_id is not None:
        body["assetID"] = asset_id
    if model is not None:
        body["model"] = model
    return body


def core_error(status: int, *, retry_after: str | None = None) -> httpx.Response:
    """core **服务面**的错误信封（`{code, success, msg, timestamp}`），别和我们的混淆。"""
    return httpx.Response(
        status,
        headers={"Retry-After": retry_after} if retry_after is not None else None,
        json={"code": "500204", "success": False, "msg": "boom", "timestamp": "x"},
    )


def stub_core(content: bytes, *, content_status: int = 200) -> CoreHandler:
    """最小 core 桩：换令牌 → 给正文。`content_status` 非 200 时改回错误信封。"""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=service_token_body())
        if content_status != 200:
            return core_error(content_status, retry_after="7" if content_status == 429 else None)
        return httpx.Response(200, content=content)

    return handler


def embedding_vector(text: str, dimensions: int) -> list[float]:
    """把文本压成一个**确定性**向量：同样的输入必得同样的输出，测试才能按文本断言。"""
    digest = hashlib.sha256(text.encode()).digest()
    return [(digest[position % len(digest)] - 128) / 128.0 for position in range(dimensions)]


class RagStub:
    """RAG 三端点共用的 core 桩：换令牌、给正文、算嵌入。

    两个刻意的行为，用来盯住真实上游会犯的错：

    * **返回顺序倒置**：上游不保证 `data[]` 按输入顺序返回，桩一律倒序，逼实现按 `index` 还原；
    * **`dimensions` 可以是函数**：按调用序号给不同维度，用来测「同一模型两种维度」。

    要造畸形响应就用 `embedding_response`（收本批输入与调用序号，返回任意 JSON）。
    """

    def __init__(
        self,
        content: bytes = b"",
        *,
        content_status: int = 200,
        dimensions: int | Callable[[int], int] = 8,
        embedding_response: Callable[[list[str], int], Any] | None = None,
    ) -> None:
        self.content = content
        self.content_status = content_status
        self.dimensions = dimensions
        self.embedding_response = embedding_response
        self.paths: list[str] = []
        self.token_bodies: list[dict[str, Any]] = []
        self.embed_inputs: list[list[str]] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        self.paths.append(path)
        if path == SERVICE_TOKEN_PATH:
            return self._token(request)
        if path == EMBEDDINGS_PATH:
            return self._embeddings(request)
        if self.content_status != 200:
            return core_error(
                self.content_status, retry_after="7" if self.content_status == 429 else None
            )
        return httpx.Response(200, content=self.content)

    def _token(self, request: httpx.Request) -> httpx.Response:
        body: dict[str, Any] = json.loads(request.content)
        self.token_bodies.append(body)
        return httpx.Response(
            200,
            json=service_token_body(
                scope=body["scope"],
                tenant_id=body["tenantID"],
                asset_id=body.get("assetID"),
                model=body.get("model"),
            ),
        )

    def _embeddings(self, request: httpx.Request) -> httpx.Response:
        inputs: list[str] = json.loads(request.content)["input"]
        call = len(self.embed_inputs)
        self.embed_inputs.append(inputs)
        if self.embedding_response is not None:
            return httpx.Response(200, json=self.embedding_response(inputs, call))

        dimensions = self.dimensions(call) if callable(self.dimensions) else self.dimensions
        data = [
            {"object": "embedding", "index": index, "embedding": embedding_vector(text, dimensions)}
            for index, text in enumerate(inputs)
        ]
        data.reverse()  # 见类文档：上游不保证顺序
        return httpx.Response(200, json={"object": "list", "data": data, "model": "stub"})

    @property
    def embed_calls(self) -> int:
        return len(self.embed_inputs)

    @property
    def embedded_texts(self) -> list[str]:
        """所有被送去嵌入的文本，按调用顺序摊平。"""
        return [text for batch in self.embed_inputs for text in batch]


#: 向量与索引用例的默认归属：任意 UUID 即可，只要各文件保持一致。
TENANT_ID = "tenant-a"
ASSET_ID = "8f14e45f-ceea-467a-9a3e-1b7c2d5e9f01"


async def seed_chunk_set(
    database: Database,
    *,
    chunk_set_id: str,
    texts: Sequence[str],
    tenant_id: str = TENANT_ID,
    asset_id: str = ASSET_ID,
    name: str | None = "notes.txt",
) -> store.ChunkSet:
    """直接往库里写一份块集（不走 HTTP）。

    嵌入与索引的用例只关心自己那一层，没必要每次都先跑一遍分块端点——那样一个用例
    会因为另一层的问题而红，排查时反而要多想一层。
    """
    joined = "\n\n".join(texts)
    chunk_set = store.ChunkSet(
        chunk_set_id=UUID(chunk_set_id),
        tenant_id=tenant_id,
        asset_id=UUID(asset_id),
        mime="text/plain",
        name=name,
        text_sha=hashlib.sha256(joined.encode()).hexdigest(),
        chunk_count=len(texts),
        chunk_size=64,
        chunk_overlap=0,
        extractor="text",
        source_bytes=len(joined.encode()),
    )
    chunks = [
        store.StoredChunk(ordinal=ordinal, text=text, char_start=0, char_end=len(text))
        for ordinal, text in enumerate(texts)
    ]
    async with database.acquire() as connection:
        await store.save(connection, chunk_set=chunk_set, chunks=chunks)
    return chunk_set


async def save_embeddings(
    database: Database,
    *,
    chunk_set_id: str,
    items: Sequence[tuple[int, Sequence[float]]],
    model: str,
) -> None:
    """直接写一批向量，维度按每条自己的长度（用来造「维度不一致」这类库内状态）。"""
    async with database.acquire() as connection:
        for ordinal, vector in items:
            await store.save_embeddings(
                connection,
                chunk_set_id=UUID(chunk_set_id),
                model=model,
                dimensions=len(vector),
                items=[(ordinal, vector)],
            )


async def stored_vectors(
    database: Database, *, chunk_set_id: str, model: str
) -> list[tuple[int, list[float]]]:
    """读回向量本身（`store` 层刻意不提供，只有测试需要核对具体数值）。

    pgvector 的 decoder 给的是 `Vector` 对象，且内部是 float32，断言时用 `approx`。
    """
    async with database.acquire() as connection:
        rows = await connection.fetch(
            "SELECT ordinal, embedding FROM rag_embedding"
            " WHERE chunk_set_id = $1 AND model = $2 ORDER BY ordinal",
            UUID(chunk_set_id),
            model,
        )
    return [
        (row["ordinal"], [float(value) for value in row["embedding"].to_list()]) for row in rows
    ]


async def stored_index_row(
    database: Database, *, tenant_id: str = TENANT_ID, asset_id: str = ASSET_ID
) -> dict[str, Any] | None:
    async with database.acquire() as connection:
        row = await connection.fetchrow(
            "SELECT * FROM rag_index WHERE tenant_id = $1 AND asset_id = $2",
            tenant_id,
            UUID(asset_id),
        )
    return None if row is None else dict(row)


async def stored_index_count(database: Database) -> int:
    """索引表里的行数：一个资产只该有一行（旧版本被替换，不是并存）。"""
    async with database.acquire() as connection:
        return int(await connection.fetchval("SELECT count(*) FROM rag_index"))
