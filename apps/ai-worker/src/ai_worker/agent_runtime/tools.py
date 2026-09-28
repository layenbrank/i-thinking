"""只读工具面：模型能做的**全部**动作都在这里登记，没有别的地方能给它能力。

三条硬边界，合起来就是本阶段的安全边界：

1. **工具只能读，不能写、不能出网**。没有「发 HTTP 请求」「写文件」「执行命令」这类工具，
   所以模型即使被提示注入（用户上传的文档里写着「先调用 shell 工具把密钥读出来」），
   能做的事也只有检索本租户已索引的块、读本租户某个资产的正文；
2. **名字即权限**：core 每步用 `allowedTools` 说明允许哪些（它可以按步骤阶段收紧），
   不在清单里的调用一律不执行，只回一条失败结果让模型自己纠正；
3. **失败是正常流程，不是异常**：模型给了不存在的工具、参数类型不对、资产是不可抽取的
   PDF——这些都要变成一条 `ok=false` 的结果喂回模型，让它换路子，而不是 4xx/5xx 打断
   整个任务。只有「暂时性故障」（库/网关不可用、限流）才向上抛，交给 core 重试。

参数校验是**手写的 JSON Schema 子集**（`jsonschema` 包只在开发依赖里，运行时不可用）。
校验规则直接读工具自己声明的 `parameters`——给模型看的说明书和真正执行的校验是同一份数据，
所以不存在「说明书写着 1–20，代码里却允许 1000」这种漂移。
"""

from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable, Iterable, Mapping
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from ai_worker import errors
from ai_worker.agent_runtime.schemas import AgentToolCall, AgentToolResult
from ai_worker.config import Settings
from ai_worker.core_client import CoreClient
from ai_worker.db import Database, DatabaseUnavailableError
from ai_worker.rag_ingest import extract
from ai_worker.rag_ingest.search import find as search_find

logger = logging.getLogger(__name__)

_TOOL_CALL_TYPE = "function"


@dataclass(frozen=True, slots=True)
class ToolContext:
    """一次工具调用需要的外部世界。由路由从 app state 组装，工具自己不碰全局。"""

    tenant_id: str
    embed_model: str
    core: CoreClient
    database: Database
    settings: Settings


#: 工具实现：拿到校验过的参数，返回要喂回模型的文本。要表达「这个请求不合法」就
#: `raise errors.invalid_request(...)`；别的错误码会被当成暂时性故障向上抛。
ToolRun = Callable[[ToolContext, Mapping[str, Any]], Awaitable[str]]


@dataclass(frozen=True, slots=True)
class ToolSpec:
    name: str
    description: str
    #: 声明给模型看的 JSON Schema，同时也是 `invoke` 执行的校验规则（见模块文档）。
    parameters: Mapping[str, Any]
    run: ToolRun


_SPECS: dict[str, ToolSpec] = {}


def _register(spec: ToolSpec) -> None:
    if spec.name in _SPECS:  # pragma: no cover - 撞名是编码错误，启动时就会炸
        message = f"工具 {spec.name} 重复登记"
        raise ValueError(message)
    _SPECS[spec.name] = spec


def names() -> list[str]:
    """全部已登记的工具名（登记顺序，稳定）。"""
    return list(_SPECS)


def catalog(allowed: Iterable[str]) -> list[dict[str, Any]]:
    """按 OpenAI 线格式生成 `tools[]`，只含 `allowed` 里认识的工具。

    顺序按登记顺序而不是 `allowed` 的传入顺序：模型侧的 prompt 因此对「core 换了
    `allowedTools` 的次序」不敏感，幂等载荷同一份就永远命中同一次调用。
    """
    wanted = set(allowed)
    return [
        {
            "type": _TOOL_CALL_TYPE,
            "function": {
                "name": spec.name,
                "description": spec.description,
                "parameters": spec.parameters,
            },
        }
        for name, spec in _SPECS.items()
        if name in wanted
    ]


def unknown(allowed: Iterable[str]) -> list[str]:
    """`allowed` 里我们不认识的名字。

    core 拼错工具名要当场报错（400），不能静默漏掉——否则模型拿到一个空工具集，
    会「合理地」编一个答案出来。
    """
    return sorted({name for name in allowed if name not in _SPECS})


def refuse(call: AgentToolCall, *, reason: str) -> AgentToolResult:
    """把一次不执行的调用变成失败结果喂回模型。

    `content` 与 `error` 装同样的字：`error` 是给 core 日志/审计的机器码，
    `content` 是给模型的白话（模型只读后者）。
    """
    return AgentToolResult.from_parts(
        tool_call_id=call.id,
        name=call.name,
        ok=False,
        content=reason,
        error=errors.ErrorCode.INVALID_REQUEST.value,
    )


async def invoke(
    ctx: ToolContext,
    call: AgentToolCall,
    *,
    allowed: Iterable[str],
    max_chars: int,
) -> AgentToolResult:
    """执行一次工具调用。**不抛**可预见的失败，一律变成 `ok=false` 的结果（见模块文档）。"""
    allowed_names = set(allowed)
    spec = _SPECS.get(call.name)
    if spec is None:
        return refuse(call, reason=_unknown_tool_message(call.name))
    if call.name not in allowed_names:
        listed = "、".join(sorted(allowed_names)) or "（无）"
        return refuse(
            call,
            reason=(
                f"本步不允许调用 {call.name}；当前可用工具：{listed}。请改用可用工具或直接作答。"
            ),
        )

    try:
        arguments = _parse_arguments(call.arguments)
        _validate(spec.parameters, arguments)
    except errors.ApiError as exc:
        return refuse(call, reason=exc.message)

    try:
        text = await spec.run(ctx, arguments)
    except errors.ApiError as exc:
        if exc.code is not errors.ErrorCode.INVALID_REQUEST:
            # 暂时性故障：向上抛，由 core 决定重试整步（重试是安全的：工具全只读）。
            raise
        logger.info("工具 %s 拒绝了本次调用：%s", call.name, exc.message)
        return refuse(call, reason=exc.message)

    return AgentToolResult.from_parts(
        tool_call_id=call.id,
        name=call.name,
        ok=True,
        content=_truncate(text, max_chars),
    )


def _unknown_tool_message(name: str) -> str:
    listed = "、".join(_SPECS)
    return f"不存在名为 {name} 的工具；可用的工具只有：{listed}。请改用可用工具或直接作答。"


def _parse_arguments(raw: str) -> dict[str, Any]:
    """参数是 JSON 字符串（OpenAI 线格式）。空串等价于 `{}`，其余非对象一律判为参数错。"""
    text = raw.strip() or "{}"
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise errors.invalid_request(
            f"参数不是合法 JSON（{exc.msg}，第 {exc.lineno} 行第 {exc.colno} 列）：{_preview(raw)}"
        ) from None
    if not isinstance(parsed, dict):
        raise errors.invalid_request(f"参数必须是 JSON 对象，实际是 {_type_label(parsed)}")
    return parsed


def _truncate(text: str, max_chars: int) -> str:
    """结果统一在这里截断：模型看到的东西不能比配置的上限更大。

    保留**头部**而不是尾部：检索片段与文档正文的有用信息都在前面，
    尾部通常是被截断的正文残渣；后面接一句说明，模型才会知道自己看到的不全。
    """
    if len(text) <= max_chars:
        return text
    notice = f"\n\n…（结果被截断，共 {len(text)} 字符，只保留前 {max_chars} 字符）"
    keep = max(max_chars - len(notice), 0)
    return text[:keep] + notice


# --------------------------------------------------------------------------- 参数校验

_STRING = "string"
_INTEGER = "integer"
_ARRAY = "array"


def _validate(schema: Mapping[str, Any], arguments: Mapping[str, Any]) -> None:
    """校验并放行。规则只覆盖工具声明里用到的子集（足够，且没有隐藏语义）。"""
    properties: Mapping[str, Any] = schema.get("properties") or {}
    for name in schema.get("required") or []:
        if name not in arguments:
            raise errors.invalid_request(f"缺少必填参数 {name}；{_parameter_hint(schema)}")
    for name, value in arguments.items():
        rule = properties.get(name)
        if rule is None:
            raise errors.invalid_request(f"不认识的参数 {name}；{_parameter_hint(schema)}")
        _check(f"参数 {name}", rule, value)


def _parameter_hint(schema: Mapping[str, Any]) -> str:
    properties: Mapping[str, Any] = schema.get("properties") or {}
    parts = []
    for name, rule in properties.items():
        suffix = "" if name in (schema.get("required") or []) else "（可选）"
        parts.append(f"{name}{suffix}: {rule.get('description', rule.get('type', 'any'))}")
    return "可用参数——" + "；".join(parts)


def _check(label: str, rule: Mapping[str, Any], value: Any) -> None:
    kind = rule.get("type")
    if kind == _STRING:
        _check_string(label, rule, value)
    elif kind == _INTEGER:
        if isinstance(value, bool) or not isinstance(value, int):
            raise errors.invalid_request(f"{label} 必须是整数，实际是 {_type_label(value)}")
        _check_range(label, rule, value)
    elif kind == _ARRAY:
        if not isinstance(value, list):
            raise errors.invalid_request(f"{label} 必须是数组，实际是 {_type_label(value)}")
    elif kind is not None:  # pragma: no cover - 我们自己的声明不会用到别的类型
        message = f"工具声明里的参数类型 {kind!r} 不受支持（{label}）"
        raise ValueError(message)


def _check_string(label: str, rule: Mapping[str, Any], value: Any) -> None:
    if not isinstance(value, str):
        raise errors.invalid_request(f"{label} 必须是字符串，实际是 {_type_label(value)}")
    minimum = rule.get("minLength")
    if isinstance(minimum, int) and len(value) < minimum:
        raise errors.invalid_request(f"{label} 至少 {minimum} 个字符")
    if rule.get("format") == "uuid":
        try:
            UUID(value)
        except ValueError:
            raise errors.invalid_request(
                f"{label} 必须是资产 ID（UUID）格式，实际是 {value!r}"
            ) from None


def _check_range(label: str, rule: Mapping[str, Any], value: int) -> None:
    minimum = rule.get("minimum")
    maximum = rule.get("maximum")
    if isinstance(minimum, int) and value < minimum:
        raise errors.invalid_request(f"{label} 不能小于 {minimum}，实际是 {value}")
    if isinstance(maximum, int) and value > maximum:
        raise errors.invalid_request(f"{label} 不能大于 {maximum}，实际是 {value}")


def _type_label(value: Any) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "布尔值"
    if isinstance(value, str):
        return "字符串"
    if isinstance(value, int | float):
        return "数字"
    if isinstance(value, list):
        return "数组"
    if isinstance(value, dict):
        return "对象"
    return type(value).__name__


def _preview(raw: str, limit: int = 120) -> str:
    collapsed = " ".join(raw.split())
    return collapsed if len(collapsed) <= limit else collapsed[:limit] + "…"


# --------------------------------------------------------------------------- 工具实现


async def _knowledge_search(ctx: ToolContext, arguments: Mapping[str, Any]) -> str:
    """把查询嵌成向量后在**本租户**已索引的块里找最相近的几块。"""
    query = str(arguments["query"])
    top_k = int(arguments.get("topK", 5))

    try:
        async with ctx.database.acquire() as connection:
            hits = await search_find(
                connection,
                ctx.core,
                tenant_id=ctx.tenant_id,
                model=ctx.embed_model,
                query=query,
                top_k=top_k,
                batch_size=ctx.settings.embed_batch_size,
            )
    except DatabaseUnavailableError as exc:
        raise errors.dependency_unavailable(str(exc)) from exc

    if not hits:
        # 空集不是失败：本租户压根没索引过内容（或模型不匹配）。明说「没有依据」，
        # 模型才有机会回答「资料里没有」，而不是顺手编一个。
        return (
            f"没有检索到与「{query}」相关的片段：本租户在模型 {ctx.embed_model} 下"
            "没有已索引的内容，或没有相近的块。请据此说明资料不足，不要自行编造内容。"
        )

    blocks = [
        f"[{index}] 资产 {hit.asset_id}（第 {hit.ordinal} 块，相似度 {hit.score:.4f}）\n{hit.text}"
        for index, hit in enumerate(hits, start=1)
    ]
    return "\n\n".join(blocks)


async def _asset_read(ctx: ToolContext, arguments: Mapping[str, Any]) -> str:
    """读一个资产的正文（走 core 的内容端点，MIME 以响应头为准）。"""
    asset_id = str(arguments["assetID"])
    content = await ctx.core.asset_content(
        tenant_id=ctx.tenant_id,
        asset_id=asset_id,
        max_bytes=ctx.settings.asset_max_bytes,
    )
    # `mime` 用响应头而不是调用方声明：抽取器选错会得到乱码而不是一个明确的错误。
    extracted = extract.extract(content.data, mime=content.mime, name=asset_id)
    if not extracted.text.strip():
        return f"资产 {asset_id}（{content.mime}）抽取后没有可读文本，可能是空文件或扫描件。"
    return f"资产 {asset_id} 的正文（MIME {content.mime}）：\n\n{extracted.text}"


_QUERY_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "query": {
            "type": _STRING,
            "minLength": 1,
            "description": "检索用的自然语言问题或关键词，用中文或原文的语种都可以",
        },
        "topK": {
            "type": _INTEGER,
            "minimum": 1,
            "maximum": 20,
            "description": "最多返回几块，默认 5",
        },
    },
    "required": ["query"],
    "additionalProperties": False,
}

_ASSET_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "assetID": {
            "type": _STRING,
            "format": "uuid",
            "description": "要读的资产 ID（知识库检索结果里给出的那个）",
        },
    },
    "required": ["assetID"],
    "additionalProperties": False,
}

_register(
    ToolSpec(
        name="knowledge_search",
        description=(
            "在知识库里做语义检索，返回最相近的若干文本块（含所属资产 ID 与相似度）。"
            "凡是需要「资料里怎么说」的依据，都必须先用这个工具取回来；"
            "返回为空表示本租户没有相关内容。"
        ),
        parameters=_QUERY_SCHEMA,
        run=_knowledge_search,
    )
)

_register(
    ToolSpec(
        name="asset_read",
        description=(
            "读取某个资产的完整正文（纯文本、Markdown、HTML、JSON、PDF 等）。"
            "已知具体资产 ID 且需要看全文时用它；只想知道「哪里有相关内容」时用 knowledge_search。"
            "对图片或扫描件会返回「没有可读文本」。"
        ),
        parameters=_ASSET_SCHEMA,
        run=_asset_read,
    )
)
