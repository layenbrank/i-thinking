#!/usr/bin/env python3
"""仓库架构卫生检查：孤儿文件、模块必备文件、禁止路径。

用法: python scripts/check_architecture.py
退出码 0 = 通过；非 0 = 违规列表。
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
LIB = SRC / "lib.rs"

# 标准业务模块：四文件 + README
STANDARD_SERVICES = ("auth", "user", "engine", "application", "markdown")
# 复杂度例外：允许额外文件，但仍需四文件 + README
COMPLEX_SERVICES = {
    "upload": {
        "extra": {
            "error.rs",
            "multipart.rs",
            "repository.rs",
            "storage.rs",
            "validation.rs",
        }
    },
    "search": {"extra": {"repository.rs"}},
}

FORBIDDEN_FILES = (
    SRC / "utils" / "http.rs",
    SRC / "utils" / "response.rs",
    SRC / "middlewares" / "jwt.rs",
    SRC / "middlewares" / "response.rs",
    SRC / "services" / "shared",
)

REQUIRED_SERVICE_FILES = ("controller.rs", "module.rs", "schema.rs", "service.rs", "README.md")


def fail(msg: str, errors: list[str]) -> None:
    errors.append(msg)


def parse_lib_utils_mods(lib_text: str) -> set[str]:
    """从 lib.rs 的 `pub mod utils { ... }` 块提取子模块名。"""
    m = re.search(r"pub mod utils \{([^}]+)\}", lib_text, re.S)
    if not m:
        return set()
    return set(re.findall(r"pub mod (\w+);", m.group(1)))


def check_forbidden(errors: list[str]) -> None:
    for path in FORBIDDEN_FILES:
        if path.exists():
            fail(f"禁止存在的路径仍在仓库: {path.relative_to(ROOT)}", errors)


def check_utils_orphans(errors: list[str]) -> None:
    lib_text = LIB.read_text(encoding="utf-8")
    declared = parse_lib_utils_mods(lib_text)
    utils_dir = SRC / "utils"
    if not utils_dir.is_dir():
        return
    for path in utils_dir.iterdir():
        if path.suffix != ".rs":
            continue
        name = path.stem
        if name not in declared:
            fail(f"utils 孤儿文件未在 lib.rs 声明: utils/{path.name}", errors)


def check_services(errors: list[str]) -> None:
    services = SRC / "services"
    for name in STANDARD_SERVICES + tuple(COMPLEX_SERVICES):
        dir_path = services / name
        if not dir_path.is_dir():
            fail(f"缺少服务模块目录: services/{name}", errors)
            continue
        for req in REQUIRED_SERVICE_FILES:
            if not (dir_path / req).exists():
                fail(f"services/{name} 缺少必备文件: {req}", errors)

        allowed = set(REQUIRED_SERVICE_FILES)
        if name in COMPLEX_SERVICES:
            allowed |= COMPLEX_SERVICES[name]["extra"]
        # http/ 用例目录允许
        for path in dir_path.iterdir():
            if path.name == "http" and path.is_dir():
                continue
            if path.is_file() and path.name not in allowed and path.suffix == ".rs":
                if name in STANDARD_SERVICES:
                    fail(
                        f"services/{name} 出现非标准文件 {path.name}（标准模块仅四文件）",
                        errors,
                    )
            if path.is_file() and path.suffix == ".rs" and name in COMPLEX_SERVICES:
                if path.name not in allowed:
                    fail(
                        f"services/{name} 未登记的额外文件: {path.name}（请更新 check_architecture.py）",
                        errors,
                    )


def check_cross_cutting(errors: list[str]) -> None:
    required_dirs = {
        "middlewares": ("access_log", "cors"),
        "guards": ("auth", "blacklist", "permission", "public"),
        "filters": ("exception",),
        "interceptors": ("envelope",),
    }
    for dirname, mods in required_dirs.items():
        base = SRC / dirname
        for mod in mods:
            file_rs = base / f"{mod}.rs"
            # 允许 `foo.rs` + `foo/helper.rs`；禁止仅靠子目录 `foo/mod.rs`
            if not file_rs.exists():
                fail(f"缺少横切模块: {dirname}/{mod}.rs（勿仅用 {mod}/mod.rs）", errors)


def main() -> int:
    errors: list[str] = []
    if not LIB.exists():
        print("ERROR: src/lib.rs 不存在", file=sys.stderr)
        return 2

    check_forbidden(errors)
    check_utils_orphans(errors)
    check_services(errors)
    check_cross_cutting(errors)

    if errors:
        print("Architecture check FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("Architecture check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
