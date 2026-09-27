"""RAG 摄入：把 core 的资产正文变成可检索的分块与向量。

分块（`rag.chunk`）在 **P6b-3** 落地：`ROUTER` 暴露
`POST /internal/v1/assets/{assetID}/chunks`；向量与落索引（`rag.embed` / `rag.index`）在 P6b-4。

各文件的分工是「一层的错只在一个文件里」：

* `extract.py` —— 字节 → 纯文本（按 MIME 选抽取器，抽不动就 400）；
* `chunking.py` —— 纯文本 → 块（纯函数、确定性，幂等重放的前提）；
* `store.py` —— 块 → 数据库（按 `chunk_set_id` 幂等写入）；
* `router.py` —— 把上面三件套按 HTTP 语义串起来，管住幂等与错误码映射。

能力在这里登记（由 [`ai_worker.app.create_app`] 导入本包触发）。**登记了能力就必须真有路由**，
`tests/test_route_surface.py` 会对着契约核一遍。
"""

from __future__ import annotations

from ai_worker import capabilities
from ai_worker.rag_ingest.router import ROUTER

#: 登记进健康探针的能力名（契约词汇，别改拼写）。
registry = capabilities.registry.register("rag.chunk", implemented_in="ai_worker.rag_ingest")

__all__ = ["ROUTER", "registry"]
