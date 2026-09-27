"""测试公共设施：配置工厂与请求头工具（保持 `conftest.py` 只管夹具）。"""

from __future__ import annotations

import os
from collections.abc import Callable
from typing import Any

from ai_worker.config import Settings
from ai_worker.core_client import CoreClient

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
