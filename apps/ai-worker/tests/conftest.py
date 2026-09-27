"""测试夹具。

两套应用：`app` 带真实数据库（需要本地 pgvector 容器，否则整组 skip），
`offline_app` 带一个连不上的数据库——中间件、降级、错误码这些不需要库的用例都在它上面跑。
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from ai_worker.app import create_app
from ai_worker.config import Settings
from ai_worker.core_client import CoreClient
from ai_worker.db import Database
from routes import router
from support import UNREACHABLE_DATABASE_URL, MakeCore, make_settings


@pytest.fixture(scope="session")
def settings() -> Settings:
    return make_settings()


@pytest_asyncio.fixture
async def database(settings: Settings) -> AsyncIterator[Database]:
    db = Database(settings)
    await db.start()
    try:
        if not db.started:
            pytest.skip(f"测试数据库不可用，先起 pgvector 容器：{db.last_error}")
        probe = await db.probe()
        if not probe.ok:
            pytest.skip(f"测试数据库不可用：{probe.detail}")
        async with db.acquire() as conn:
            await conn.execute("DELETE FROM idempotency_key")
        yield db
    finally:
        await db.close()


@pytest_asyncio.fixture
async def app(settings: Settings, database: Database) -> AsyncIterator[FastAPI]:
    application = create_app(settings, database=database)
    application.include_router(router)
    yield application


@pytest_asyncio.fixture
async def offline_app() -> AsyncIterator[FastAPI]:
    settings = make_settings(
        database_url=UNREACHABLE_DATABASE_URL,
        db_command_timeout_seconds=0.5,
        # 探针节流设大一点：连不上时的重试日志没必要刷满测试输出。
        db_reconnect_interval_seconds=30.0,
    )
    application = create_app(settings, database=Database(settings))
    application.include_router(router)
    yield application


@pytest_asyncio.fixture
async def bare_app(settings: Settings) -> FastAPI:
    """不含测试路由的应用：路由面断言必须只看真实路由。"""
    return create_app(settings, database=Database(settings))


@pytest_asyncio.fixture
async def client(app: FastAPI) -> AsyncIterator[AsyncClient]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://ai-worker.test") as c:
        yield c


@pytest_asyncio.fixture
async def offline_client(offline_app: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=offline_app)
    async with AsyncClient(transport=transport, base_url="http://ai-worker.test") as c:
        yield c


@pytest_asyncio.fixture
async def make_core() -> AsyncIterator[MakeCore]:
    """用 `httpx.MockTransport` 造 CoreClient，并在用例结束后统一关掉连接。"""
    created: list[CoreClient] = []

    def factory(
        handler: Callable[[httpx.Request], httpx.Response], **overrides: object
    ) -> CoreClient:
        client = CoreClient(make_settings(**overrides), transport=httpx.MockTransport(handler))
        created.append(client)
        return client

    yield factory
    for client in created:
        await client.close()
