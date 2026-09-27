# ai-worker（Python / FastAPI）：core 的叶子计算服务，RAG 摄取与 agent 运行时。
#
# 构建（上下文必须是 apps/ai-worker）：
#   docker compose build ai-worker
#   docker build -t corex-ai-worker:local ../ai-worker
#
# Python 3.12 是硬约束（pyproject 的 requires-python 是 >=3.12,<3.13），
# 用官方 slim 而不是 distroless：迁移 SQL 与健康探针都要靠 shell / curl 排障。
FROM python:3.12-slim-bookworm

# uv 是唯一的依赖入口（uv.lock 是真相）。用 latest 而不是钉死版本：uv.lock 有自己的
# revision，过旧的 uv 读不了新格式，钉错版本会直接构建失败。
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# curl 只给 compose 的 healthcheck 用（/internal/v1/health）。
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH=/app/.venv/bin:$PATH

WORKDIR /app

# 依赖层先于源码层：改业务代码不会让依赖层缓存失效。
# README.md 要一起给，hatchling 构建项目元数据时会读它（readme = "README.md"）。
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

# src/ai_worker/sql/*.sql 是运行时资源（db.py 启动时 apply），必须随包进镜像。
COPY src/ ./src/
RUN uv sync --frozen --no-dev

RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8081
# console script 已由 uv sync 装进 /app/.venv/bin（见 PATH）。
CMD ["ai-worker"]
