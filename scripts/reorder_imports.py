from pathlib import Path
import re

ROOTS = [
    Path(r"d:\Documents\Rust\service\master\src"),
    Path(r"d:\Documents\Rust\service\master\entity\src"),
    Path(r"d:\Documents\Rust\service\master\migration\src"),
]

USE_START = re.compile(r"^(pub\s+)?use\s+")


def classify(stmt: str) -> str:
    s = stmt.lstrip()
    if s.startswith("pub use "):
        body = s[len("pub use ") :]
    else:
        body = s[len("use ") :]
    body = body.strip()
    if body.startswith(("std::", "core::", "alloc::")):
        return "std"
    if body.startswith(("crate::", "super::", "self::")):
        return "crate"
    if body.startswith("{"):
        inner = body[1:].lstrip()
        if inner.startswith(("std::", "core::", "alloc::")):
            return "std"
        if inner.startswith(("crate::", "super::", "self::")):
            return "crate"
        return "ext"
    return "ext"


def extract_uses(lines):
    i = 0
    n = len(lines)
    prefix = []
    while i < n:
        line = lines[i]
        stripped = line.strip()
        if (
            stripped.startswith("//!")
            or stripped.startswith("#![")
            or stripped.startswith("#[")
        ):
            prefix.append(line)
            i += 1
            continue
        if stripped == "":
            j = i
            while j < n and lines[j].strip() == "":
                j += 1
            if j < n and (
                USE_START.match(lines[j].strip())
                or lines[j].strip().startswith("//")
                or lines[j].strip().startswith("#![")
                or lines[j].strip().startswith("#[")
                or lines[j].strip().startswith("//!")
            ):
                prefix.append(line)
                i += 1
                continue
            break
        if stripped.startswith("//") and not stripped.startswith("///"):
            prefix.append(line)
            i += 1
            continue
        break

    uses = []
    while i < n:
        stripped = lines[i].strip()
        if stripped == "":
            i += 1
            continue
        if stripped.startswith("//") and not USE_START.match(stripped):
            j = i
            while j < n and (lines[j].strip().startswith("//") or lines[j].strip() == ""):
                j += 1
            if j < n and USE_START.match(lines[j].strip()):
                i = j
            else:
                break

        if not USE_START.match(lines[i].strip()):
            break

        buf = [lines[i]]
        while i < n and ";" not in "".join(buf):
            i += 1
            if i < n:
                buf.append(lines[i])
        i += 1
        stmt = "".join(buf)
        if not stmt.endswith("\n"):
            stmt += "\n"
        uses.append(stmt)
        while i < n and lines[i].strip() == "":
            i += 1

    rest = lines[i:]
    return prefix, uses, rest


def sort_key(stmt: str) -> str:
    return stmt.replace("pub use ", "use ").lower()


def rewrite(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    content = text.replace("\r\n", "\n")
    if not content.endswith("\n"):
        content += "\n"
    lines = content.splitlines(keepends=True)

    prefix, uses, rest = extract_uses(lines)
    if not uses:
        return False

    groups = {"std": [], "ext": [], "crate": []}
    for u in uses:
        groups[classify(u)].append(u)
    for k in groups:
        groups[k].sort(key=sort_key)

    out = []
    out.extend(prefix)
    if prefix and prefix[-1].strip() != "" and uses:
        out.append("\n")

    first_group = True
    for key in ("std", "ext", "crate"):
        g = groups[key]
        if not g:
            continue
        if not first_group:
            out.append("\n")
        first_group = False
        for stmt in g:
            out.append(stmt.rstrip("\n") + "\n")

    if rest:
        if out and out[-1].strip() != "":
            out.append("\n")
        while rest and rest[0].strip() == "":
            rest = rest[1:]
        out.extend(rest)

    new_text = "".join(out)
    old_norm = text.replace("\r\n", "\n")
    if not old_norm.endswith("\n"):
        old_norm += "\n"
    if new_text == old_norm:
        return False
    path.write_text(new_text, encoding="utf-8", newline="\n")
    return True


changed = []
for root in ROOTS:
    if not root.exists():
        continue
    for path in sorted(root.rglob("*.rs")):
        try:
            if rewrite(path):
                changed.append(
                    str(path.relative_to(Path(r"d:\Documents\Rust\service\master")))
                )
        except Exception as e:
            print("ERR", path, e)

print(f"changed {len(changed)} files")
for c in changed:
    print(c)
