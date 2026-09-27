"""应用装配：路由、中间件、错误处理、能力登记，一处组装。

`create_app` 只做装配，不做副作用（不配日志、不连数据库）：
数据库连接与迁移在 lifespan 里，且**失败也不阻止启动**（见 [`ai_worker.db.Database`]）。
注入 `database` 时跳过 lifespan，测试自己管生命周期（连接池的关闭时机对测试很敏感）。
"""

from __future__ import annotations

import importlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from ai_worker import __version__, errors
from ai_worker.api import health
from ai_worker.config import Settings, get_settings
from ai_worker.core_client import CoreClient
from ai_worker.db import Database
from ai_worker.middleware import InternalTokenMiddleware, TraceparentMiddleware

#: 各能力包：导入即完成能力登记（见 [`ai_worker.capabilities`]）。
CAPABILITY_MODULES = (
    "ai_worker.rag_ingest",
    "ai_worker.agent_runtime",
    "ai_worker.providers",
)


def create_app(
    settings: Settings | None = None,
    *,
    database: Database | None = None,
    core: CoreClient | None = None,
) -> FastAPI:
    resolved = settings or get_settings()
    app = FastAPI(
        title="ai-worker",
        version=__version__,
        # 没有对外文档面：这个进程只被 core 调用，契约在 core 的 spec/internal.yaml 里。
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=None if database is not None else _lifespan,
    )
    app.state.settings = resolved
    app.state.db = database or Database(resolved)
    # 注入点是为了测试：注入 core 时连 `MockTransport` 一起进来，不必把请求真发出去。
    app.state.core = core or CoreClient(resolved)

    errors.install_error_handlers(app)
    app.include_router(health.router)
    for module in CAPABILITY_MODULES:
        imported = importlib.import_module(module)
        # 用 `getattr` 取约定名：能力包只暴露 `ROUTER` 一个路由对象，
        # 避免误拾取包内同名的其他变量。
        capability_router = getattr(imported, "ROUTER", None)
        if capability_router is not None:
            app.include_router(capability_router)

    # 顺序（后加的在外层）：内部令牌 → traceparent。令牌不对就先 401，
    # 不因为「顺带撞上 traceparent 规则」而把内部细节回给不可信的调用方。
    app.add_middleware(TraceparentMiddleware)
    app.add_middleware(InternalTokenMiddleware, token=resolved.internal_token)
    return app


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    database: Database = app.state.db
    core: CoreClient = app.state.core
    await database.start()
    try:
        yield
    finally:
        await database.close()
        await core.close()
