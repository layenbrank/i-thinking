"""回打 core 的客户端：换令牌、读资产正文、以及错误映射。

错误映射是这里最要紧的部分——它的口径是「core 能不能重试」：请求本身不对就回 400 让 core
别再试，暂时性的问题回 503/429 让 core 重试。映射错了会表现为「core 无限重试一个永远失败的请求」
或者「一次网络抖动就让整个活动判失败」，两种都很难从日志里看出来。
"""

from __future__ import annotations

import json
import time
from typing import Any

import httpx
import pytest

from ai_worker import errors, trace
from ai_worker.core_client import (
    EMBEDDINGS_PATH,
    INTERNAL_TOKEN_HEADER,
    SCOPE_ASSET_READ,
    SCOPE_EMBEDDINGS,
    SERVICE_TOKEN_HEADER,
    SERVICE_TOKEN_PATH,
    CoreClient,
)
from support import INTERNAL_TOKEN, TRACEPARENT, MakeCore

TENANT = "tenant-a"
ASSET = "asset-1"
MODEL = "text-embedding-3-small"
CONTENT_PATH = f"/api/v1/service/assets/{ASSET}/content"


def token_body(
    *,
    scope: str = SCOPE_ASSET_READ,
    asset_id: str = ASSET,
    model: str | None = None,
    expires_in: int = 300,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "token": f"tok-{scope}",
        "expiresAt": int(time.time()) + expires_in,
        "tenantID": TENANT,
        "scope": scope,
        "assetID": asset_id,
        "tokenType": "service",
    }
    if model is not None:
        body["model"] = model
    return body


def core_error(status: int, *, retry_after: str | None = None) -> httpx.Response:
    """core 服务面的错误信封（`{code, success, msg, timestamp}`），不是我们的那个。"""
    headers = {"Retry-After": retry_after} if retry_after is not None else None
    return httpx.Response(
        status,
        headers=headers,
        json={"code": "500204", "success": False, "msg": "boom", "timestamp": "x"},
    )


async def test_token_request_matches_the_gateway_contract(make_core: MakeCore) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=token_body())

    client: CoreClient = make_core(handler)

    token = await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)

    assert token.token == f"tok-{SCOPE_ASSET_READ}"
    assert token.tenant_id == TENANT
    assert token.asset_id == ASSET
    assert token.token_type == "service"

    request = requests[0]
    assert (request.method, request.url.path) == ("POST", SERVICE_TOKEN_PATH)
    assert request.headers[INTERNAL_TOKEN_HEADER] == INTERNAL_TOKEN
    assert json.loads(request.content) == {
        "tenantID": TENANT,
        "scope": SCOPE_ASSET_READ,
        "assetID": ASSET,
    }


async def test_ttl_is_sent_only_when_configured(make_core: MakeCore) -> None:
    bodies: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        bodies.append(json.loads(request.content))
        return httpx.Response(200, json=token_body())

    default_ttl: CoreClient = make_core(handler)
    await default_ttl.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)

    explicit_ttl: CoreClient = make_core(handler, core_service_token_ttl_seconds=60)
    await explicit_ttl.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id="asset-2")

    assert "ttlSecs" not in bodies[0]
    assert bodies[1]["ttlSecs"] == 60


async def test_token_is_cached_per_scope_and_asset(make_core: MakeCore) -> None:
    count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal count
        count += 1
        return httpx.Response(200, json=token_body(asset_id=json.loads(request.content)["assetID"]))

    client: CoreClient = make_core(handler)

    await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)
    await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)
    assert count == 1  # 只换一次

    await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id="asset-2")
    assert count == 2  # 作用域不同就是另一枚令牌


async def test_token_is_renewed_before_it_expires(make_core: MakeCore) -> None:
    count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal count
        count += 1
        # 剩余 5 秒 < 默认的 30 秒 skew：宁可提前换，也不要在中途突然过期。
        return httpx.Response(200, json=token_body(expires_in=5))

    client: CoreClient = make_core(handler)

    await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)
    await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)

    assert count == 2


async def test_asset_content_uses_the_scoped_token(make_core: MakeCore) -> None:
    seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body())
        seen.append(request)
        return httpx.Response(200, content=b"hello bytes")

    client: CoreClient = make_core(handler)

    data = await client.asset_content(tenant_id=TENANT, asset_id=ASSET, max_bytes=1024)

    assert data == b"hello bytes"
    assert (seen[0].method, seen[0].url.path) == ("GET", CONTENT_PATH)
    assert seen[0].headers[SERVICE_TOKEN_HEADER] == f"tok-{SCOPE_ASSET_READ}"


async def test_asset_content_above_the_limit_is_a_request_error(make_core: MakeCore) -> None:
    """超限重试也只会再超一次，所以判成 400（不可重试）而不是 503。"""

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body())
        return httpx.Response(200, content=b"way too long")

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.asset_content(tenant_id=TENANT, asset_id=ASSET, max_bytes=4)

    assert raised.value.code is errors.ErrorCode.INVALID_REQUEST
    assert raised.value.status == 400


@pytest.mark.parametrize(
    ("core_status", "expected_status", "expected_code"),
    [
        (400, 400, errors.ErrorCode.INVALID_REQUEST),
        (404, 400, errors.ErrorCode.INVALID_REQUEST),
        (401, 503, errors.ErrorCode.DEPENDENCY_UNAVAILABLE),
        (403, 503, errors.ErrorCode.DEPENDENCY_UNAVAILABLE),
        (429, 429, errors.ErrorCode.RATE_LIMITED),
        (500, 503, errors.ErrorCode.DEPENDENCY_UNAVAILABLE),
        (503, 503, errors.ErrorCode.DEPENDENCY_UNAVAILABLE),
    ],
)
async def test_content_errors_are_mapped_by_retryability(
    make_core: MakeCore, core_status: int, expected_status: int, expected_code: errors.ErrorCode
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body())
        return core_error(core_status, retry_after="7" if core_status == 429 else None)

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.asset_content(tenant_id=TENANT, asset_id=ASSET, max_bytes=1024)

    assert raised.value.status == expected_status
    assert raised.value.code is expected_code
    if core_status == 429:
        assert raised.value.headers["Retry-After"] == "7"


async def test_rate_limit_without_a_usable_retry_after_is_tolerated(make_core: MakeCore) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body())
        return httpx.Response(429, text="slow down", headers={"Retry-After": "soon"})

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.asset_content(tenant_id=TENANT, asset_id=ASSET, max_bytes=1024)

    assert raised.value.status == 429
    assert "Retry-After" not in raised.value.headers


async def test_non_json_error_body_does_not_crash(make_core: MakeCore) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body())
        return httpx.Response(502, text="<html>bad gateway</html>")

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.asset_content(tenant_id=TENANT, asset_id=ASSET, max_bytes=1024)

    assert raised.value.code is errors.ErrorCode.DEPENDENCY_UNAVAILABLE


async def test_token_exchange_failure_is_reported_as_dependency(make_core: MakeCore) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return core_error(401)

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)

    assert raised.value.code is errors.ErrorCode.DEPENDENCY_UNAVAILABLE


async def test_network_failure_is_reported_as_dependency(make_core: MakeCore) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)

    assert raised.value.status == 503


async def test_outbound_requests_continue_the_current_trace(make_core: MakeCore) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=token_body())

    client: CoreClient = make_core(handler)
    parent = trace.TraceContext.parse(TRACEPARENT)
    assert parent is not None
    token = trace.set_current(parent)
    try:
        await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)
    finally:
        trace.reset_current(token)

    sent = requests[0].headers["traceparent"]
    version, trace_id, span_id, flags = sent.split("-")
    assert (version, flags) == ("00", "01")
    assert trace_id == parent.trace_id  # 同一条链路
    assert span_id != parent.span_id  # 新的 span


async def test_outbound_requests_omit_traceparent_without_a_current_context(
    make_core: MakeCore,
) -> None:
    """没有上游链路时不硬造一个：core 那边会自己补，凭空编一个只会污染日志。"""
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json=token_body())

    client: CoreClient = make_core(handler, core_timeout_seconds=1.0)
    await client.service_token(tenant_id=TENANT, scope=SCOPE_ASSET_READ, asset_id=ASSET)

    assert "traceparent" not in requests[0].headers


async def test_embeddings_request_matches_the_gateway_contract(make_core: MakeCore) -> None:
    """嵌入走 `scope=embeddings` + `model` 的令牌：`model` 同时是 core 侧的模型自检。"""
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body(scope=SCOPE_EMBEDDINGS, model=MODEL))
        return httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.1, 0.2]}]})

    client: CoreClient = make_core(handler)

    payload = await client.embeddings(tenant_id=TENANT, model=MODEL, inputs=["a", "b"])

    assert payload == {"data": [{"index": 0, "embedding": [0.1, 0.2]}]}  # 裸 JSON，不套信封
    token_request, embed_request = requests
    assert json.loads(token_request.content) == {
        "tenantID": TENANT,
        "scope": SCOPE_EMBEDDINGS,
        "model": MODEL,
    }
    assert (embed_request.method, embed_request.url.path) == ("POST", EMBEDDINGS_PATH)
    assert embed_request.headers[SERVICE_TOKEN_HEADER] == f"tok-{SCOPE_EMBEDDINGS}"
    # 不传 dimensions：不少模型不认这个参数，传了直接 400；维度按响应里向量的长度读。
    assert json.loads(embed_request.content) == {"model": MODEL, "input": ["a", "b"]}


@pytest.mark.parametrize(
    ("core_status", "expected_status", "expected_code"),
    [
        (400, 400, errors.ErrorCode.INVALID_REQUEST),
        (401, 503, errors.ErrorCode.DEPENDENCY_UNAVAILABLE),
        (429, 429, errors.ErrorCode.RATE_LIMITED),
        (503, 503, errors.ErrorCode.DEPENDENCY_UNAVAILABLE),
    ],
)
async def test_embedding_errors_are_mapped_by_retryability(
    make_core: MakeCore, core_status: int, expected_status: int, expected_code: errors.ErrorCode
) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            return httpx.Response(200, json=token_body(scope=SCOPE_EMBEDDINGS, model=MODEL))
        return core_error(core_status, retry_after="7" if core_status == 429 else None)

    client: CoreClient = make_core(handler)

    with pytest.raises(errors.ApiError) as raised:
        await client.embeddings(tenant_id=TENANT, model=MODEL, inputs=["a"])

    assert raised.value.status == expected_status
    assert raised.value.code is expected_code


async def test_embedding_tokens_are_not_shared_across_models(make_core: MakeCore) -> None:
    """换模型就是换一枚令牌：拿 A 模型的令牌去算 B 模型，core 侧会当成越权。"""
    minted: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == SERVICE_TOKEN_PATH:
            body: dict[str, Any] = json.loads(request.content)
            minted.append(body)
            return httpx.Response(
                200, json=token_body(scope=SCOPE_EMBEDDINGS, model=str(body["model"]))
            )
        return httpx.Response(200, json={"data": [{"index": 0, "embedding": [0.5]}]})

    client: CoreClient = make_core(handler)

    await client.embeddings(tenant_id=TENANT, model=MODEL, inputs=["a"])
    await client.embeddings(tenant_id=TENANT, model=MODEL, inputs=["a"])
    await client.embeddings(tenant_id=TENANT, model="another-model", inputs=["a"])

    assert [body["model"] for body in minted] == [MODEL, "another-model"]
