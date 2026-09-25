import { z } from 'zod'

import { AGENT_APPROVAL_MODES } from '../../shared/agent-tools'

/**
 * 模型运行端口的协议（主进程侧）。
 *
 * 官方 Electron Pattern 2：渲染进程只拿到一个 MessagePort，两个方向都走**纯数据**
 * （structured clone），主进程不暴露任何对象；BYOK 的 apiKey 只留在主进程。
 *
 * 方向与形状：
 * - renderer → main：`start`（一次生成）/ `abort`（取消）/ `tool-approval`（审批回执）
 * - main → renderer：文本/推理增量、工具调用、审批请求、工具结果、终态
 *
 * **这一层是引擎无关的**：主进程背后是内嵌的 opencode server，但协议里出现的概念
 * （增量、工具调用、审批、终态）都是通用形状，渲染层不需要知道是谁在跑。
 */

/** 主进程这一侧的日志接口；只要求用到的两个级别，便于测试注入假 logger */
interface Log {
  info: (message: string) => void
  warn: (message: string, error?: unknown) => void
}

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
/** 平台令牌长度上限（JWT 通常 <2KB，留足余量又不至于让 payload 被滥用） */
const MAX_TOKEN_CHARS = 4096

/** 校验失败时最多列出几条字段问题：够定位就行，别把一条日志撑成一篇报告 */
const MAX_ISSUE_LINES = 8

/** 单张图片 data URL 上限：再大就会顶破整包 payload */
const MAX_IMAGE_CHARS = 700_000
const MAX_IMAGES = 4
/** 消息里引用的工作区文件（相对路径）：与 `opencode/session.ts` 的上限保持一致 */
export const MAX_ATTACHMENTS = 32
export const MAX_ATTACHMENT_CHARS = 1024

const ImageSchema = z.object({
  mediaType: z.string().min(1).max(128),
  data: z.string().min(1).max(MAX_IMAGE_CHARS)
})

const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(MAX_CONTENT_CHARS),
  /** 只有用户消息会带图片；纯文本消息省略这个字段 */
  images: z.array(ImageSchema).max(MAX_IMAGES).optional(),
  /**
   * 本次用户消息引用的工作区文件（**相对路径**）：直接变成 opencode prompt 的附件，
   * 由服务端自己去读（内容不进 payload，也就不会因为拖进大文件而顶爆上限）。
   */
  attachments: z.array(z.string().min(1).max(MAX_ATTACHMENT_CHARS)).max(MAX_ATTACHMENTS).optional()
})

const StartSchema = z.object({
  kind: z.literal('start'),
  runID: z.string().min(1).max(MAX_RUN_ID_CHARS),
  providerID: z.string().min(1).max(MAX_RUN_ID_CHARS),
  model: z.string().min(1).max(200),
  messages: z.array(MessageSchema).min(1).max(MAX_MESSAGES),
  /** 宿主扩展：模型能力 / 审批策略 / 工作区沙箱 / 会话（变更日记） */
  host: z
    .object({
      /**
       * 当前模型支不支持工具调用。不支持时引擎走聊天档（`studio-chat`，一个工具都不给）——
       * 档位判断只在引擎里做一次，渲染层只报事实。
       */
      supportsTools: z.boolean().optional(),
      approval: z.enum(AGENT_APPROVAL_MODES).optional(),
      workspaceID: z.uuid().nullish(),
      /** 当前会话（studio 线程 id）：它是「studio 会话 → opencode 会话」映射的键 */
      sessionID: z.uuid().nullish(),
      /**
       * 平台网关的登录令牌（JWT）。`kind === 'gateway'` 的 provider 用它当 apiKey。
       *
       * 令牌只存在渲染进程 localStorage，主进程读不到，所以每次请求由渲染进程带上；
       * 主进程不做校验，只透传给网关（网关自己验签）。
       */
      platformToken: z.string().min(1).max(MAX_TOKEN_CHARS).optional(),
      /**
       * 当前租户 id：网关按它决定配额归属（`X-Tenant-ID`），订阅档位只对个人租户生效。
       *
       * 不带 = 服务端按用户归属兜底（不会算错账，只是订阅档位用不上）。同 `platformToken`
       * 一样由渲染进程带来：租户要靠登录令牌现查，只有渲染进程有令牌。
       */
      tenantID: z.uuid().optional()
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

/**
 * 收件结果：合规就交出请求，不合规就交付「该回的那条终态」（`null` = 这次不必回话）。
 * 中间状态（既没收下、又不知道该说什么）在类型上就不存在，调用方不必再猜。
 */
type InboundOutcome =
  | { kind: 'ok'; request: InboundRequest }
  | { kind: 'rejected'; event: Extract<PortEvent, { kind: 'error' }> | null }

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
  | {
      kind: 'tool-approval-failed'
      runID: string
      toolCallId: string
      message: string
    }
  | { kind: 'finish'; runID: string; finishReason: string; usage: Usage }
  /** 取消 / 被取代：这一轮已经烧掉的 token 仍然要报（取不到时省略） */
  | { kind: 'aborted'; runID: string; usage?: Usage }
  /** 失败同样带用量（重试过的步骤也花过 token）；取不到时省略 */
  | { kind: 'error'; runID: string; message: string; usage?: Usage }

/**
 * 终态事件：一次运行的收尾，**只有这三种**。
 *
 * 单独标出来是为了让「结算」这条路在类型上闭紧：终态要落用量账本，而用量只有这三种事件带，
 * 写成 `PortEvent` 的话每个出口都要再判一次 kind。
 */
type TerminalPortEvent = Extract<PortEvent, { kind: 'finish' | 'aborted' | 'error' }>

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

/** 撞上三个上限时的话：把上限都写出来，用户才知道该砍哪儿 */
const LIMIT_MESSAGE =
  `请求被拒绝：单次对话最多 ${MAX_MESSAGES} 条、单条正文最多 ${MAX_CONTENT_CHARS} 字符、` +
  `整包最多 ${MAX_PAYLOAD_CHARS} 字符；请新开会话继续`

/**
 * 形状不合规（缺字段 / 类型不对）时的话。
 *
 * 这种情况**不是**用户的内容太长，而是渲染进程与主进程对协议的理解不一致（热更只换了
 * 一边、旧构建产物还在跑）。此时说「请新开会话继续」是纯粹的误导：换个会话照样发不出去。
 */
const SHAPE_MESSAGE =
  '请求被拒绝：消息格式不符合协议（客户端与主进程版本可能不一致），请重启应用后再试'

/**
 * 校验没通过时挑一句最贴切的文案。
 *
 * 只有**全部**问题都出在长度上，才是在说「内容太长」；只要掺进一条结构问题
 * （缺字段、类型不对），就更可能是两端版本对不上 —— 那时劝人换会话是白跑一趟。
 */
function findRejectMessage(issues: { code: string }[]): string {
  const isAllTooBig = issues.length > 0 && issues.every((issue) => issue.code === 'too_big')
  return isAllTooBig ? LIMIT_MESSAGE : SHAPE_MESSAGE
}

/** 把 zod 的 `issues` 压成一行：字段路径 + 原因，方便一眼看出是哪个字段对不上 */
function formatIssues(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues
    .slice(0, MAX_ISSUE_LINES)
    .map((issue) => {
      const path = issue.path.map(String).join('.')
      return `${path || 'payload'}: ${issue.message}`
    })
    .join('; ')
}

/**
 * 被拒时要回给渲染进程的终态；不必回话则返回 null。
 *
 * **只有 `start` 需要回话**：渲染进程发出 `start` 后挂在 `for await` 等终态，主进程沉默
 * 就等于这次运行永远不结束（界面一直转圈，看起来像「消息凭空消失」）。`abort` /
 * `tool-approval` 是单向的，渲染进程不等回话，回过去反而会多出一个错误事件。
 *
 * runID 从**被拒的原始载荷**里尽力捞（校验没通过，取不到就真的只能沉默）。
 */
function answerRejection(
  raw: unknown,
  message: string
): Extract<PortEvent, { kind: 'error' }> | null {
  if (typeof raw !== 'object' || raw === null) return null

  const record = raw as { kind?: unknown; runID?: unknown }
  if (record.kind !== 'start') return null
  if (typeof record.runID !== 'string') return null
  if (record.runID.length === 0 || record.runID.length > MAX_RUN_ID_CHARS) return null

  return { kind: 'error', runID: record.runID, message }
}

/**
 * 端口入站消息的收件口：**校验只做一遍**，拒收时连「该回什么话」一起算好。
 *
 * 校验和回话本来是一件事的两半：分开写就得把 zod 的 issues 从一边传到另一边（或者重跑
 * 一遍解析），而「该说什么」恰恰取决于失败在哪 —— 长度超限和形状不对要给的出路完全不同。
 */
function receiveInbound(raw: unknown): InboundOutcome {
  if (!isWithinPayloadLimit(raw)) {
    console.warn(`[assistant-protocol] 载荷超过 ${MAX_PAYLOAD_CHARS} 字符，已拒绝`)
    return { kind: 'rejected', event: answerRejection(raw, LIMIT_MESSAGE) }
  }

  const parsed = InboundSchema.safeParse(raw)
  if (parsed.success) return { kind: 'ok', request: parsed.data }

  // 拒收必须留下字段路径：这是「界面只回一句被拒绝」时唯一能定位的线索
  const issues = parsed.error.issues
  console.warn(`[assistant-protocol] 入站消息不合规：${formatIssues(issues)}`)

  return { kind: 'rejected', event: answerRejection(raw, findRejectMessage(issues)) }
}

/**
 * 已知「配置错了」的失败模式，直接把下一步改哪儿写进消息里 ——
 * 否则用户只能对着 `Not Found` 干瞪眼（Ollama 漏了 /v1 就是这个 404）。
 */
function findErrorHint(error: unknown, message: string): string {
  // 平台配额触顶（service 的 `QUOTA_EXCEEDED = 400006`）：上游只回一句文案，
  // 得让用户知道去哪儿解决，不然看起来就跟「模型坏了」一样。
  if (message.includes('400006') || message.includes('配额已用尽')) {
    return '今日额度已用尽：可在「设置 → 额度」订阅更高档位，或等配额重置'
  }

  if (toStatusCode(error) !== 404) return ''
  return '检查 provider 的「服务地址」有没有带 /v1（Ollama：http://127.0.0.1:11434/v1）'
}

/** HTTP 状态码：v2 的结构化错误用 `status`，旧路径的 Error 上挂在 `statusCode` */
function toStatusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null
  const record = error as { status?: unknown; statusCode?: unknown }
  if (typeof record.status === 'number') return record.status
  return typeof record.statusCode === 'number' ? record.statusCode : null
}

/** 消息正文：Error / 字符串 / v2 的结构化错误对象（`{type, message, status}`）都要能取到 */
function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  const message =
    typeof error === 'object' && error !== null
      ? (error as { message?: unknown }).message
      : undefined
  return typeof message === 'string' && message ? message : 'Unknown error'
}

function findErrorMessage(error: unknown): string {
  const message = toErrorMessage(error)
  const hint = findErrorHint(error, message)
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

export {
  AbortSchema,
  findErrorMessage,
  InboundSchema,
  receiveInbound,
  StartSchema,
  ToolApprovalSchema,
  toUsage
}
export type {
  AbortRequest,
  InboundOutcome,
  InboundRequest,
  Log,
  PortEvent,
  StartRequest,
  TerminalPortEvent,
  ToolApprovalRequest,
  Usage
}
