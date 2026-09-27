"""RAG 摄入：把 core 的资产正文变成可检索的分块与向量。

三个阶段各自一个模块、各自一个路由，`ROUTER` 把它们聚成一个能力包：

* 分块 `rag.chunk`（**P6b-3**）：`POST /internal/v1/assets/{assetID}/chunks`；
* 嵌入 `rag.embed`（**P6b-4**）：`POST /internal/v1/assets/{assetID}/embeddings`；
* 落索引 `rag.index`（**P6b-4**）：`PUT /internal/v1/assets/{assetID}/index`。

一个能力包只暴露一个 `ROUTER`（`app.create_app` 按这个名字取），所以新增路由要在这里聚合，
不能各自往 `app` 上挂。

各文件的分工是「一层的错只在一个文件里」：

* `extract.py` —— 字节 → 纯文本（按 MIME 选抽取器，抽不动就 400）；
* `chunking.py` —— 纯文本 → 块（纯函数、确定性，幂等重放的前提）；
* `store.py` —— 块集 / 向量 / 索引版本 → 数据库（按 `chunk_set_id`、`(tenant, asset)` 幂等写入）；
* `router.py` / `embed.py` / `index.py` —— 按各自的 HTTP 语义串起来，管住幂等与错误码映射。

能力在这里登记（由 [`ai_worker.app.create_app`] 导入本包触发）。**登记了能力就必须真有路由**，
`tests/test_route_surface.py` 会对着契约核一遍。
"""

from __future__ import annotations

from fastapi import APIRouter

from ai_worker import capabilities
from ai_worker.rag_ingest import embed, index, router

ROUTER = APIRouter()
ROUTER.include_router(router.ROUTER)
ROUTER.include_router(embed.ROUTER)
ROUTER.include_router(index.ROUTER)

#: 登记进健康探针的能力名（契约词汇，别改拼写）。
registry = capabilities.registry.register("rag.chunk", implemented_in="ai_worker.rag_ingest")
registry_embed = capabilities.registry.register("rag.embed", implemented_in="ai_worker.rag_ingest")
registry_index = capabilities.registry.register("rag.index", implemented_in="ai_worker.rag_ingest")

__all__ = ["ROUTER", "registry", "registry_embed", "registry_index"]
