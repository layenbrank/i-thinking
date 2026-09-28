"""`POST /internal/v1/agents/steps`：智能体的**一步**（一次推理 + 至多一轮只读工具）。

循环的宿主是 core（一个步骤一个可靠活动），这里只做无状态的一步。顺序是刻意的：

1. **先做纯校验**（400 不碰幂等键、不碰数据库、不碰 core）：`history` 里出现 `system`
   消息、`allowedTools` 里有我们不认识的名字——这些是 core 的拼接错了，当场说清楚比
   让它带着一个空工具集继续跑强得多；
2. 算清本步**实际**提供的工具（见下），再组幂等载荷：重发必须落到同一份额外输入上；
3. 进幂等闸门（重发回放第一次的响应）；
4. 调模型 → 解析 → 串行跑工具（结果与 `message.toolCalls` 同序）；
5. 记账后才回响应。

三处不太显然但必须守住的地方：

* **系统提示词由本服务拥有**，每步前置同一份。core 只需要维护「业务历史」，
  不必也不该知道工具环境的规则；这也让 `history` 里出现 `system` 成为明确错误；
* **`remainingSteps <= 1` 时不给工具**：这是硬止损。模型仍可能凭印象要工具（它是从
  prompt 里看到过工具说明的），这种调用一律不执行、把 `toolCalls` 剥掉并判 `finished=true`
  ——契约里 `finished` 等价于「没有再要工具」，不能让一个不存在的工具破坏这个不变式。
  正文照常交给 core（模型通常会直接作答说资料不足）；
* **`allowedTools` 去重排序后再进幂等载荷**：工具清单对模型来说是集合，core 换了顺序
  不该算另一次调用（否则一次无害的重排重发会变成 409）。
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ai_worker import errors, idempotency
from ai_worker.agent_runtime import dialogue, tools
from ai_worker.agent_runtime.schemas import (
    AgentMessage,
    AgentStepRequest,
    AgentStepResponse,
    AgentToolResult,
    AgentUsage,
)
from ai_worker.config import Settings
from ai_worker.core_client import CoreClient
from ai_worker.db import Database

logger = logging.getLogger(__name__)

STEP_PATH = "/internal/v1/agents/steps"
#: 幂等账本里的端点名。**不要**跟着路径改：它是历史账本的键，改了等于把已完成的调用作废。
ENDPOINT = "agents.steps"

#: 每步前置的系统提示词。写在这里而不是让 core 传：工具环境是**本服务**的实现细节，
#: 而且固定文本才能让「同一份历史」在不同步骤上得到一致的模型行为。
SYSTEM_PROMPT = (
    "你是一个在服务端运行的智能体，正在分步完成用户的任务。"
    "你只能通过给定的工具获取事实，没有别的途径：工具都是只读的，不存在写操作或发请求的工具。"
    "需要资料依据时必须先调用工具，不要凭记忆编造文件内容、数字或引用。"
    "工具返回失败时，它会告诉你原因，请据此调整参数或换一个思路，不要把失败当成结论。"
    "资料不足就明确说资料不足，这比给出一个看似合理但无依据的答案更有价值。"
    "已经能回答时就直接给出结论，不要再调用工具。"
)

#: 大写是**能力挂载约定**：`app.create_app()` 只按 `ROUTER` 这个名字取路由
#: （见 `CAPABILITY_MODULES`），大小写写错就会静默少挂一个端点。
ROUTER = APIRouter()


@ROUTER.post(STEP_PATH, summary="执行一步智能体推理")
async def agent_step(request: Request, body: AgentStepRequest) -> JSONResponse:
    """执行一步。响应码：200 完成（含「工具失败」这种正常结果）；400 请求或历史拼接不合法；
    401 内部令牌不对；409 幂等键冲突或仍在执行中；429 core 限流；503 数据库、模型或向量库
    暂时不可用。**工具自身的失败不会变成 4xx/5xx**，它只是 `toolResults[].ok=false`。
    """
    _reject_system_history(body)
    unknown = tools.unknown(body.allowed_tools)
    if unknown:
        listed = "、".join(unknown)
        raise errors.invalid_request(
            f"allowedTools 里有不认识的工具名：{listed}；可用工具只有 {_known_tools()}"
        )

    allowed = sorted(set(body.allowed_tools))
    offered = _offered_tools(body, allowed)
    payload = {
        "tenantID": body.tenant_id,
        "objective": body.objective,
        "model": body.model,
        "embedModel": body.embed_model,
        "history": [message.wire() for message in body.history],
        "allowedTools": allowed,
        "remainingSteps": body.remaining_steps,
    }

    async with idempotency.guarded(request, endpoint=ENDPOINT, payload=payload) as run:
        replayed = idempotency.replay_response(run)
        if replayed is not None:
            logger.info("幂等重发，回放智能体步骤结果（键 %s）", run.key)
            return replayed

        settings = request.app.state.settings
        core: CoreClient = request.app.state.core
        database: Database = request.app.state.db

        completion = dialogue.parse_completion(
            await core.chat(
                tenant_id=body.tenant_id,
                model=body.model,
                messages=dialogue.to_upstream(_messages(body)),
                tools=offered,
            )
        )

        response = await _run_tools(
            completion_message=completion.message,
            completion_usage=completion.usage,
            body=body,
            offered=offered,
            core=core,
            database=database,
            settings=settings,
        )
        run.record(status=200, body=response.wire())
        return JSONResponse(response.wire())


def _reject_system_history(body: AgentStepRequest) -> None:
    if any(message.role == "system" for message in body.history):
        raise errors.invalid_request(
            "history 不得包含 role=system 的消息：系统提示词由服务端每步前置，"
            "调用方只需维护业务历史（user/assistant/tool）"
        )


def _messages(body: AgentStepRequest) -> list[AgentMessage]:
    """本步真正发给模型的完整消息：系统的固定前缀 + 业务历史。

    第一步（`history` 为空）用 `objective` 起头；之后不再重复它——目标已经在历史里，
    每步重述一遍只会让模型把「原始目标」看得比「最新进展」更重。
    """
    messages = [AgentMessage.from_parts(role="system", content=SYSTEM_PROMPT)]
    if body.history:
        messages.extend(body.history)
    else:
        messages.append(AgentMessage.from_parts(role="user", content=body.objective))
    return messages


def _offered_tools(body: AgentStepRequest, allowed: list[str]) -> list[dict[str, Any]]:
    """本步实际给模型的工具清单。预算只剩一步时清空（硬止损）。"""
    if not allowed:
        return []
    if body.remaining_steps is not None and body.remaining_steps <= 1:
        logger.info("剩余步数 %s，本步不提供工具（硬止损）", body.remaining_steps)
        return []
    return tools.catalog(allowed)


async def _run_tools(
    *,
    completion_message: AgentMessage,
    completion_usage: AgentUsage,
    body: AgentStepRequest,
    offered: list[dict[str, Any]],
    core: CoreClient,
    database: Database,
    settings: Settings,
) -> AgentStepResponse:
    """跑工具并把这一步组装成响应（含「要了工具但没法跑」的两条退化路径）。"""
    calls = completion_message.tool_calls or []

    if not calls:
        return AgentStepResponse.from_parts(
            finished=True,
            message=completion_message,
            tool_results=[],
            usage=completion_usage,
        )

    if not offered:
        # 没给工具它却要工具：这是幻觉，不是故障。剥掉调用、判 finished，
        # 保住契约的「finished ⟺ toolCalls 为空」，让 core 收尾时拿到的是模型的原话。
        names = "、".join(call.name for call in calls)
        logger.warning(
            "模型在无工具可用时仍要求调用 %s（剩余步数 %s），已忽略并判为完成",
            names,
            body.remaining_steps,
        )
        return AgentStepResponse.from_parts(
            finished=True,
            message=AgentMessage.from_parts(role="assistant", content=completion_message.content),
            tool_results=[],
            usage=completion_usage,
        )

    context = tools.ToolContext(
        tenant_id=body.tenant_id,
        embed_model=body.embed_model,
        core=core,
        database=database,
        settings=settings,
    )
    results: list[AgentToolResult] = []
    for index, call in enumerate(calls):
        if index >= settings.agent_max_tool_calls_per_step:
            # 串行执行 + 逐条硬上限：一次疯狂的多工具调用不能变成一次超长的模型等待。
            results.append(
                tools.refuse(
                    call,
                    reason=(
                        f"本步最多执行 {settings.agent_max_tool_calls_per_step} 次工具调用，"
                        "这条没有执行。请减少调用次数，必要时先只查最相关的那一个。"
                    ),
                )
            )
            continue
        results.append(
            await tools.invoke(
                context,
                call,
                allowed=body.allowed_tools,
                max_chars=settings.agent_tool_result_max_chars,
            )
        )

    return AgentStepResponse.from_parts(
        finished=False,
        message=completion_message,
        tool_results=results,
        usage=completion_usage,
    )


def _known_tools() -> str:
    return "、".join(tools.names())
