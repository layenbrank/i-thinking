"""配置：环境变量（前缀 ``AI_WORKER_``）或当前目录的 ``.env``。

令牌与数据库地址没有默认值：缺失时**启动即失败**，比带着半截配置跑起来强。
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
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

    # ── 链路追踪（OTel → OTLP/HTTP）─────────────────────────────────────────
    # 默认关闭：关闭时进程里不注册任何全局状态（见 `ai_worker.telemetry`），跨进程仍靠内置的
    # W3C 实现透传 `traceparent`（见 `ai_worker.trace`），行为与接入前完全一致。
    telemetry_enabled: bool = False
    #: OTLP/HTTP 基址，例如 `http://127.0.0.1:4318`；带路径则按原样使用，
    #: 不带路径时补上 traces 的默认路径 `/v1/traces`。
    telemetry_endpoint: str = "http://127.0.0.1:4318"
    #: 资源里的 `service.name`（core 侧是 `{service_name}-{角色}`，这边只有一个进程角色）。
    telemetry_service_name: str = "i-thinking-ai-worker"
    #: 采样比例 `0.0`–`1.0`。上游已带采样决定时跟随上游（ParentBased）。
    telemetry_sample_ratio: float = Field(default=1.0, ge=0.0, le=1.0)
    #: 单次导出超时（毫秒）。
    telemetry_timeout_ms: int = 10_000

    # 只监听内网地址：外部可达时 X-Internal-Token 就成了一把暴露在公网的共享密钥。
    host: str = "127.0.0.1"
    port: int = Field(default=DEFAULT_PORT, ge=1, le=65535)

    #: core 的 `ai_worker.token`，请求头 `X-Internal-Token` 的值。
    internal_token: str = Field(min_length=1)
    database_url: str = Field(min_length=1)
    #: core 的基址，例如 `http://127.0.0.1:3000`（core 的 `server.port`，默认 3000）；不带尾斜杠。
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

    #: 切块的部署级默认值（core 不指定 `chunkSize` 时生效）。约等于中文 500–700 字：
    #: 再小，检索会命中太多碎片；再大，一块里塞进多个主题，嵌入的语义被稀释。
    default_chunk_size: int = Field(default=1200, ge=1)
    #: 默认重叠：块大小的 1/6。留重叠是为了「答案跨在块边界上」时不至于完全丢上下文。
    default_chunk_overlap: int = Field(default=200, ge=0)

    #: 一次上游嵌入调用送多少条文本。与 core 的分批是两件事：core 按自己的批量把块集切成
    #: 幂等区间，这里只在单个区间内部再切，避免一条区间（可能上千块）压成一次超大请求。
    embed_batch_size: int = Field(default=64, ge=1)

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

    @model_validator(mode="after")
    def _validate_telemetry(self) -> Settings:
        """只在开启时校验：关着的时候不该因为一个没用的 endpoint 而启动失败。"""
        if not self.telemetry_enabled:
            return self
        endpoint = self.telemetry_endpoint.strip()
        if not endpoint.startswith(("http://", "https://")):
            message = f"AI_WORKER_TELEMETRY_ENDPOINT 必须是 http(s) 开头的 OTLP 基址：{endpoint!r}"
            raise ValueError(message)
        if self.telemetry_timeout_ms <= 0:
            message = (
                f"AI_WORKER_TELEMETRY_TIMEOUT_MS 必须大于 0，当前是 {self.telemetry_timeout_ms}"
            )
            raise ValueError(message)
        if not self.telemetry_service_name.strip():
            message = (
                "AI_WORKER_TELEMETRY_SERVICE_NAME 不能为空：service.name 是后端里找 trace 的入口"
            )
            raise ValueError(message)
        return self

    @model_validator(mode="after")
    def _require_overlap_below_size(self) -> Settings:
        """默认值自相矛盾时**启动即失败**，好过每个请求都回 400 让人去猜。"""
        if self.default_chunk_overlap >= self.default_chunk_size:
            message = (
                "AI_WORKER_DEFAULT_CHUNK_OVERLAP 必须小于 AI_WORKER_DEFAULT_CHUNK_SIZE，"
                f"当前是 {self.default_chunk_overlap} >= {self.default_chunk_size}"
            )
            raise ValueError(message)
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """进程级配置单例（读环境/`.env`，任何校验失败都会直接抛错）。"""
    return Settings()
