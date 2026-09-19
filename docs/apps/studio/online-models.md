# 在线模型接入 + agent 平台化 调研

> 关联实施计划：`C:\Users\MACHENIKE\.qoder-cn\plans\solemn-shore-quail.md`
>
> ⚠️ 本文基于 opencode v2 公开架构与文档目录结构整理；**文档原文因实施时网络受限未能联网核对**，
> 标注「待核实」处需在 P1 前对照 `https://opencode.ai/v2/docs/**` 钉死。

## 1. 目标

为 `apps/studio`（Electron 客户端）、`corex`（Rust 工具运行时）、`service`（Rust 后端）补齐企业级在线模型接入：

1. **BYOK 云供应商**：OpenAI / Anthropic / DeepSeek / Qwen / 智谱，密钥托管、流式、模型列表。
2. **托管网关**：Rust `service` 提供托管模型 + 企业管控。

已确认边界：agent 运行时 = TS + Effect（内嵌 studio 主进程）；corex = MCP 工具提供者；后端统一在 Rust `service`；全套对齐 opencode v2；禁用 ACP v1（`@agentclientprotocol/sdk@1.3.0` + goose WSS）。

## 2. opencode v2 架构映射

| opencode v2 文档 | 内容 | 本项目落点 |
| --- | --- | --- |
| `/build/sdk/effect/` | Effect 版 SDK：Agent / AgentHandle / Tool | `packages/agent` 核心 |
| `/build/client/effect/` | Effect 版程序化客户端 | 渲染↔主进程桥 / 测试 |
| `/build/plugins/effect/` + `/build/plugins/rpc/` | 插件系统 + RPC | `packages/agent` 插件层 |
| `/providers/` | 模型供应商注册表 | 在线模型 BYOK |
| `/tools/`、`/mcp-servers/` | 工具 + local/remote MCP | 内置工具 + corex-mcp |
| `/permissions/`、`/skills/`、`/attachments/`、`/references/` | 权限/技能/附件/引用 | agent 能力面 |
| `/cli/acp/`、`/api` | ACP server + HTTP API | agent 对外暴露 + service 网关 |

Effect 在 agent 运行时里承担：依赖注入（Provider/Config 作环境）、类型化错误、资源生命周期（MCP 连接）、并发流。

## 3. ACP v2 协议面（`/cli/acp/`）

- 传输：stdio（JSON-RPC 2.0）为主，HTTP/SSE 用于远程。
- client→agent：`initialize`（protocolVersion / capabilities / authMethods）、`authenticate`、`session/new`、`session/load`、`session/prompt`、`session/set_mode` / `set_model`、`session/request_permission`。
- agent→client：`session/update`（`user_message_chunk` / `agent_message_chunk` / `agent_thought_chunk` / `tool_call` / `tool_call_update` / `plan` / `current_model_update` / `available_models_update`）。
- 可选：`fs/read_text_file` / `write_text_file`、`terminal/*`（client 声明 capability 后 agent 回调）。

> 待核实：方法名与 `session/update` 具体字段以 opencode v2 文档原文为准。

## 4. 竞品对比

| 维度 | Cursor | VS Code GitHub Copilot | Qoder CN（本产品） |
| --- | --- | --- | --- |
| 模型接入 | 订阅模型 + BYOK（自带 Key，应用内加密） | GitHub OAuth，多模型（GPT/Claude/Gemini）；企业 BYOK（Azure OpenAI） | `online` 走 Thinking 服务 + JWT；`offline` 本地 provider |
| 密钥 | 本地加密存储 | GitHub 托管（个人）/ 企业集中（BYOK） | 现无云端密钥管理 |
| 企业 | SSO、组织模型开关、用量分析、审计 | SSO/SCIM、组织策略、审计、IP 保障 | 缺（本次补齐） |

结论：三家共同点是**自带 Key 云供应商 + 组织级模型白名单 + 用量/审计 + SSO**。

> 待核实：各家具体参数（上下文窗口、定价、白名单粒度）联网恢复后补全。

## 5. 版本钉定（待核实）

| 依赖 | 现状 | 待办 |
| --- | --- | --- |
| `effect`（+ `@effect/schema`） | 未进 catalog | P1 前联网查最新稳定版，加入 `pnpm-workspace.yaml` catalog |
| ACP TS SDK | 仓库仅有 v1 `@agentclientprotocol/sdk@1.3.0`（禁用） | 确认 v2 SDK（或按 spec 手写 JSON-RPC） |
| Rust ACP / MCP crate | corex 用 `rmcp` 3.4 | P2 复核 rmcp 是否够用或需 ACP crate |

## 6. 当前产物

`packages/agent`（P0 骨架 + 契约，纯 TS 类型，环境无关）：

- `provider.ts` — ModelID / Provider / Model / ProviderKind / PROVIDER_PRESETS
- `message.ts` — Role / Message / Part（text|image|file|reasoning|tool）
- `tool.ts` — JsonSchema / Tool / ToolResult / ToolContext
- `permission.ts` — PermissionDecision / PermissionMode / PermissionRequest / PermissionReply
- `events.ts` — SessionUpdate（对齐 ACP session/update）
- `agent.ts` — AgentDefinition / PromptInput / SessionState / AgentHandle
- `skill.ts` — Skill / Attachment / Reference

P1 起把 `AgentHandle.prompt` / `Tool.execute` 落到 Effect 运行时，并接入在线模型 provider 的实际请求。
