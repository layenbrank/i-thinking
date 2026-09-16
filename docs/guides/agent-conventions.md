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

本地可用工具

corex help
Corex —— 可组合的指令与动作

Usage: corex.exe [OPTIONS] <COMMAND>

Commands:
run 按名称或文件路径运行指令
schedule 列出可用指令名
actions 列出已注册动作（按 bucket 分组）；给 id 时打印它的参数表与步骤片段
create 生成新的指令骨架（交互向导，或 -t 选模板）
edit 用 $COREX_EDITOR / $EDITOR 或系统默认程序打开指令 YAML
validate 校验指令 YAML；不给路径时校验配置
schema 输出指令 YAML 的 JSON Schema，供编辑器补全与校验
completions 打印某个 shell 的补全注册脚本（候选由 corex 现算，升级后无需重生成）
history 列出最近的执行记录
doctor 自检：数据目录、配置、守护进程、动作与指令
repl 交互式 REPL
daemon 守护进程控制
watch 文件监听 supervisor（PM2 风格）
cron cron 调度 supervisor
ui UI 元素探测（Windows UIAutomation）
update 从 GitHub Releases 自更新
help Print this message or the help of the given subcommand(s)

Options:
--dir <DIR> 指令 / 配置的搜索目录
-v, --verbose... 提高日志详细程度
--config <PATH> 使用指定配置文件，而非默认搜索路径
-h, --help Print help
-V, --version Print version

actions、ui 可以利用获取一些关键信息

可以使用corex创建指令获取所需的 Qoder 的截图和交互信息等
