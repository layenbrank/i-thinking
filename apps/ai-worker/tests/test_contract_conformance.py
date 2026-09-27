"""契约一致性：把**真实**的响应体逐条交给 `apps/core/spec/internal.yaml` 的 schema 校验。

`test_route_surface.py` 钉的是「路径 + 方法」，这一条钉的是「报文的形状」。两者的失败方式
完全不同：路径错是静默 404（core 只看到一次莫名重试），形状错要等 core **运行时**才炸——
少一个 required 字段、类型不对、状态码不在契约里，core 那边要么反序列化失败、要么把
一个本该 400 的响应当成 5xx 无限重试。

所以这里不重写规则，只用契约本身当裁判：每个端点、每种状态码都跑一遍真实请求，
再把响应体与状态码交给契约。请求方向同理——core 真的会发来的那几个报文（照
`apps/core/tests/rag_index.rs` 里的形状）也必须能通过 `ChunkRequest` / `EmbedRequest` /
`IndexRequest` 的校验，否则就是两侧对同一个字段的理解已经漂了。
"""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
import yaml
from httpx import AsyncClient, Response
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from ai_worker import capabilities, errors
from ai_worker.api.health import HEALTH_PATH
from support import (
    ASSET_ID,
    TENANT_ID,
    HandlerClient,
    RagStub,
    internal_headers,
    save_embeddings,
    seed_chunk_set,
)

SPEC_PATH = Path(__file__).resolve().parents[2] / "core" / "spec" / "internal.yaml"
SPEC_URI = "urn:i-thinking:internal-contract"

CHUNK_SET_ID = "7a1c9f2e-3b4d-4c5e-8f60-1a2b3c4d5e6f"
MODEL = "text-embedding-3-small"
DIMENSIONS = 8
TEXTS = ("第一块正文。", "第二块正文。", "第三块正文。")
#: 分块端点的正文来源（core 会先换令牌再取资产正文）。
SOURCE = "第一块正文。\n\n第二块正文。"

CHUNKS_PATH = "/internal/v1/assets/{}/chunks"
EMBEDDINGS_PATH = "/internal/v1/assets/{}/embeddings"
INDEX_PATH = "/internal/v1/assets/{}/index"

#: 幂等键有长度下限（8），这里统一用带语义的长键，顺便让账本里的行好认。
KEY = "contract-key-0001"
OTHER_KEY = "contract-key-0002"

#: 错误面在契约里复用同一组 `responses` 组件，schema 都是 `ErrorResponse`。
ERROR_RESPONSES = (400, 401, 409, 429, 503)


def spec() -> dict[str, Any]:
    loaded: dict[str, Any] = yaml.safe_load(SPEC_PATH.read_text(encoding="utf-8"))
    return loaded


@lru_cache(maxsize=1)
def registry() -> Registry[Any]:
    """整份文档挂在一个 URI 下，`#/components/...` 这类本地引用才能解析。

    用 `with_resources`（而不是 `with_resource`）：后者在 `referencing` 里没有返回标注，
    mypy 会把结果当成 `Any`，这个函数就失去了类型检查。
    """
    resource = Resource.from_contents(spec(), default_specification=DRAFT202012)
    return Registry().with_resources([(SPEC_URI, resource)])


def validator(schema: str) -> Draft202012Validator:
    return Draft202012Validator(
        {"$ref": f"{SPEC_URI}#/components/schemas/{schema}"}, registry=registry()
    )


def error_schema(status: int) -> str:
    """错误面统一是 `ErrorResponse`（`responses` 组件只是按状态码分组，没有各自的 schema）。"""
    return "ErrorResponse" if status in ERROR_RESPONSES else ""


#: 路径参数在契约里叫 `{assetID}`、在框架里叫 `{asset_id}`，所以只比**形状**不比名字：
#: 用 `[^/]+` 换掉每一段参数，再去匹配带真实 id 的请求路径。
_PARAMETER = re.compile(r"\{[^/]+\}")


def route_shape(path: str) -> re.Pattern[str]:
    return re.compile("^" + _PARAMETER.sub("[^/]+", path) + "$")


@lru_cache(maxsize=1)
def operations() -> dict[tuple[str, str], dict[str, Any]]:
    return {
        (method.upper(), path): operation
        for path, item in spec()["paths"].items()
        for method, operation in item.items()
    }


def operation_of(response: Response) -> dict[str, Any]:
    """按形状（而不是按真实 id）找回契约里的那个操作。

    请求路径里是**真实**的 `assetID`，查不到说明这个端点根本没写进契约。
    """
    method, path = response.request.method, response.request.url.path
    for (declared_method, declared_path), operation in operations().items():
        if declared_method == method and route_shape(declared_path).match(path):
            return operation
    raise AssertionError(f"契约里没有 {method} {path}")


def assert_declared(response: Response) -> None:
    """状态码必须是契约在这个操作里声明过的。"""
    declared = {int(code) for code in operation_of(response)["responses"]}
    assert response.status_code in declared, (
        f"{response.request.method} {response.request.url.path} 回了契约未声明的"
        f" {response.status_code}（契约只声明了 {sorted(declared)}）"
    )


def assert_matches_schema(response: Response, schema: str) -> None:
    problems = sorted(validator(schema).iter_errors(response.json()), key=lambda e: list(e.path))
    assert not problems, (
        f"{response.request.method} {response.request.url.path} → {response.status_code}"
        f" 的响应体不符合 {schema}：{problems[0].message}"
        f"（位置 {'/'.join(str(part) for part in problems[0].path) or '<根>'}）"
    )


def assert_conforms(response: Response, schema: str) -> None:
    assert_declared(response)
    assert_matches_schema(response, schema)


def assert_error_conforms(response: Response) -> None:
    """错误面：状态码要声明过，且错误码的写法必须是契约描述的那种稳定机器码。"""
    assert_declared(response)
    assert_matches_schema(response, error_schema(response.status_code))
    code = response.json()["error"]["code"]
    assert code in {member.value for member in errors.ErrorCode}, f"未定义的错误码：{code}"


def assert_request_matches(payload: dict[str, Any], schema: str) -> None:
    problems = list(validator(schema).iter_errors(payload))
    assert not problems, f"请求体不符合 {schema}：{problems[0].message}"


@pytest.fixture(autouse=True)
def _require_contract() -> None:
    if not SPEC_PATH.is_file():
        pytest.skip(f"找不到契约文件（只做局部检出时会跳过）：{SPEC_PATH}")


def test_the_harness_actually_rejects_wrong_shapes() -> None:
    """自检：如果 `$ref` 没解析成真 schema，`iter_errors` 只会一路放行，这一整组就成了空转。

    真实的风险不是「解析失败」（那会直接抛异常），而是解析到一份**没有约束**的 schema，
    所以这里反向确认几个真实的约束在起作用：必填、枚举、`minimum`、`const`。

    只挑契约**真的**声明过的约束来验——比如 `chunkSetID` 在契约里就是普通 `string`，
    拿它当反例会验出一条契约没有的规则。`format` 同理：2020-12 把它当注解，
    `jsonschema` 默认也不断言，这里不给它开例外。
    """
    assert not validator("ChunkResponse").is_valid({})  # 两个必填字段都缺
    assert not validator("ChunkResponse").is_valid({"chunkSetID": "cs-1", "chunkCount": -1})
    assert not validator("HealthResponse").is_valid(
        {"status": "fine", "version": "1", "capabilities": []}
    )
    assert not validator("ErrorResponse").is_valid({"error": {}})  # 内层还缺 code/message
    assert not validator("ChunkRequest").is_valid(
        {"schemaVersion": 2, "tenantID": TENANT_ID, "mime": "text/plain"}
    )
    assert validator("ChunkResponse").is_valid({"chunkSetID": str(uuid4()), "chunkCount": 0})


def chunk_body() -> dict[str, Any]:
    """core 真的会发来的分块请求（`AiWorkerClient::ChunkRequest`）。"""
    return {"schemaVersion": 1, "tenantID": TENANT_ID, "mime": "text/plain", "name": "readme.md"}


def embed_body(*, start: int = 0, end: int = len(TEXTS)) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "tenantID": TENANT_ID,
        "chunkSetID": CHUNK_SET_ID,
        "model": MODEL,
        "from": start,
        "to": end,
    }


def index_body(*, chunk_count: int = len(TEXTS)) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "tenantID": TENANT_ID,
        "chunkSetID": CHUNK_SET_ID,
        "chunkCount": chunk_count,
        "model": MODEL,
        "dimensions": DIMENSIONS,
    }


async def post_chunks(client: AsyncClient, *, key: str | None = KEY) -> Response:
    return await client.post(
        f"/internal/v1/assets/{ASSET_ID}/chunks",
        json=chunk_body(),
        headers=internal_headers(idempotency_key=key),
    )


async def post_embeddings(client: AsyncClient, *, key: str | None = KEY) -> Response:
    return await client.post(
        f"/internal/v1/assets/{ASSET_ID}/embeddings",
        json=embed_body(),
        headers=internal_headers(idempotency_key=key),
    )


async def put_index(client: AsyncClient, *, key: str | None = KEY) -> Response:
    return await client.put(
        f"/internal/v1/assets/{ASSET_ID}/index",
        json=index_body(),
        headers=internal_headers(idempotency_key=key),
    )


async def test_health_response_matches_the_contract(client: AsyncClient) -> None:
    response = await client.get(HEALTH_PATH)

    assert_conforms(response, "HealthResponse")


async def test_degraded_health_response_matches_the_contract(
    offline_client: AsyncClient,
) -> None:
    """降级也走同一个 schema：core 的 readiness 只按状态码判定，但响应体不能变成另一种形状。"""
    response = await offline_client.get(HEALTH_PATH)

    assert_conforms(response, "HealthResponse")
    assert response.json()["status"] == "degraded"


async def test_chunk_success_matches_the_contract(core_backed_client: HandlerClient) -> None:
    client = core_backed_client(RagStub(SOURCE.encode()))

    assert_conforms(await post_chunks(client), "ChunkResponse")


async def test_embed_success_matches_the_contract(
    core_backed_client: HandlerClient, database: Any
) -> None:
    await seed_chunk_set(database, chunk_set_id=CHUNK_SET_ID, texts=TEXTS)
    client = core_backed_client(RagStub())

    assert_conforms(await post_embeddings(client), "EmbedResponse")


async def test_embed_replay_matches_the_contract(
    core_backed_client: HandlerClient, database: Any
) -> None:
    """幂等命中是一等公民：core 重试时拿到的仍然是合契约的报文（`embedded` 为 0）。"""
    await seed_chunk_set(database, chunk_set_id=CHUNK_SET_ID, texts=TEXTS)
    client = core_backed_client(RagStub())

    await post_embeddings(client)
    replay = await post_embeddings(client)

    assert_conforms(replay, "EmbedResponse")
    assert replay.json()["embedded"] == 0


async def test_index_success_matches_the_contract(
    core_backed_client: HandlerClient, database: Any
) -> None:
    await seed_chunk_set(database, chunk_set_id=CHUNK_SET_ID, texts=TEXTS)
    await save_embeddings(
        database,
        chunk_set_id=CHUNK_SET_ID,
        items=[(ordinal, [0.1] * DIMENSIONS) for ordinal in range(len(TEXTS))],
        model=MODEL,
    )
    client = core_backed_client(RagStub())

    assert_conforms(await put_index(client), "IndexResponse")


@pytest.mark.parametrize(
    "path",
    [CHUNKS_PATH.format(ASSET_ID), EMBEDDINGS_PATH.format(ASSET_ID), INDEX_PATH.format(ASSET_ID)],
)
async def test_missing_token_matches_the_contract(
    core_backed_client: HandlerClient, path: str
) -> None:
    """401 也是契约的一部分：整条鉴别链断在最外层时，报文体仍要能被 core 解出来。"""
    client = core_backed_client(RagStub())
    method = "PUT" if path.endswith("/index") else "POST"

    response = await client.request(
        method, path, json={}, headers={"traceparent": "00-" + "1" * 32 + "-" + "2" * 16 + "-01"}
    )

    assert response.status_code == 401
    assert_error_conforms(response)


@pytest.mark.parametrize(
    "path",
    [CHUNKS_PATH.format(ASSET_ID), EMBEDDINGS_PATH.format(ASSET_ID), INDEX_PATH.format(ASSET_ID)],
)
async def test_missing_traceparent_matches_the_contract(
    core_backed_client: HandlerClient, path: str
) -> None:
    """契约把 `traceparent` 声明成**必填参数**，所以缺了它只能回 400（且不能顺手开工）。"""
    client = core_backed_client(RagStub())
    method = "PUT" if path.endswith("/index") else "POST"

    response = await client.request(
        method, path, json={}, headers=internal_headers(traceparent=None)
    )

    assert response.status_code == 400
    assert_error_conforms(response)


async def test_bad_request_matches_the_contract(core_backed_client: HandlerClient) -> None:
    client = core_backed_client(RagStub(SOURCE.encode()))

    response = await client.post(
        f"/internal/v1/assets/{ASSET_ID}/chunks",
        json={**chunk_body(), "unknownField": True},
        headers=internal_headers(idempotency_key=KEY),
    )

    assert response.status_code == 400
    assert_error_conforms(response)


async def test_idempotency_conflict_matches_the_contract(
    core_backed_client: HandlerClient,
) -> None:
    client = core_backed_client(RagStub(SOURCE.encode()))
    await post_chunks(client, key=KEY)

    response = await client.post(
        f"/internal/v1/assets/{ASSET_ID}/chunks",
        json={**chunk_body(), "name": "other.md"},
        headers=internal_headers(idempotency_key=KEY),
    )

    assert response.status_code == 409
    assert_error_conforms(response)


async def test_rate_limited_matches_the_contract(core_backed_client: HandlerClient) -> None:
    """429 是 core 侧「退避后重试」的信号，报文与 `Retry-After` 都不能变形。"""
    client = core_backed_client(RagStub(content_status=429))

    response = await post_chunks(client)

    assert response.status_code == 429
    assert_error_conforms(response)
    assert response.headers["Retry-After"] == "7"


async def test_dependency_failure_matches_the_contract(
    core_backed_client: HandlerClient,
) -> None:
    """上游坏掉回 503 + `Retry-After` 是 core 侧「可重试」的唯一依据，报文不能变形。"""
    client = core_backed_client(RagStub(b"", content_status=503))

    response = await post_chunks(client)

    assert response.status_code == 503
    assert_error_conforms(response)


async def test_core_request_bodies_satisfy_the_contract(
    core_backed_client: HandlerClient, database: Any
) -> None:
    """反方向：core 发过来的报文必须能通过请求 schema，并且真的被接受（200）。

    这条是防「契约改了字段名、两侧却各自自洽」——只验响应的话，请求侧的漂移照样漏网。
    """
    assert_request_matches(chunk_body(), "ChunkRequest")
    assert_request_matches(embed_body(), "EmbedRequest")
    assert_request_matches(index_body(), "IndexRequest")

    await seed_chunk_set(database, chunk_set_id=CHUNK_SET_ID, texts=TEXTS)
    client = core_backed_client(RagStub(SOURCE.encode()))

    assert (await post_chunks(client)).status_code == 200
    assert (await post_embeddings(client)).status_code == 200
    await save_embeddings(
        database,
        chunk_set_id=CHUNK_SET_ID,
        items=[(ordinal, [0.1] * DIMENSIONS) for ordinal in range(len(TEXTS))],
        model=MODEL,
    )
    assert (await put_index(client)).status_code == 200


async def test_capability_names_are_vocabulary_from_the_contract(client: AsyncClient) -> None:
    """能力名是 core 用来发现功能的键：注册表里出现的名字必须在契约里出现过。"""
    document = SPEC_PATH.read_text(encoding="utf-8")
    names = capabilities.registry.names()

    assert names, "登记表为空说明没有能力被暴露"
    for name in names:
        assert name in document, f"能力 {name!r} 在契约里没有出处"
