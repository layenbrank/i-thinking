"""测试公共设施：配置工厂与请求头工具（保持 `conftest.py` 只管夹具）。"""

from __future__ import annotations

import os
import time
from collections.abc import Callable
from typing import Any

import httpx
from httpx import AsyncClient

from ai_worker.config import Settings
from ai_worker.core_client import SCOPE_ASSET_READ, SERVICE_TOKEN_PATH, CoreClient

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
OWNED_TABLES = ("rag_chunk", "rag_chunk_set", "idempotency_key")


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
