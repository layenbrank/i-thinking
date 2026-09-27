"""`POST /internal/v1/assets/{assetID}/chunks` 的请求/响应模型。

字段名直接抄契约 `spec/internal.yaml`（camelCase，别名而不是 `alias_generator`：
契约里是 `tenantID` / `chunkSetID`，通用的驼峰转换会生成 `tenantId`，对不上）。

`extra="forbid"` 是刻意的：core 与这里的契约是一对一编译期生成的，多出来的字段只可能是
**版本不一致**，静默忽略会让这种不一致一直藏到线上。未知字段 → 400。
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

_CONTRACT = ConfigDict(extra="forbid", populate_by_name=True)


class ChunkRequest(BaseModel):
    """契约 `ChunkRequest`。`chunkSize`/`chunkOverlap` 缺省时用服务端默认值。"""

    model_config = _CONTRACT

    schema_version: Literal[1] = Field(alias="schemaVersion")
    tenant_id: str = Field(alias="tenantID", min_length=1)
    mime: str = Field(min_length=1)
    name: str | None = None
    chunk_size: int | None = Field(default=None, alias="chunkSize", ge=1)
    chunk_overlap: int | None = Field(default=None, alias="chunkOverlap", ge=0)


class ChunkResponse(BaseModel):
    """契约 `ChunkResponse`。`textSha` 是可选的，这里总是带上以便审计。"""

    model_config = _CONTRACT

    chunk_set_id: UUID = Field(alias="chunkSetID", serialization_alias="chunkSetID")
    chunk_count: int = Field(alias="chunkCount", serialization_alias="chunkCount", ge=0)
    text_sha: str | None = Field(default=None, alias="textSha", serialization_alias="textSha")

    @classmethod
    def from_parts(cls, *, chunk_set_id: UUID, chunk_count: int, text_sha: str) -> ChunkResponse:
        """按**属性名**构造。

        不直接用关键字构造是因为 pydantic 的 mypy 插件按**别名**校验构造参数
        （`ChunkResponse(chunkSetID=...)` 才是它眼里的合法写法），这里绕开这个偏差。
        """
        return cls.model_validate(
            {"chunk_set_id": chunk_set_id, "chunk_count": chunk_count, "text_sha": text_sha}
        )

    def wire(self) -> dict[str, object]:
        """按契约字段名导出（字段上的 `serialization_alias` 就是契约名）。

        `mode="json"` 不是可选项：`chunk_set_id` 是 UUID 对象，`JSONResponse` 用的是
        不带 `default=` 的 `json.dumps`，直接送进去会在渲染响应时炸成 500。
        """
        return self.model_dump(by_alias=True, mode="json")
