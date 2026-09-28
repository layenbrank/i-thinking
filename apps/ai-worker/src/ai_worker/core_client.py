"""回打 core 的客户端：换服务令牌 + 读资产正文。

ai-worker 是叶子进程：不直连模型厂商、不碰 core 的对象存储布局、不持长期云凭据。
要算力或要字节，只能回打 core 的服务身份面（语义见
`apps/core/src/services/gateway/README.md#服务身份apiv1service`）。两道门：

1. `POST /api/v1/service/token`，头 `X-Internal-Token`（值 = core 的 `ai_worker.token`）
   → 换一枚**带作用域**的短期令牌（`scope=asset-read` + `assetID`，
   或 `scope=embeddings` + `model`）；
2. 拿这枚令牌去消费：内容端点用 `X-Service-Token`，嵌入端点是
   `POST /api/v1/service/embeddings`（响应是上游的**裸 JSON**，不套统一信封）。

令牌**必须缓存**：core 的配额与审计都记在出网调用上，但换令牌本身不便宜
（要查租户、查资产可读性），按 `(scope, tenantID, assetID, model)` 缓存并在过期前
`refresh_skew_seconds` 续签。

错误映射的口径是「core 能不能重试」：4xx（请求本身不对）原样变成 400，让 core 别浪费重试；
401/403 说明**我们自己**配错或写错（密钥不对 / 受众用错），记 `error` 日志并按 503 上报；
429 原样透出限流；其余网络与 5xx 都是暂时的 503。
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, NoReturn

import httpx

from ai_worker import errors, telemetry, trace
from ai_worker.config import Settings

logger = logging.getLogger(__name__)

INTERNAL_TOKEN_HEADER = "X-Internal-Token"  # noqa: S105 - HTTP 头名，不是密钥
SERVICE_TOKEN_HEADER = "X-Service-Token"  # noqa: S105 - HTTP 头名，不是密钥

SERVICE_TOKEN_PATH = "/api/v1/service/token"  # noqa: S105 - 路径常量，不是密钥
ASSET_CONTENT_PATH = "/api/v1/service/assets/{asset_id}/content"
EMBEDDINGS_PATH = "/api/v1/service/embeddings"

SCOPE_ASSET_READ = "asset-read"
SCOPE_EMBEDDINGS = "embeddings"

_READ_CHUNK_BYTES = 64 * 1024


@dataclass(frozen=True, slots=True)
class ServiceToken:
    """core 签发的短期令牌（裸结构，`expiresAt` 是 Unix 秒）。"""

    token: str
    expires_at: int
    tenant_id: str
    scope: str
    token_type: str
    model: str | None = None
    asset_id: str | None = None

    def expires_at_datetime(self) -> datetime:
        return datetime.fromtimestamp(self.expires_at, tz=UTC)


class CoreClient:
    """core 服务身份面的薄封装。一个进程一份，随 app 生命周期关闭。"""

    def __init__(
        self,
        settings: Settings,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.core_base_url,
            timeout=httpx.Timeout(settings.core_timeout_seconds),
            transport=transport,
        )
        self._tokens: dict[tuple[str, str, str, str], ServiceToken] = {}
        self._lock = asyncio.Lock()

    async def close(self) -> None:
        await self._client.aclose()

    async def asset_content(self, *, tenant_id: str, asset_id: str, max_bytes: int) -> bytes:
        """取资产原始字节。超限直接判为请求问题（不重试），因为重试也只会再超一次。"""
        token = await self.service_token(
            tenant_id=tenant_id, scope=SCOPE_ASSET_READ, asset_id=asset_id
        )
        path = ASSET_CONTENT_PATH.format(asset_id=asset_id)
        headers = self._headers(service_token=token)

        async with (
            telemetry.outbound_span("GET", path, headers),
            self._client.stream("GET", path, headers=headers) as response,
        ):
            if response.status_code >= 400:
                await self._raise_for_status(response, action=f"读取资产 {asset_id} 内容")
            chunks: list[bytes] = []
            size = 0
            async for chunk in response.aiter_bytes(_READ_CHUNK_BYTES):
                size += len(chunk)
                if size > max_bytes:
                    message = f"资产正文超过 {max_bytes} 字节上限，请先在 core 侧裁剪或降低上限配置"
                    raise errors.invalid_request(message)
                chunks.append(chunk)

        return b"".join(chunks)

    async def embeddings(self, *, tenant_id: str, model: str, inputs: Sequence[str]) -> Any:
        """算一批文本的嵌入，返回上游的**裸 JSON**（OpenAI 形状，`data[].embedding`）。

        两个刻意的取舍：

        - `model` 只是**自检**：core 一律用令牌作用域里的模型覆盖请求体里的 `model`，
          传错了会在 core 侧 400，而不是悄悄换成另一个模型；
        - 不传 `dimensions`：不少模型不认这个参数（传了就 400），维度差距按响应里向量的
          实际长度读，比「向 core 要一个数字」更可信。

        形状校验交给 `ai_worker.providers.embeddings`，这里只负责传输与错误映射。
        """
        token = await self.service_token(tenant_id=tenant_id, scope=SCOPE_EMBEDDINGS, model=model)
        response = await self._request(
            "POST",
            EMBEDDINGS_PATH,
            json={"model": model, "input": list(inputs)},
            headers=self._headers(service_token=token),
            action=f"计算 {len(inputs)} 条文本的嵌入",
        )
        return response.json()

    async def service_token(
        self,
        *,
        tenant_id: str,
        scope: str,
        asset_id: str | None = None,
        model: str | None = None,
    ) -> ServiceToken:
        """取（必要时换）一枚短期令牌。"""
        cache_key = (scope, tenant_id, asset_id or "", model or "")
        cached = self._tokens.get(cache_key)
        if cached is not None and not self._is_stale(cached):
            return cached

        async with self._lock:
            cached = self._tokens.get(cache_key)
            if cached is not None and not self._is_stale(cached):
                return cached
            token = await self._mint_token(
                tenant_id=tenant_id, scope=scope, asset_id=asset_id, model=model
            )
            self._tokens[cache_key] = token
            return token

    async def _mint_token(
        self,
        *,
        tenant_id: str,
        scope: str,
        asset_id: str | None,
        model: str | None,
    ) -> ServiceToken:
        payload: dict[str, object] = {"tenantID": tenant_id, "scope": scope}
        if asset_id is not None:
            payload["assetID"] = asset_id
        if model is not None:
            payload["model"] = model
        if self._settings.core_service_token_ttl_seconds is not None:
            payload["ttlSecs"] = self._settings.core_service_token_ttl_seconds

        response = await self._request(
            "POST",
            SERVICE_TOKEN_PATH,
            json=payload,
            headers=self._headers(internal_token=True),
            action="换取服务身份令牌",
        )
        data = response.json()
        return ServiceToken(
            token=data["token"],
            expires_at=int(data["expiresAt"]),
            tenant_id=data["tenantID"],
            scope=data["scope"],
            token_type=data["tokenType"],
            model=data.get("model"),
            asset_id=data.get("assetID"),
        )

    def _is_stale(self, token: ServiceToken) -> bool:
        remaining = (token.expires_at_datetime() - datetime.now(UTC)).total_seconds()
        return remaining <= self._settings.core_token_refresh_skew_seconds

    def _headers(
        self, *, internal_token: bool = False, service_token: ServiceToken | None = None
    ) -> dict[str, str]:
        headers = {"accept": "application/json"}
        if internal_token:
            headers[INTERNAL_TOKEN_HEADER] = self._settings.internal_token
        if service_token is not None:
            headers[SERVICE_TOKEN_HEADER] = service_token.token
        # 把本进程的 trace-id 续下去：core 的日志与这里的日志能按同一条链路对上。
        context = trace.current()
        if context is not None:
            headers[trace.TRACEPARENT_HEADER] = trace.child_of(context).raw
        return headers

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: object,
        headers: dict[str, str],
        action: str,
    ) -> httpx.Response:
        try:
            async with telemetry.outbound_span(method, path, headers):
                response = await self._client.request(method, path, json=json, headers=headers)
        except httpx.HTTPError as exc:
            logger.warning("%s失败（网络层）：%s", action, exc)
            raise errors.dependency_unavailable(f"{action}失败：core 不可达") from exc

        if response.status_code >= 400:
            await self._raise_for_status(response, action=action)
        return response

    async def _raise_for_status(self, response: httpx.Response, *, action: str) -> NoReturn:
        status = response.status_code
        # 流式响应此时正文还没读进内存；错误体很小，读出来才能看到 core 说的原因。
        await response.aread()
        detail = _error_detail(response)
        message = f"{action}失败：core 返回 {status}（{detail}）"

        if status in (401, 403):
            # 只可能是我们自己配错/用错（内部令牌不符、受众用错），重试没有意义，必须有人看日志。
            logger.error("%s（疑似配置或作用域错误，非暂时性）：%s", action, message)
            raise errors.dependency_unavailable(message)
        if status == 429:
            raise errors.rate_limited(message, retry_after_seconds=_retry_after(response))
        if status >= 500:
            logger.warning("%s（core 侧故障）：%s", action, message)
            raise errors.dependency_unavailable(message)
        raise errors.invalid_request(message)


def _error_detail(response: httpx.Response) -> str:
    """core 的错误信封是 `{code, success, msg, timestamp}`，只取 `code` 与 `msg`。"""
    try:
        body = response.json()
    except ValueError:
        return "响应体不是 JSON"
    if not isinstance(body, dict):
        return "响应体形状不可识别"
    code = body.get("code")
    msg = body.get("msg")
    return f"code={code}, msg={msg}"


def _retry_after(response: httpx.Response) -> int | None:
    raw = response.headers.get("Retry-After")
    if raw is None:
        return None
    try:
        return max(0, int(raw))
    except ValueError:
        return None
