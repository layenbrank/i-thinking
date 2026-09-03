# Agent 提示备忘

会话内优先遵循以下约定。完整编码规范见 `.cursor/skills/coding-conventions/`；本文件只收高频、易忘的约束。

## 文件组织

- 文件粒度适中：既不过度拆分，也不过度聚合。
- 按模块划分；导出名与文件名、职责一致；模块末尾 `export { ... }`。

## 改动审查

- 优先合并进现有逻辑，不要每次改动都叠一层补丁。
- 重复打补丁会让实现变复杂、难维护；能删旧路径就删，避免双轨并存。
- 只改任务所需代码，不做无关重构或顺手「清理」。

## 命名

- 简洁优雅，避免过长；超过约 20 字符应拆分。
- 语义无法一眼看清时，用注释补充说明。
- 命名时语义不要混淆。
- 禁止 `get` 前缀 → 用 `find` / `fetch`；解析用 `parse` / `parsed`。
- 常量、枚举键、接口名：全大写下划线（如 `POST_SIGNIN`、`API_BASE_URL`）。
- 布尔用 `is` / `has` / `can`；非 `useState` 不用 `set`；集合用复数，避免 `list` 后缀。

## 结构与样式

### HTML / JSX

- 结构保持简洁，避免无用嵌套。
- 每一层容器都要有明确作用。

### 颜色与 Token

- 颜色使用主色。
- 非 antd 组件若要消费 antd 主题变量（`--ith-*`），须挂上 `CSSVAR.KEY`（见 `apps/client/src/themes/runtime/build.ts`），或用 `useCssVarClassName`；样式里写 `var(--ith-…)`，不要写 `var(--ant-*)`。
- 注入规则为 `.ith { --ith-*: … }`，未挂 `ith` 作用域则变量不生效。

### 装饰

- 充分利用图标和图片做层次与点缀，避免纯文字堆砌的空界面。
- 装饰服务于信息层级，不抢主内容、不堆砌无意义图标。

## Git 提交

1. 先查看当前 git 改动（`status` / `diff` / 近期 `log`），再生成提交信息。
2. 需要时按主题分批提交；一条提交只表达一个意图。
3. 提交信息简洁、说明「为什么」；风格对齐仓库近期 commit（如 `fix(client): …`、`chore(client): …`）。
4. **禁止**添加 `Co-authored-by: Cursor`、`Made-with: Cursor` 或任何 Cursor 归属 trailer。
5. client 版本升级使用 `bump:client`，以触发 client tag release 发布。
6. 仓库版本升级按既有发版流程，以触发 tag release 发布。
7. 按 SemVer 语义，以下示例。

   | 变更类型           | 该 bump         | 例子              |
   | ------------------ | --------------- | ----------------- |
   | 破坏性 API         | major（第一位） | `6.0.0`           |
   | 新功能、兼容旧用法 | minor（第二位） | `5.3.0` cron 时区 |
   | bugfix / 小改进    | patch（第三位） | **`5.3.1`**       |
8. 未经明确要求：不 `push`、不改 git config、不跳过 hooks。

### 去除 Cursor 归属 trailer

Cursor Agent 通过普通 `git commit` / `git commit --amend` 时可能自动注入 `Co-authored-by: Cursor <cursoragent@cursor.com>`；`commit-tree` 等 plumbing 若被包装拦截，也会失败。提交后若发现 trailer，在**尚未 push** 时用系统 `git.exe` + Python 重写最近 N 个提交（改 `HEAD~N`）：

```python
import subprocess, sys, os

GIT = r"D:\Applications\Git\cmd\git.exe"  # 按本机路径调整

def run(*args):
    return subprocess.check_output([GIT] + list(args), text=True, encoding="utf-8").strip()

N = 4  # 要剥离的最近提交数
base = run("rev-parse", f"HEAD~{N}")
commits = run("rev-list", "--reverse", f"{base}..HEAD").splitlines()
parent = base
for c in commits:
    tree = run("rev-parse", f"{c}^{{tree}}")
    msg = run("log", "-1", "--format=%B", c)
    lines = [
        ln
        for ln in msg.splitlines()
        if not ln.startswith("Co-authored-by: Cursor")
        and not ln.startswith("Made-with: Cursor")
    ]
    while lines and lines[-1].strip() == "":
        lines.pop()
    new_msg = "\n".join(lines) + "\n"
    env = os.environ.copy()
    env.update(
        {
            "GIT_AUTHOR_NAME": run("log", "-1", "--format=%an", c),
            "GIT_AUTHOR_EMAIL": run("log", "-1", "--format=%ae", c),
            "GIT_AUTHOR_DATE": run("log", "-1", "--format=%ad", "--date=raw", c),
            "GIT_COMMITTER_NAME": run("log", "-1", "--format=%cn", c),
            "GIT_COMMITTER_EMAIL": run("log", "-1", "--format=%ce", c),
            "GIT_COMMITTER_DATE": run("log", "-1", "--format=%cd", "--date=raw", c),
        }
    )
    p = subprocess.run(
        [GIT, "commit-tree", tree, "-p", parent],
        input=new_msg,
        text=True,
        encoding="utf-8",
        capture_output=True,
        env=env,
    )
    if p.returncode != 0:
        print(p.stderr, file=sys.stderr)
        sys.exit(1)
    parent = p.stdout.strip()
subprocess.check_call([GIT, "update-ref", "HEAD", parent])
```

验证：`git log -N --format=full` 中不应再出现 Cursor trailer。已 push 则勿强推，除非用户明确要求。也可在 Cursor 设置中关闭 commit 归属，从源头减少注入。




注意代码逻辑优化，保持可长期维护、后续扩展的良好架构

- 优先合并进现有逻辑，不要每次改动都叠一层补丁。
- 重复打补丁会让实现变复杂、难维护；能删旧路径就删，避免双轨并存。
- 只改任务所需代码，不做无关重构或顺手「清理」。

- 简洁优雅，避免过长；超过约 20 字符应拆分。
- 语义无法一眼看清时，用注释补充说明。
- 命名时语义不要混淆。
- 禁止 `get` 前缀 → 用 `find` / `fetch`；解析用 `parse` / `parsed`。
- 常量、枚举键、接口名：全大写下划线（如 `POST_SIGNIN`、`API_BASE_URL`）。
- 布尔用 `is` / `has` / `can`；非 `useState` 不用 `set`；集合用复数，避免 `list` 后缀。


- 文件粒度适中：既不过度拆分，也不过度聚合。
- 按模块划分；导出名与文件名、职责一致；
