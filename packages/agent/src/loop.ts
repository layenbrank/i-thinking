/**
 * agent 循环：prompt → 模型流 → 工具调用 → 审批 → 结果回灌 → 步数上限。
 *
 * 循环只依赖 `ModelStream`（模型增量流）与可选的 `requestApproval`（审批询问），
 * 不关心供应商与工具的具体实现。产出 `SessionUpdate` 增量，是 `AgentHandle.prompt`
 * 的运行时实现（P4 由 studio 主进程桥接）。
 *
 * 增量分发（`DELTA_HANDLERS`）与审批策略（`SETTLE_ACTIONS`）都用对象映射表驱动，
 * 数据代替分支。工具结果以「助手消息 + tool part」追加进历史，交给下一轮；
 * 供应商客户端负责把这份中性历史转成各自 wire 格式（OpenAI 的 tool_calls / tool 消息）。
 */

import type { Usage, SessionUpdate } from './events'
import type { Message, ToolPart } from './message'
import type { ModelDelta, ModelStream } from './model'
import type { PermissionMode, PermissionRequest } from './permission'
import type { Provider } from './provider'
import type { Tool, ToolContext } from './tool'

/** 一次生成最多推进多少步（含工具回调），防模型在工具间无限打转 */
const MAX_AGENT_STEPS = 8

interface AgentLoopDeps {
  streamModel: ModelStream
  /** 审批询问：仅 ask 模式下写类工具询问；返回 true 放行。缺省拒绝 */
  requestApproval?: (request: PermissionRequest) => Promise<boolean>
  /** 工具执行上下文（工作区/会话），由宿主注入 */
  toolContext?: Pick<ToolContext, 'workspaceID' | 'sessionID'>
}

interface AgentRunRequest {
  provider: Provider
  /** BYOK 密钥（宿主注入，不落库） */
  apiKey?: string
  /** 模型名（provider 内） */
  model: string
  system?: string
  tools: Record<string, Tool>
  permission?: PermissionMode
  messages: Message[]
  signal?: AbortSignal
}

/** 把一次工具调用落到「助手 tool part」（含输入与输出），供下一轮历史重放 */
function toToolPart(
  toolCallId: string,
  toolName: string,
  input: unknown,
  output: unknown,
  isError: boolean
): ToolPart {
  return {
    type: 'tool',
    toolCallId,
    toolName,
    state: isError ? 'error' : 'complete',
    input,
    output
  }
}

/** 工具处置动作：放行 / 询问 / 拒绝 */
type ToolAction = 'run' | 'ask' | 'deny'

/** 写类工具在各审批策略下的处置：数据代替分支 */
const WRITE_ACTIONS: Record<PermissionMode, ToolAction> = {
  auto: 'run',
  ask: 'ask',
  readonly: 'deny'
}

/** 审批策略 → 本次工具怎么处置（只读工具恒 run） */
function decideAction(tool: Tool | undefined, permission: PermissionMode): ToolAction {
  return tool?.isWrite ? WRITE_ACTIONS[permission] : 'run'
}

/**
 * 每种动作的处置策略：ask 产出审批询问事件，run/deny 直接返回 verdict。
 * `settleAction` 统一收敛为放行(true)或拒绝文案。
 */
const SETTLE_ACTIONS: Record<
  ToolAction,
  (
    approval: AgentLoopDeps['requestApproval'],
    request: PermissionRequest
  ) => AsyncGenerator<SessionUpdate, true | string, unknown> | true | string
> = {
  run: function () {
    return true
  },
  deny: function () {
    return '权限拒绝'
  },
  ask: async function* (approval, request) {
    yield {
      kind: 'tool-approval-request',
      toolCallId: request.toolCallId,
      toolName: request.toolName,
      input: request.input,
      ...(request.prompt ? { prompt: request.prompt } : {})
    }
    const approved = approval ? await approval(request) : false
    return approved ? true : '用户拒绝'
  }
}

/** 执行处置策略：透传 ask 产出的事件，收敛成 verdict（放行 true / 拒绝文案） */
async function* settleAction(
  action: ToolAction,
  approval: AgentLoopDeps['requestApproval'],
  request: PermissionRequest
): AsyncGenerator<SessionUpdate, true | string, unknown> {
  const result = SETTLE_ACTIONS[action](approval, request)
  if (typeof result === 'object') {
    return yield* result
  }
  return result
}

/** 一步内累计的模型输出（各增量 handler 共享的可变状态） */
interface StepAccumulator {
  text: string
  reasoning: string
  toolParts: ToolPart[]
  finishReason: string
  usage: Usage | undefined
}

/** 增量 handler 运行所需的环境（工具集 / 审批 / 上下文 / 信号 / 步号） */
interface DeltaEnv {
  request: AgentRunRequest
  permission: PermissionMode
  approval: AgentLoopDeps['requestApproval']
  toolContext: AgentLoopDeps['toolContext']
  signal: AbortSignal | undefined
  step: number
}

/** 增量分发表：kind → handler。handler 产出会话事件并累积进 state */
const DELTA_HANDLERS: {
  [K in ModelDelta['kind']]: (
    delta: Extract<ModelDelta, { kind: K }>,
    state: StepAccumulator,
    env: DeltaEnv
  ) => AsyncGenerator<SessionUpdate, void, unknown> | void
} = {
  text: async function* (delta, state, env) {
    state.text += delta.text
    yield { kind: 'text', blockID: `text-${env.step}`, text: delta.text }
  },
  reasoning: async function* (delta, state, env) {
    state.reasoning += delta.text
    yield { kind: 'reasoning', blockID: `reasoning-${env.step}`, text: delta.text }
  },
  'tool-call': async function* (delta, state, env) {
    yield {
      kind: 'tool-call',
      toolCallId: delta.toolCallId,
      toolName: delta.toolName,
      input: delta.input
    }

    const tool = env.request.tools[delta.toolName]
    const permissionRequest: PermissionRequest = {
      toolCallId: delta.toolCallId,
      toolName: delta.toolName,
      input: delta.input,
      ...(tool?.description ? { prompt: tool.description } : {})
    }
    const action = decideAction(tool, env.permission)

    const verdict = yield* settleAction(action, env.approval, permissionRequest)
    if (verdict !== true) {
      state.toolParts.push(toToolPart(delta.toolCallId, delta.toolName, delta.input, verdict, true))
      yield {
        kind: 'tool-result',
        toolCallId: delta.toolCallId,
        toolName: delta.toolName,
        output: verdict,
        isError: true
      }
      return
    }

    if (!tool) {
      state.toolParts.push(toToolPart(delta.toolCallId, delta.toolName, delta.input, '未知工具', true))
      yield {
        kind: 'tool-result',
        toolCallId: delta.toolCallId,
        toolName: delta.toolName,
        output: `未知工具: ${delta.toolName}`,
        isError: true
      }
      return
    }

    try {
      const context: ToolContext = {
        ...(env.toolContext?.workspaceID !== undefined
          ? { workspaceID: env.toolContext.workspaceID }
          : {}),
        ...(env.toolContext?.sessionID !== undefined
          ? { sessionID: env.toolContext.sessionID }
          : {}),
        signal: env.signal ?? new AbortController().signal
      }
      const result = await tool.execute(delta.input, context)
      state.toolParts.push(
        toToolPart(delta.toolCallId, delta.toolName, delta.input, result.content, Boolean(result.isError))
      )
      yield {
        kind: 'tool-result',
        toolCallId: delta.toolCallId,
        toolName: delta.toolName,
        output: result.content,
        ...(result.isError ? { isError: true } : {})
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      state.toolParts.push(toToolPart(delta.toolCallId, delta.toolName, delta.input, message, true))
      yield {
        kind: 'tool-result',
        toolCallId: delta.toolCallId,
        toolName: delta.toolName,
        output: message,
        isError: true
      }
    }
  },
  finish: function (delta, state, _env) {
    state.finishReason = delta.finishReason
    state.usage = delta.usage
  }
}

async function* runAgentLoop(
  request: AgentRunRequest,
  deps: AgentLoopDeps
): AsyncIterable<SessionUpdate> {
  const { streamModel, requestApproval, toolContext } = deps
  const permission = request.permission ?? 'ask'
  const signal = request.signal
  const tools = Object.values(request.tools)

  /** 工作历史副本：每轮工具结果追加后重发 */
  const history: Message[] = request.messages.map(function (message) {
    return { ...message, parts: [...message.parts] }
  })

  for (let step = 0; step < MAX_AGENT_STEPS; step++) {
    if (signal?.aborted) {
      yield { kind: 'aborted' }
      return
    }

    const state: StepAccumulator = {
      text: '',
      reasoning: '',
      toolParts: [],
      finishReason: '',
      usage: undefined
    }
    const env: DeltaEnv = { request, permission, approval: requestApproval, toolContext, signal, step }

    const stream = streamModel.stream({
      provider: request.provider,
      apiKey: request.apiKey,
      model: request.model,
      system: request.system,
      messages: history,
      tools,
      signal
    })

    for await (const delta of stream) {
      if (signal?.aborted) {
        yield { kind: 'aborted' }
        return
      }
      // 关联联合：TS 无法通过索引把 delta 自动收窄到对应变体，单点 cast
      const events = DELTA_HANDLERS[delta.kind](delta as never, state, env)
      if (events) yield* events
    }

    // 把本轮助手输出（文本/推理 + 工具 part）追加进历史
    const assistantParts: Message['parts'] = []
    if (state.reasoning) assistantParts.push({ type: 'reasoning', text: state.reasoning })
    if (state.text) assistantParts.push({ type: 'text', text: state.text })
    for (const part of state.toolParts) assistantParts.push(part)
    if (assistantParts.length > 0) {
      history.push({ id: `assistant-${step}`, role: 'assistant', parts: assistantParts })
    }

    // 没有工具调用 = 本轮就是最终答复
    if (state.toolParts.length === 0) {
      yield {
        kind: 'finish',
        finishReason: state.finishReason || 'stop',
        usage: state.usage ?? {}
      }
      return
    }
  }

  // 步数上限：强制收束
  yield { kind: 'finish', finishReason: 'length', usage: {} }
}

export { MAX_AGENT_STEPS, runAgentLoop }
export type { AgentLoopDeps, AgentRunRequest }
