"""进程入口：`ai-worker` 命令行脚本与 `python -m ai_worker` 都走这里。

`log_config=None` 是关键：否则 uvicorn 会用自带格式覆盖我们刚装好的 JSON handler，
出现两种日志格式混在同一个流里。access 日志则顺带走 root handler
（`uvicorn.access` 已改为向 root 传播）。
"""

from __future__ import annotations

import uvicorn

from ai_worker import __version__
from ai_worker.app import create_app
from ai_worker.config import get_settings
from ai_worker.logging_setup import configure_logging


def main() -> None:
    settings = get_settings()
    configure_logging(level=settings.log_level, service="ai-worker", version=__version__)
    uvicorn.run(
        create_app(settings),
        host=settings.host,
        port=settings.port,
        log_config=None,
    )


if __name__ == "__main__":
    main()
