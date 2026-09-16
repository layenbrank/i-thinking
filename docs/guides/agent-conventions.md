# Agent 提示备忘

会话内优先遵循以下约定。完整编码规范见 `.cursor/skills/coding-conventions/`；本文件只收高频、易忘的约束。

## 文件组织

- 文件粒度适中：既不过度拆分，也不过度聚合。
- 按模块划分；导出名与文件名、职责一致；模块末尾 `export { ... }`。

## 改动审查

- 优先合并进现有逻辑，不要每次改动都叠一层补丁。
- 重复打补丁会让实现变复杂、难维护；能删旧路径就删，避免双轨并存。
- 只改任务所需代码，不做无关重构或顺手「清理」。
- 实现优先保证**可长期维护、易扩展**：结构清晰、职责单一，后续改动能落在局部。
- 整段算法/行为需按场景整体替换时，用**设计模式** **策略模式**拆出可互换的策略，便于扩展与复用。
- 单纯按输入取值/取处理器的逻辑判断，用**对象映射**表驱动实现，让数据代替分支。

## 架构

- IPC 是**契约单一事实源**：新增或修改一个频道要同时动 `shared/ipc/{channels,specs,api}`、
  `host/ipc/handlers`、`preload.ts` —— **缺一处就编译不过**（这套断言是刻意设计的，不要绕过）。
  完整规范见 [ipc-contract.md](../apps/studio/ipc-contract.md)。

## 命名

- 简洁优雅，避免过长；超过约 20 字符应拆分。
- 语义无法一眼看清时，用注释补充说明。
- 命名时语义不要混淆。
- 禁止 `get` 前缀 → 用 `find` / `fetch`；解析用 `parse` / `parsed`。
- 常量、枚举键、API 名：全大写下划线（如 `POST_SIGNIN`、`API_BASE_URL`）。
- 接口与类型：PascalCase（如 `ChannelSpec`、`IpcFailure`），不用下划线。
- 布尔用 `is` / `has` / `can`；非 `useState` 不用 `set`；集合用复数，避免 `list` 后缀。
- 根据命名空间、模块命名空间，可做极致精简命名

## 结构与样式

### HTML / JSX

- 结构保持简洁，避免无用嵌套。
- 每一层容器都要有明确作用。

### UI 组件来源（按应用区分）

各应用 UI 栈不同，**不要跨应用套用约定**：

| 应用             | UI 栈                                           |
| ---------------- | ----------------------------------------------- |
| `apps/studio`    | shadcn/ui + Tailwind v4（`@i-thinking/design`） |
| `apps/extension` | 同上                                            |
| `apps/client`    | **antd**（尚未迁移）                            |
| `apps/devtools`  | 纯 Vue 3，无组件库                              |

### shadcn（studio / extension）

- 组件一律从 `@i-thinking/design/{components,assistant}/*` 引入；**不要手写 `<button>` / `<dialog>`，也不要在 app 内造一次性组件**
- 设计 token 唯一源：`packages/design/src/styles/globals.css`；**app 侧不得另定义同名变量**
- 用语义 token 的工具类（`bg-primary`、`text-muted-foreground`）；不写硬编码色值，不用任意值（`bg-[#4080ff]`）
- 新增组件走 registry：`pnpm --filter @i-thinking/design registry:add <items>`

### antd（仅 `apps/client`）

- 颜色使用主色；消费主题变量（`--ith-*`）须挂 `CSSVAR.KEY`（见 `apps/client/src/themes/runtime/build.ts`），或用 `useCssVarClassName`；样式里写 `var(--ith-…)`，**不要写 `var(--ant-*)`**
- 注入规则为 `.ith { --ith-*: … }`，未挂 `ith` 作用域则变量不生效
- 设计稿的样式仅参考，不必原样照抄；实现时注意布局工整、对齐

### 装饰

- 充分利用图标和图片做层次与点缀，避免纯文字堆砌的空界面。
- 装饰服务于信息层级，不抢主内容、不堆砌无意义图标。

## Git 提交

1. 先查看当前 git 改动（`status` / `diff` / 近期 `log`），再生成提交信息。
2. 需要时按主题分批提交；一条提交只表达一个意图。
3. 提交信息简洁、说明「为什么」；风格对齐仓库近期 commit（如 `fix(……): …`、`chore(): …`）。
4. client 版本升级使用 `bump:client`，以触发 client tag release 发布。
5. 仓库版本升级按既有发版流程，以触发 tag release 发布。
6. 未经明确要求：不 `push`、不改 git config、不跳过 hooks。
7. **按文件逐个 `git add`**，不要 `git add <目录>` 或 `git add .` —— 工作树里常有未提交的 WIP，
   宽泛 add 会把它一起夹带进提交。commit 前用 `git diff --cached --name-only` 复核一遍。

## 本地工具（corex）

需要桌面 UI 证据（对照 Qoder、验收 Studio 窗口）时用 **corex**，不要臆测界面。完整 CLI：`corex help` / `corex help <cmd>`；动作参数以 `corex actions <id>` 为准。

### 推荐流程

1. **查能力**：`corex actions --bucket ui`（另有 `data` / `system`）；给 id 看参数表。
2. **找窗口**：`corex ui window list`，按标题过滤（如 `Qoder`、`i thinking`）。
3. **写指令 YAML**（可复用的放 `apps/studio/scripts/corex/`）→ `corex validate <path>` → `corex run <path>`。
4. **读产物**：截图 / OCR 等落在 `.tmp-*`（如 `apps/studio/scripts/.tmp-*-captures/`）；用 Read 打开后再改代码。**只提交指令 YAML，不提交 `.tmp-*` 产物。**

典型步骤链：`ui.window.focus`（`title_contains` + `prefer_largest`）→ `ui.wait` → `capture.screenshot`；需要时再加 `ui.click`、`capture.crop`、`capture.ocr`。

### 踩坑（会话实操）

- **Electron / Chromium 的 UIA 几乎只有标题栏**（最小化 / 最大化 / 关闭），React 内容树进不了 `ui element tree` —— UI 验收以截图为主，不要死磕控件树。
- PowerShell 下不要用 bash heredoc；用文件写入 YAML，路径写成正斜杠（`d:/.../out.png`）。
- 先 `corex actions capture.screenshot`（及 focus / click / crop / ocr）确认参数，再写 YAML，避免跑通后才发现字段名不对。
