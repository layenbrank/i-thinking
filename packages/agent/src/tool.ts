/**
 * 工具契约。参数用 JSON Schema（对齐 opencode v2 `/tools/` 与 MCP 的 inputSchema），
 * 执行在 P1 由 Effect 运行时包装；此处只声明形状。
 */

type JsonSchema = Record<string, unknown>

interface ToolResult {
  /** 给模型看的输出（文本或结构化） */
  content: string
  /** 是否执行失败 */
  isError?: boolean
}

interface ToolContext {
  /** 工作区沙箱根（由宿主注入） */
  workspaceID?: string | null
  /** 当前会话 id（fs_write 变更日记归集用） */
  sessionID?: string | null
  /** 中止信号（取消工具执行） */
  signal: AbortSignal
}

/**
 * 工具：name/description/parameters 是「模型怎么调」的契约，
 * execute 是「宿主怎么执行」的实现（P1 起签名改为 Effect）。
 */
interface Tool<Input = unknown> {
  name: string
  description: string
  parameters: JsonSchema
  /** 是否写类（fs_write / shell.run 等）。审批策略据此决定询问/拒绝；缺省视为只读 */
  isWrite?: boolean
  execute: (input: Input, context: ToolContext) => Promise<ToolResult>
}

export type { JsonSchema, Tool, ToolContext, ToolResult }
