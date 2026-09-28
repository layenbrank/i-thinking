"""Agent 运行时：单步推理 + 只读工具（Python 生态在这里才无可替代）。

对外只有 `POST /internal/v1/agents/steps`，而且它是**一步**：多轮循环的宿主是 core 的
可靠执行（一步一个活动，重投能收敛），本服务不持有对话状态。分工是刻意的：

* core 决定「要不要再来一步、预算还剩多少、这一步允许哪些工具、历史里有什么」——
  这些问题都需要任务状态与租户策略，那是 core 的地盘；
* ai-worker 决定「这一步怎么跟模型说话、工具怎么跑、失败怎么喂回去」——模型与工具的
  细节都封在这里，core 不必跟着上游厂商的形状改。

登记两个能力（词汇见 `apps/core/spec/internal.yaml`）：

* `agent.step` —— 就是本端点；
* `rag.search` —— 本步骤的工具所用的检索面（向量相似度在 ai-worker 自己的 pgvector 上做）。
  它由 [`ai_worker.rag_ingest`] 登记且**不单独开端点**：检索不该是别人能直接调的能力，
  它只能作为模型的一次工具调用发生，这样「谁在什么租户下查了什么」永远有一条完整因果链。

模块分工：

* `schemas.py` —— 契约形状的 pydantic 模型（含导出时 `exclude_none` 的理由）；
* `dialogue.py` —— 契约的扁平消息 ↔ OpenAI 线格式的翻译，以及上游响应的解析；
* `tools.py` —— 工具登记表、参数校验、失败语义、结果截断；
* `router.py` —— 端点流程（校验 → 幂等 → 调模型 → 跑工具 → 记账）。
"""

from __future__ import annotations

from ai_worker import capabilities
from ai_worker.agent_runtime.router import ROUTER

__all__ = ["ROUTER", "registry"]

registry = capabilities.registry.register(
    "agent.step", implemented_in="ai_worker.agent_runtime.router"
)
