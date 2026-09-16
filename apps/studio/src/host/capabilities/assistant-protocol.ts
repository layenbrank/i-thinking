import type { streamText } from 'ai'
import { z } from 'zod'

/**
 * 离线通路（主进程本地 provider）的端口协议。
 *
 * 官方 Electron Pattern 2：渲染进程只拿到一个 MessagePort，两个方向都走**纯数据**
 * （structured clone），主进程不暴露任何对象；provider 的 apiKey 只留在主进程。
 *
 * 方向与形状：
 * - renderer → main：`start`（一次生成）/ `abort`（取消）
 * - main → renderer：文本/推理增量、工具调用、结束、错误、已取消
 *
 * 渲染进程侧把它聚合为 assistant-ui `ChatModelAdapter` 的 content 快照
 * （见 task_plan P4：`useLocalRuntime(createIpcChatModel())`）。
 */

/** 端口消息上限（JSON 字符数）：被攻破的渲染进程不得用超大 payload 压垮主进程 */
export const MAX_PAYLOAD_CHARS = 1_000_000
/** 单次请求的对话消息数 */
export const MAX_MESSAGES = 200
/** 单条正文长度 */
export const MAX_CONTENT_CHARS = 100_000
/** 同一端口并发运行数上限 */
export const MAX_CONCURRENT_RUNS = 4
/** runID 长度上限（渲染进程生成，uuid 足够） */
const MAX_RUN_ID_CHARS = 64

const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(MAX_CONTENT_CHARS)
})

const StartSchema = z.object({
  kind: z.literal('start'),
  runID: z.string().min(1).max(MAX_RUN_ID_CHARS),
  providerID: z.string().min(1).max(MAX_RUN_ID_CHARS),
  model: z.string().min(1).max(200),
  system: z.string().max(MAX_CONTENT_CHARS).optional(),
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  /** 宿主扩展：工具集 / 审批策略 / 工作区沙箱 / 会话（变更日记） */
  host: z
    .object({
      tools: z.array(z.string().max(64)).max(32).optional(),
      approval: z.enum(['auto', 'ask', 'readonly']).optional(),
      workspaceID: z.uuid().nullish(),
      /** 当前会话：fs_write 变更日记按它归集，供「已编辑 N 个文件」撤销 */
      sessionID: z.uuid().nullish(),
      /** 本次对话引用的工作区文件（相对路径）：注入系统提示词，让模型知道该读哪些文件 */
      references: z.array(z.string().max(1024)).max(32).optional()
    })
    .optional()
})

const AbortSchema = z.object({
  kind: z.literal('abort'),
  runID: z.string().min(1).max(MAX_RUN_ID_CHARS)
})

/** 工具审批回执：渲染进程 UI 拍板后回传，主进程据此继续或拒绝 */
const ToolApprovalSchema = z.object({
  kind: z.literal('tool-approval'),
  runID: z.string().min(1).max(MAX_RUN_ID_CHARS),
  toolCallId: z.string().min(1).max(MAX_RUN_ID_CHARS),
  approved: z.boolean()
})

const InboundSchema = z.discriminatedUnion('kind', [StartSchema, AbortSchema, ToolApprovalSchema])

type StartRequest = z.infer<typeof StartSchema>
type AbortRequest = z.infer<typeof AbortSchema>
type ToolApprovalRequest = z.infer<typeof ToolApprovalSchema>
type InboundRequest = z.infer<typeof InboundSchema>

interface Usage {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}

/** main → renderer 的事件；`runID` 用于把并发运行分开 */
type PortEvent =
  | { kind: 'text'; runID: string; blockID: string; text: string }
  | { kind: 'reasoning'; runID: string; blockID: string; text: string }
  | {
      kind: 'tool-call'
      runID: string
      toolCallId: string
      toolName: string
      input: unknown
    }
  | {
      kind: 'tool-approval-request'
      runID: string
      toolCallId: string
      toolName: string
      input: unknown
      prompt: string
    }
  | {
      kind: 'tool-result'
      runID: string
      toolCallId: string
      toolName: string
      output: unknown
      isError: boolean
    }
  | { kind: 'finish'; runID: string; finishReason: string; usage: Usage }
  | { kind: 'aborted'; runID: string }
  | { kind: 'error'; runID: string; message: string }

/** `streamText().fullStream` 的片段类型（从返回值推导，不依赖其类型是否被导出） */
type StreamPart =
  Awaited<ReturnType<typeof streamText>>['fullStream'] extends AsyncIterable<infer Part>
    ? Part
    : never

function isWithinPayloadLimit(raw: unknown): boolean {
  try {
    const encoded = JSON.stringify(raw)
    return typeof encoded === 'string' && encoded.length <= MAX_PAYLOAD_CHARS
  } catch (error) {
    // 循环引用 / 不可序列化 → 一律拒绝（并且要出声，否则看起来像「消息凭空消失」）
    console.warn('[assistant-protocol] 载荷不可序列化，按超限拒绝', error)
    return false
  }
}

/** 校验端口入站消息；不合规返回 null（调用方只记日志，不回显细节） */
function parseInbound(raw: unknown): InboundRequest | null {
  if (!isWithinPayloadLimit(raw)) return null

  const parsed = InboundSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

/**
 * 已知「配置错了」的失败模式，直接把下一步改哪儿写进消息里 ——
 * 否则用户只能对着 `Not Found` 干瞪眼（Ollama 漏了 /v1 就是这个 404）。
 */
function findErrorHint(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('statusCode' in error)) return ''
  if ((error as { statusCode?: unknown }).statusCode !== 404) return ''

  return '检查 provider 的「服务地址」有没有带 /v1（Ollama：http://127.0.0.1:11434/v1）'
}

function findErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error'
  const hint = findErrorHint(error)
  return hint ? `${message}（${hint}）` : message
}

function toUsage(usage: {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
}): Usage {
  return {
    ...(usage.inputTokens === undefined ? {} : { inputTokens: usage.inputTokens }),
    ...(usage.outputTokens === undefined ? {} : { outputTokens: usage.outputTokens }),
    ...(usage.totalTokens === undefined ? {} : { totalTokens: usage.totalTokens })
  }
}

/**
 * AI SDK 流片段 → 端口事件；与本次协议无关的片段（起止标记、原始值、文件等）返回 null。
 */
function toPortEvent(part: StreamPart, runID: string): PortEvent | null {
  switch (part.type) {
    case 'text-delta':
      return { kind: 'text', runID, blockID: part.id, text: part.text }
    case 'reasoning-delta':
      return { kind: 'reasoning', runID, blockID: part.id, text: part.text }
    case 'tool-call':
      return {
        kind: 'tool-call',
        runID,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input
      }
    case 'tool-result':
      return {
        kind: 'tool-result',
        runID,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        output: part.output,
        isError: false
      }
    case 'tool-error':
      return {
        kind: 'tool-result',
        runID,
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        output: findErrorMessage(part.error),
        isError: true
      }
    case 'finish':
      return {
        kind: 'finish',
        runID,
        finishReason: part.finishReason,
        usage: toUsage(part.totalUsage)
      }
    case 'abort':
      return { kind: 'aborted', runID }
    case 'error':
      return { kind: 'error', runID, message: findErrorMessage(part.error) }
    default:
      return null
  }
}

export {
  AbortSchema,
  findErrorMessage,
  InboundSchema,
  parseInbound,
  StartSchema,
  ToolApprovalSchema,
  toPortEvent
}
export type {
  AbortRequest,
  InboundRequest,
  PortEvent,
  StartRequest,
  StreamPart,
  ToolApprovalRequest,
  Usage
}
