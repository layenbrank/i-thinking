"""配置：环境变量（前缀 ``AI_WORKER_``）或当前目录的 ``.env``。

令牌与数据库地址没有默认值：缺失时**启动即失败**，比带着半截配置跑起来强。
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

#: 契约 `spec/internal.yaml` 里 core 侧配置的默认地址（server url）。
DEFAULT_PORT = 8081
_MIB = 1024 * 1024
_SHORT_TOKEN_WARNING_LENGTH = 32
_PG_SCHEMES = ("postgres://", "postgresql://")


class Settings(BaseSettings):
    """进程配置。字段名 → 环境变量：``internal_token`` → ``AI_WORKER_INTERNAL_TOKEN``。"""

    model_config = SettingsConfigDict(
        env_prefix="AI_WORKER_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    environment: Literal["development", "test", "production"] = "development"
    log_level: str = "INFO"

    # 只监听内网地址：外部可达时 X-Internal-Token 就成了一把暴露在公网的共享密钥。
    host: str = "127.0.0.1"
    port: int = Field(default=DEFAULT_PORT, ge=1, le=65535)

    #: core 的 `ai_worker.token`，请求头 `X-Internal-Token` 的值。
    internal_token: str = Field(min_length=1)
    database_url: str = Field(min_length=1)
    #: core 的基址，例如 `http://127.0.0.1:8080`；不带尾斜杠。
    core_base_url: str = Field(min_length=1)

    core_timeout_seconds: float = Field(default=30.0, gt=0)
    #: 服务令牌提前续签的余量（秒）：避免「刚好在过期那一瞬间发出请求」。
    core_token_refresh_skew_seconds: int = Field(default=30, ge=0)
    #: 申请服务令牌时希望的有效期（秒）；None = 用 core 的默认值。
    core_service_token_ttl_seconds: int | None = Field(default=None, gt=0)
    #: 单个资产正文的大小上限（字节）。超过即判为不可重试的请求问题。
    asset_max_bytes: int = Field(default=64 * _MIB, gt=0)
    #: 幂等键在「进行中」状态停留超过多久即可被接管（秒）。
    idempotency_stale_seconds: int = Field(default=900, gt=0)

    db_pool_min_size: int = Field(default=1, ge=1)
    db_pool_max_size: int = Field(default=10, ge=1)
    db_connect_timeout_seconds: float = Field(default=5.0, gt=0)
    db_command_timeout_seconds: float = Field(default=60.0, gt=0)
    #: 数据库不可用时，两次重连尝试之间的最小间隔（秒），避免健康探针把它变成压力源。
    db_reconnect_interval_seconds: float = Field(default=5.0, ge=0)

    @field_validator("internal_token", "database_url", "core_base_url")
    @classmethod
    def _strip(cls, value: str) -> str:
        return value.strip()

    @field_validator("internal_token")
    @classmethod
    def _warn_short_token(cls, value: str) -> str:
        if len(value) < _SHORT_TOKEN_WARNING_LENGTH:
            logger.warning(
                "AI_WORKER_INTERNAL_TOKEN 只有 %d 个字符，"
                "建议至少 %d（内部共享密钥泄漏即等于内部调用权）",
                len(value),
                _SHORT_TOKEN_WARNING_LENGTH,
            )
        return value

    @field_validator("database_url")
    @classmethod
    def _require_postgres(cls, value: str) -> str:
        if not value.startswith(_PG_SCHEMES):
            message = (
                f"AI_WORKER_DATABASE_URL 必须是 postgres:// 或 postgresql:// 开头的 DSN，"
                f"当前是 {value[:16]!r}"
            )
            raise ValueError(message)
        return value

    @field_validator("core_base_url")
    @classmethod
    def _require_base_url(cls, value: str) -> str:
        trimmed = value.rstrip("/")
        if not trimmed.startswith(("http://", "https://")):
            message = f"AI_WORKER_CORE_BASE_URL 必须是 http(s) 开头的基址，当前是 {value[:16]!r}"
            raise ValueError(message)
        return trimmed

    @field_validator("log_level")
    @classmethod
    def _require_log_level(cls, value: str) -> str:
        level = value.strip().upper()
        if level not in logging.getLevelNamesMapping():
            message = f"AI_WORKER_LOG_LEVEL 不是合法的日志级别：{value!r}"
            raise ValueError(message)
        return level


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """进程级配置单例（读环境/`.env`，任何校验失败都会直接抛错）。"""
    return Settings()
