import type { PortEvent, TerminalPortEvent, Usage } from '../assistant-protocol'
import { describePermission } from './permission'

/**
 * opencode v2 事件 → studio 端口事件（`PortEvent`）的翻译层。
 *
 * 三条硬约束（v1 → v2 全变了，改这里之前先看一眼 `session.tool.*` 的字段）：
 * 1. 信封是 `{ id, type, data }`，**没有 `properties`**；
 * 2. 工具名只在 `session.tool.input.started` 里出现，`session.tool.called` 只给 `input`，
 *    `success` / `failed` 连名字都没有 ⇒ 必须自己按 callID 记住名字；
 * 3. **终态不由这里产出**。可重试错误是 `session.retry.scheduled`（step.failed 之后可能还有
 *    第二次尝试），真正的结束是 `session.execution.{succeeded,failed,interrupted}` ——
 *    那是 engine 的事。这里只吐「过程事件」，并在 `findResult()` 交出本轮的收尾信息。
 *
 * 事件处理器写成表（`HANDLERS`）：加事件 = 加一行，不改分支。
 */

/** opencode v2 事件信封里用得到的部分 */
interface OpencodeEvent {
  type?: unknown
  data?: unknown
}

interface MapperResult {
  finishReason: string
  usage: Usage
}

function toErrorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message

  const record = toRecord(error)
  if (!record) return ''

  const message = toText(record.message) || toText(record.msg)
  if (message) return message
  // 空对象序列化出来是 `{}`，对用户等于没信息，宁走「未知错误」兜底
  if (Object.keys(record).length === 0) return ''
  try {
    return JSON.stringify(record)
  } catch (error) {
    // 循环引用等不可序列化的情况一样要给出一句能看的文案，同时出声，不然只剩「未知错误」
    console.warn('[opencode] 错误对象不可序列化，按未知错误处理', error)
    return ''
  }
}

/** 网关失败信封是 HTTP 200 + `{ code, success: false, msg }`，`msg` 才是给人看的那句 */
function findFailureEnvelope(text: string): { code: string; msg: string } | null {
  const match = /"msg"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text)
  if (!match?.[1]) return null

  let msg = match[1]
  try {
    msg = JSON.parse(`"${msg}"`) as string
  } catch (error) {
    // 不是合法 JSON 转义就按原文用
    console.warn('[opencode] 网关错误码不是合法 JSON 转义，按原文处理', error)
  }
  return { code: /"code"\s*:\s*(\d+)/.exec(text)?.[1] ?? '', msg: msg.trim() }
}

/**
 * 把 opencode 抛出的错误翻成能看的文案。
 *
 * 平台网关的失败**也是 HTTP 200**，整段信封会被上游塞进错误消息里，所以要去报文里把 `msg`
 * 抠出来；不认这个形状时用户只会看到一句 `Response stream ended without a finish reason.`。
 * 信封可能嵌在更外层的 JSON 里（转义过），所以先在原文里找，再去转义后的文本里找一次。
 */
function describeOpencodeError(error: unknown): string {
  const text = toErrorText(error)
  const envelope =
    findFailureEnvelope(text) ?? findFailureEnvelope(text.replace(/\\(["\\])/g, '$1'))
  if (!envelope) return text || '未知错误'
  return envelope.code ? `${envelope.code}: ${envelope.msg}` : envelope.msg
}

interface MapperState {
  /** `${消息 id}:${序号}` → 是否已经吐过增量（用于「只补发整段」的兜底） */
  streamed: Set<string>
  /** callID → 工具名与已解析入参（`called` 到达后才两样都有） */
  calls: Map<string, { name: string; input: unknown }>
  /** 已经吐过 tool-call 的 callID */
  announced: Set<string>
  /** 已经吐过 tool-result 的 callID */
  finished: Set<string>
  finish: string
  /** 本轮累计的 token（每次 `step.*` 往里加） */
  tokens: { input: number; output: number }
}

interface MapperContext {
  runID: string
  state: MapperState
}

type Handler = (context: MapperContext, data: Record<string, unknown>) => PortEvent[]

function toRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * 工具结果的可读化：全文本内容直接拼成字符串（否则界面上会被 JSON 转义成一坨 `\n`），
 * 混了文件等非文本内容时原样交给界面。
 */
function toToolOutput(content: unknown): unknown {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return content ?? ''

  const texts: string[] = []
  for (const item of content) {
    const record = toRecord(item)
    if (record?.type === 'text' && typeof record.text === 'string') texts.push(record.text)
  }
  if (texts.length === 0 || texts.length !== content.length) return content
  return texts.join('\n')
}

/** 文本/推理块的增量：`blockID` 按「种类 + 消息 + 序号」分组，避免同序号的推理串进正文 */
function mapBlockDelta(kind: 'text' | 'reasoning', suffix: 'delta' | 'ended') {
  return function (context: MapperContext, data: Record<string, unknown>): PortEvent[] {
    const messageID = toText(data.assistantMessageID)
    const blockID = `${kind}:${messageID}:${toNumber(data.ordinal)}`
    const { state, runID } = context

    if (suffix === 'delta') {
      const text = toText(data.delta)
      if (!text) return []
      state.streamed.add(blockID)
      return [{ kind, runID, blockID, text }]
    }

    // ended 带着整段文本：增量已经发过就不重复，只认「没有增量的整段补发」
    const text = toText(data.text)
    if (!text || state.streamed.has(blockID)) return []
    state.streamed.add(blockID)
    return [{ kind, runID, blockID, text }]
  }
}

function mapToolInputStarted(context: MapperContext, data: Record<string, unknown>): PortEvent[] {
  const id = toText(data.id)
  const name = toText(data.name)
  if (!id || !name) return []
  context.state.calls.set(id, { name, input: undefined })
  return []
}

function mapToolCalled(context: MapperContext, data: Record<string, unknown>): PortEvent[] {
  const id = toText(data.id)
  if (!id) return []

  const { state, runID } = context
  const name = state.calls.get(id)?.name ?? 'unknown'
  const input = data.input ?? {}
  state.calls.set(id, { name, input })
  if (state.announced.has(id)) return []
  state.announced.add(id)
  return [{ kind: 'tool-call', runID, toolCallId: id, toolName: name, input }]
}

function mapToolResult(isError: boolean) {
  return function (context: MapperContext, data: Record<string, unknown>): PortEvent[] {
    const id = toText(data.id)
    if (!id) return []

    const { state, runID } = context
    if (state.finished.has(id)) return []
    state.finished.add(id)

    const name = state.calls.get(id)?.name ?? 'unknown'
    return [
      {
        kind: 'tool-result',
        runID,
        toolCallId: id,
        toolName: name,
        output: isError ? toText(data.error) || '工具执行失败' : toToolOutput(data.content),
        isError
      }
    ]
  }
}

/**
 * 把一步的 token 计数并进本轮合计。
 *
 * 口径 = 官方 reducer（`service-h11j9btw.js` 的 `session.step.ended/failed`）：**每一步的
 * `tokens` 都累加**，失败的那一步也算 —— 重试之后成功的步骤不会把失败那次的消耗退回来。
 * 漏掉失败步骤就是用户看到的「花了 token，用量却是 0」。
 */
function accumulateTokens(state: MapperState, data: Record<string, unknown>): void {
  const tokens = toRecord(data.tokens)
  if (!tokens) return
  state.tokens.input += toNumber(tokens.input)
  state.tokens.output += toNumber(tokens.output)
}

function mapStepEnded(context: MapperContext, data: Record<string, unknown>): PortEvent[] {
  const { state } = context
  accumulateTokens(state, data)
  const finish = toText(data.finish)
  if (finish) state.finish = finish
  return []
}

/** 权限询问：`source.id` 才是工具调用 id（`data.id` 是这次询问自己的 id） */
function mapPermissionAsked(context: MapperContext, data: Record<string, unknown>): PortEvent[] {
  const { state, runID } = context
  const requestID = toText(data.id)
  const sessionID = toText(data.sessionID)
  const source = toRecord(data.source)
  const toolCallId = toText(source?.id) || requestID
  const action = toText(data.action)
  if (!requestID || !sessionID || !action) return []

  const call = state.calls.get(toolCallId)
  return [
    {
      kind: 'tool-approval-request',
      runID,
      toolCallId,
      toolName: call?.name ?? action,
      input: call?.input ?? {},
      prompt: describePermission(action, toResources(data.resources))
    }
  ]
}

function toResources(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter(function (item): item is string {
    return typeof item === 'string'
  })
}

/**
 * `session.step.failed` / `session.retry.scheduled` 不是终态：还会重试，所以不吐事件。
 *
 * 但**要记账**：这一步花掉的 token 是真实的（官方 reducer 同样会计入），
 * 只打日志就会漏掉「重试前已经烧掉的那部分」。
 */
function mapStepFailed(context: MapperContext, data: Record<string, unknown>): PortEvent[] {
  accumulateTokens(context.state, data)
  console.warn('[opencode] 这一步失败，等待重试', context.runID, toRecord(data.error) ?? data)
  return []
}

/** 只出声不记账的那一类：重试还没排上（`retry.scheduled` 本身不带 tokens） */
function logRetry(context: MapperContext, data: Record<string, unknown>): PortEvent[] {
  console.warn('[opencode] 等待重试', context.runID, toRecord(data.error) ?? data)
  return []
}

const HANDLERS: Record<string, Handler> = {
  'session.text.delta': mapBlockDelta('text', 'delta'),
  'session.text.ended': mapBlockDelta('text', 'ended'),
  'session.reasoning.delta': mapBlockDelta('reasoning', 'delta'),
  'session.reasoning.ended': mapBlockDelta('reasoning', 'ended'),
  'session.tool.input.started': mapToolInputStarted,
  'session.tool.called': mapToolCalled,
  'session.tool.success': mapToolResult(false),
  'session.tool.failed': mapToolResult(true),
  'session.step.ended': mapStepEnded,
  'session.step.failed': mapStepFailed,
  'session.retry.scheduled': logRetry,
  'permission.asked': mapPermissionAsked
}

interface EventMapper {
  map(event: OpencodeEvent): PortEvent[]
  findResult(): MapperResult
  /**
   * 终态事件补上本轮用量。
   *
   * `finish` 自带（`findResult()`）；`aborted` / `error` 是引擎按「用户取消 / 上游报错」造的，
   * 事件里没有用量，但这一轮已经烧掉的 token 是真实的 —— 统一在这里补，引擎那几处终态出口
   * 就不必各自记着带用量，也就不会有漏网的一处。
   */
  withUsage(event: TerminalPortEvent): TerminalPortEvent
}

function createEventMapper(runID: string): EventMapper {
  const state: MapperState = {
    streamed: new Set(),
    calls: new Map(),
    announced: new Set(),
    finished: new Set(),
    finish: '',
    tokens: { input: 0, output: 0 }
  }
  const context: MapperContext = { runID, state }

  function findUsage(): Usage {
    return {
      inputTokens: state.tokens.input,
      outputTokens: state.tokens.output,
      totalTokens: state.tokens.input + state.tokens.output
    }
  }

  return {
    map(event) {
      const data = toRecord(event.data)
      if (!data) return []
      const handler = typeof event.type === 'string' ? HANDLERS[event.type] : undefined
      return handler ? handler(context, data) : []
    },
    findResult() {
      return { finishReason: state.finish || 'stop', usage: findUsage() }
    },
    withUsage(event) {
      if (event.kind !== 'aborted' && event.kind !== 'error') return event
      return { ...event, usage: findUsage() }
    }
  }
}

export { createEventMapper, describeOpencodeError }
export type { EventMapper, MapperResult, OpencodeEvent }
