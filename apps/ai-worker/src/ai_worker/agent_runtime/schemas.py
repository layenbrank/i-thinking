"""`/internal/v1/agents/steps` 的请求/响应模型（契约 `spec/internal.yaml`）。

字段名直接抄契约（camelCase，用 `alias` 而不是 `alias_generator`：契约里是 `tenantID` /
`toolCallID`，通用驼峰转换会生成 `tenantId`，对不上）。

`extra="forbid"` 是刻意的，而且这里比 RAG 那几个模型更关键：本端点的**请求体是 core 从上一轮
响应里攒出来的**（历史 + 工具结果）。两侧形状只要漂一点，core 攒出来的历史就会在下一步
被拒；宁可当场 400 把版本不一致暴露出来，也不要静默丢掉半个工具调用。

**`arguments` 是字符串**（`"{\\"query\\":\\"…\\"}"`）而不是对象：这就是 OpenAI 工具调用的线格式，
保持原样能让 core 不必在中间反序列化再序列化一遍，历史可以整条回灌。
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

_CONTRACT = ConfigDict(extra="forbid", populate_by_name=True)


class AgentToolCall(BaseModel):
    """契约 `AgentToolCall`：模型要求调用的一次工具。"""

    model_config = _CONTRACT

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    #: 缺省时按 `{}` 处理：OpenAI 的无参调用就是不给 `arguments`，不是给一个空串
    #: （空串不是合法 JSON，会被判成参数错，那是假故障）。
    arguments: str = "{}"
    tool_call_type: str | None = Field(default=None, alias="toolCallType")

    @classmethod
    def from_parts(
        cls,
        *,
        call_id: str,
        name: str,
        arguments: str = "{}",
        tool_call_type: str | None = None,
    ) -> AgentToolCall:
        return cls.model_validate(
            {
                "id": call_id,
                "name": name,
                "arguments": arguments,
                "tool_call_type": tool_call_type,
            }
        )

    def wire(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json", exclude_none=True)


class AgentMessage(BaseModel):
    """契约 `AgentMessage`：一条对话消息。"""

    model_config = _CONTRACT

    role: Literal["system", "user", "assistant", "tool"]
    content: str | None = None
    #: `None` 与 `[]` 在线上是两个意思，不能合并：`None` 表示「这条消息与工具无关」
    #: （user/system/tool），`[]` 表示「助手这一步没有再要工具」。
    tool_calls: list[AgentToolCall] | None = Field(default=None, alias="toolCalls")
    tool_call_id: str | None = Field(default=None, alias="toolCallID")

    @classmethod
    def from_parts(
        cls,
        *,
        role: str,
        content: str | None = None,
        tool_calls: list[AgentToolCall] | None = None,
        tool_call_id: str | None = None,
    ) -> AgentMessage:
        return cls.model_validate(
            {
                "role": role,
                "content": content,
                "tool_calls": tool_calls,
                "tool_call_id": tool_call_id,
            }
        )

    def wire(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json", exclude_none=True)


class AgentToolResult(BaseModel):
    """契约 `AgentToolResult`：一次工具调用的结果，与 `message.toolCalls` 同序一一对应。"""

    model_config = _CONTRACT

    tool_call_id: str = Field(alias="toolCallID")
    name: str
    ok: bool
    content: str
    #: 失败时的稳定机器码。只进 core 的日志与审计，**不喂模型**（模型读 `content` 里的白话）。
    error: str | None = None

    @classmethod
    def from_parts(
        cls,
        *,
        tool_call_id: str,
        name: str,
        ok: bool,
        content: str,
        error: str | None = None,
    ) -> AgentToolResult:
        return cls.model_validate(
            {
                "tool_call_id": tool_call_id,
                "name": name,
                "ok": ok,
                "content": content,
                "error": error,
            }
        )

    def wire(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json", exclude_none=True)


class AgentUsage(BaseModel):
    """契约 `AgentUsage`：上游给的 token 用量；上游没给时三个值都是 0（不编造）。"""

    model_config = _CONTRACT

    prompt_tokens: int = Field(alias="promptTokens", ge=0)
    completion_tokens: int = Field(alias="completionTokens", ge=0)
    total_tokens: int = Field(alias="totalTokens", ge=0)

    @classmethod
    def from_parts(
        cls, *, prompt_tokens: int, completion_tokens: int, total_tokens: int
    ) -> AgentUsage:
        return cls.model_validate(
            {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
            }
        )

    def wire(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, mode="json", exclude_none=True)


class AgentStepRequest(BaseModel):
    """契约 `AgentStepRequest`：core 说「目标 + 到目前为止的历史 + 可用工具」。"""

    model_config = _CONTRACT

    schema_version: Literal[1] = Field(alias="schemaVersion")
    tenant_id: str = Field(alias="tenantID", min_length=1)
    objective: str = Field(min_length=1)
    model: str = Field(min_length=1)
    embed_model: str = Field(alias="embedModel", min_length=1)
    history: list[AgentMessage] = Field(default_factory=list)
    allowed_tools: list[str] = Field(default_factory=list, alias="allowedTools")
    #: 还剩几步（含本步）。`<= 1` 时本步不给工具——预算用尽前必须先收一条结论。
    remaining_steps: int | None = Field(default=None, alias="remainingSteps", ge=0)


class AgentStepResponse(BaseModel):
    """契约 `AgentStepResponse`：这一步的产出，core 追加进历史后决定要不要再来一步。"""

    model_config = _CONTRACT

    schema_version: Literal[1] = Field(alias="schemaVersion")
    #: 当且仅当 `message.tool_calls` 为空时为 true。
    finished: bool
    message: AgentMessage
    tool_results: list[AgentToolResult] = Field(alias="toolResults")
    usage: AgentUsage

    @classmethod
    def from_parts(
        cls,
        *,
        finished: bool,
        message: AgentMessage,
        tool_results: list[AgentToolResult],
        usage: AgentUsage,
    ) -> AgentStepResponse:
        return cls.model_validate(
            {
                "schema_version": 1,
                "finished": finished,
                "message": message,
                "tool_results": tool_results,
                "usage": usage,
            }
        )

    def wire(self) -> dict[str, Any]:
        """按契约字段名导出。

        `exclude_none=True` 不是省字节，是为了**合契约**：契约里 `content` 是 `type: string`，
        不给它加 `nullable`，所以「助手只要工具、没有正文」时这个键必须缺席，而不是 `null`。
        `toolResults` 是必填，空列表照常输出（`[]` 不是 `None`）。
        """
        return self.model_dump(by_alias=True, mode="json", exclude_none=True)
