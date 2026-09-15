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
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES)
})

const AbortSchema = z.object({
  kind: z.literal('abort'),
  runID: z.string().min(1).max(MAX_RUN_ID_CHARS)
})

const InboundSchema = z.discriminatedUnion('kind', [StartSchema, AbortSchema])

type StartRequest = z.infer<typeof StartSchema>
type AbortRequest = z.infer<typeof AbortSchema>
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
  | { kind: 'finish'; runID: string; finishReason: string; usage: Usage }
  | { kind: 'aborted'; runID: string }
  | { kind: 'error'; runID: string; message: string }

/** `streamText().fullStream` 的片段类型（从返回值推导，不依赖其类型是否被导出） */
type StreamPart = Awaited<ReturnType<typeof streamText>>['fullStream'] extends AsyncIterable<
  infer Part
>
  ? Part
  : never

function isWithinPayloadLimit(raw: unknown): boolean {
  try {
    const encoded = JSON.stringify(raw)
    return typeof encoded === 'string' && encoded.length <= MAX_PAYLOAD_CHARS
  } catch {
    // 循环引用 / 不可序列化 → 一律拒绝
    return false
  }
}

/** 校验端口入站消息；不合规返回 null（调用方只记日志，不回显细节） */
function parseInbound(raw: unknown): InboundRequest | null {
  if (!isWithinPayloadLimit(raw)) return null

  const parsed = InboundSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

function findErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function toUsage(usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number }): Usage {
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

export { parseInbound, toPortEvent, findErrorMessage, StartSchema, AbortSchema, InboundSchema }
export type { InboundRequest, StartRequest, AbortRequest, PortEvent, StreamPart, Usage }
