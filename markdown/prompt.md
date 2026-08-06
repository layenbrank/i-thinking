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
4. **不要**添加 `Co-authored-by: Cursor`、`Made-with: Cursor` 或任何 Cursor 归属 trailer。
5. client 版本升级使用 `bump:client`，以触发 client tag release 发布。
6. 仓库版本升级按既有发版流程，以触发 tag release 发布。
7. 未经明确要求：不 `push`、不改 git config、不跳过 hooks。
