import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { stepCountIs, streamText, type ModelMessage } from 'ai'
import { and, asc, eq } from 'drizzle-orm'
import {
  MessageChannelMain,
  safeStorage,
  type MessagePortMain,
  type WebContents,
  type WebFrameMain
} from 'electron'
import Store from 'electron-store'

import { workspaceFolder } from '../../../drizzle/schema'
import { AGENT_TOOL_LABELS, isApprovalFreeTool } from '../../shared/agent-tools'
import { CHANNELS } from '../../shared/ipc/channels'
import { buildAgentTools, pickAgentTools } from './agent-tools'
import { createApprovalTicket, type ApprovalTicket } from './assistant-approval'
import { KeyStore, type SecretCipher, type SecretStore } from './assistant-key'
import {
  findErrorMessage,
  MAX_CONCURRENT_RUNS,
  parseInbound,
  toPortEvent,
  type PortEvent,
  type StartRequest
} from './assistant-protocol'
import type { Repository as ChatRepository } from './chat'
import { findClient } from './database'

/** 只要求用到的两个级别，便于测试注入假 logger */
interface Log {
  info: (message: string) => void
  warn: (message: string, error?: unknown) => void
}

/**
 * 离线通路：主进程本地 provider（Ollama / LM Studio / vLLM 等 OpenAI 兼容端点）。
 *
 * 官方 Electron Pattern 2：
 * 1. 渲染进程 `itc.assistant.connect()`（invoke）；
 * 2. 主进程建 `MessageChannelMain`，把 port2 通过 `senderFrame.postMessage` 交出去；
 * 3. 之后全部走端口的**纯数据**协议（见 assistant-protocol.ts），主进程不暴露对象。
 *
 * 安全边界：
 * - 端口只在已登记且 URL 合规的 sender 上建立（host/ipc 装配层的 trusted-sender 校验）；
 * - apiKey 只留主进程（assistant-key.ts 的 safeStorage 存储），端口协议里没有它；
 * - 端口关闭 / 窗口销毁 → 该端口上所有运行立即 abort。
 */

/** 与 src/plugins/database.ts 同款：electron-store 的最小用法面适配 */
function toSecretStore(store: Store): SecretStore {
  return {
    has(key) {
      return store.has(key)
    },
    toRead(key) {
      return store.get(key) ?? null
    },
    toWrite(key, value) {
      store.set(key, value)
    },
    toRemove(key) {
      store.delete(key)
    }
  }
}

function buildCipher(): SecretCipher {
  return {
    isAvailable() {
      return safeStorage.isEncryptionAvailable()
    },
    encrypt(value) {
      return safeStorage.encryptString(value)
    },
    decrypt(value) {
      return safeStorage.decryptString(value)
    }
  }
}

/** KeyStore 的唯一构造点：旧插件路径与新的 handler 切片共用，不各建一份 */
export function buildKeyStore(): KeyStore {
  return new KeyStore(toSecretStore(new Store({ name: 'assistant-secrets' })), buildCipher())
}

/**
 * 端口写出封装：`MessagePortMain` 没有 `isClosed()`，自行跟一个标志位，
 * 避免在端口已关闭（窗口销毁等）时 postMessage 报错。
 */
interface PortSink {
  post: (event: PortEvent) => void
  close: () => void
}

function buildSink(port: MessagePortMain): PortSink {
  let closed = false
  port.on('close', function () {
    closed = true
  })

  return {
    post(event) {
      if (closed) return
      port.postMessage(event)
    },
    close() {
      closed = true
      port.close()
    }
  }
}

/**
 * 一次生成的运行状态。
 *
 * `approvals` 是「工具待审批」的登记表：工具执行前在这里挂起，
 * 渲染进程回执到达时唤醒它 —— 或者 abort / 超时强制落地。
 */
interface RunContext {
  controller: AbortController
  approvals: Map<string, ApprovalTicket>
}

/** 一次生成最多推进多少步（含工具回调），防模型在工具间无限打转 */
const MAX_AGENT_STEPS = 8
/** 审批等待上限：超时按拒绝处理，绝不把运行永久挂住 */
const APPROVAL_TIMEOUT_MS = 5 * 60_000

function describeApproval(toolName: string, input: unknown): string {
  const label = AGENT_TOOL_LABELS[toolName as keyof typeof AGENT_TOOL_LABELS] ?? toolName
  if (input && typeof input === 'object' && 'path' in input) {
    const target = (input as { path?: unknown }).path
    return `${label}：${typeof target === 'string' ? target : '（未指定路径）'}`
  }
  return label
}

/** 工作区 id → primary folder 绝对路径；未选或已失效时返回 null（工具集随之关闭） */
async function resolvePrimaryPath(
  workspaceID: string | null | undefined
): Promise<string | null> {
  if (!workspaceID) return null

  const db = findClient()
  const primary = await db
    .select()
    .from(workspaceFolder)
    .where(
      and(eq(workspaceFolder.workspaceID, workspaceID), eq(workspaceFolder.isPrimary, true))
    )
    .limit(1)

  if (primary.length > 0) return primary[0].path

  const fallback = await db
    .select()
    .from(workspaceFolder)
    .where(eq(workspaceFolder.workspaceID, workspaceID))
    .orderBy(asc(workspaceFolder.sort))
    .limit(1)
  return fallback.length === 0 ? null : fallback[0].path
}

/**
 * 等渲染进程的审批回执。票据负责「永远落地」（回执 / abort / 超时），
 * 这里只负责登记 + 把请求发出去。
 */
function awaitApproval(
  context: RunContext,
  runID: string,
  toolCallId: string,
  toolName: string,
  input: unknown,
  sink: PortSink
): Promise<boolean> {
  const ticket = createApprovalTicket({
    signal: context.controller.signal,
    timeoutMs: APPROVAL_TIMEOUT_MS
  })
  context.approvals.set(toolCallId, ticket)

  void ticket.decision.finally(function () {
    context.approvals.delete(toolCallId)
  })

  sink.post({
    kind: 'tool-approval-request',
    runID,
    toolCallId,
    toolName,
    input,
    prompt: describeApproval(toolName, input)
  })

  return ticket.decision
}

/**
 * 把「用户引用了哪些文件」接到系统提示词后面。
 *
 * 引用只给**路径名单**，不内联内容 —— 内容由模型用 fs_read 拿，
 * 这样提示词不会因为拖进一个大文件而爆掉，也保证读到的是当时的真实内容。
 */
function appendReferences(
  system: string | undefined,
  references: readonly string[]
): string | undefined {
  if (references.length === 0) return system

  const list = references.map(function (item) {
    return `- ${item}`
  })

  const block = [
    '用户在本次消息里引用了这些工作区文件（相对路径）：',
    ...list,
    '需要内容时用 fs_read 读取这些路径，不要凭猜测编造文件内容。'
  ].join('\n')

  return system ? `${system}\n\n${block}` : block
}

/** 有图片的用户消息改成多模态 content；其余保持纯文本 */
function toModelMessages(messages: StartRequest['messages']): ModelMessage[] {
  return messages.map(function (message): ModelMessage {
    if (!message.images || message.images.length === 0) {
      return { role: message.role, content: message.content }
    }

    const content: Array<
      { type: 'text'; text: string } | { type: 'image'; image: string; mediaType: string }
    > = []
    if (message.content) content.push({ type: 'text', text: message.content })
    for (const image of message.images) {
      content.push({ type: 'image', image: image.data, mediaType: image.mediaType })
    }

    return { role: 'user', content }
  })
}

/** 终态事件：渲染侧收到第一个就结束本次运行，主进程靠它判断「这次运行落过地没有」 */
const TERMINAL_KINDS = new Set(['finish', 'error', 'aborted'])

async function run(
  request: StartRequest,
  sink: PortSink,
  context: RunContext,
  keys: KeyStore,
  chat: ChatRepository,
  log: Log
): Promise<void> {
  const { controller } = context
  /** 本次运行是否已经落过终态：渲染侧只认第一个，主进程靠它做收尾兜底 */
  let isSettled = false

  try {
    const provider = await chat.findProvider(request.providerID)
    if (!provider) throw new Error(`provider 不存在: ${request.providerID}`)
    if (!provider.baseUrl) throw new Error(`provider 缺少 baseUrl: ${provider.id}`)

    const apiKey = keys.findKey(provider.id)
    const local = createOpenAICompatible({
      name: provider.kind,
      baseURL: provider.baseUrl,
      ...(apiKey ? { apiKey } : {})
    })

    const rootPath = await resolvePrimaryPath(request.host?.workspaceID)
    const tools = pickAgentTools(
      buildAgentTools(rootPath, request.host?.sessionID),
      request.host?.tools
    )
    const hasTools = Object.keys(tools).length > 0
    const approval = request.host?.approval ?? 'ask'
    const system = appendReferences(request.system, request.host?.references ?? [])

    const result = streamText({
      model: local.chatModel(request.model),
      ...(system ? { system } : {}),
      messages: toModelMessages(request.messages),
      abortSignal: controller.signal,
      /**
       * 失败**不一定**以 `error` 片段交到消费者手上：早期请求失败（连不上 / 404）是直接
       * reject 内部 promise，`for await (fullStream)` 会一直等下去 → 界面永远卡在「生成中」。
       * 所以终态在这里落，并 abort 让下面的 for await 收束（渲染侧只认第一个终态）。
       */
      onError(options: { error: unknown }) {
        isSettled = true
        log.warn('stream failed', options.error)
        sink.post({ kind: 'error', runID: request.runID, message: findErrorMessage(options.error) })
        controller.abort()
      },
      ...(hasTools
        ? {
            tools,
            stopWhen: stepCountIs(MAX_AGENT_STEPS),
            // 审批挂在「模型要求调用」与「真的执行」之间
            async toolApproval(options: {
              toolCall: { toolName: string; toolCallId?: string; input?: unknown }
            }) {
              const call = options.toolCall
              const toolCallId = call.toolCallId ?? request.runID

              if (approval === 'auto') return 'approved' as const
              if (isApprovalFreeTool(call.toolName)) return 'not-applicable' as const
              if (approval === 'readonly') {
                log.info(`tool denied by readonly policy: ${call.toolName}`)
                return 'denied' as const
              }

              const approved = await awaitApproval(
                context,
                request.runID,
                toolCallId,
                call.toolName,
                call.input,
                sink
              )
              log.info(`tool approval: ${call.toolName} => ${approved ? 'approved' : 'denied'}`)
              return approved ? ('approved' as const) : ('denied' as const)
            }
          }
        : {})
    })

    for await (const part of result.fullStream) {
      const event = toPortEvent(part, request.runID)
      if (!event) continue
      if (TERMINAL_KINDS.has(event.kind)) isSettled = true
      sink.post(event)
    }
  } catch (error) {
    isSettled = true
    sink.post({ kind: 'error', runID: request.runID, message: findErrorMessage(error) })
    log.warn('run failed', error)
  } finally {
    // 收束保证：任何路径都得给渲染侧一个终态，否则界面会永远停在「生成中」
    if (!isSettled) {
      sink.post({ kind: 'error', runID: request.runID, message: '模型流意外结束' })
      log.warn('stream ended without terminal event')
    }
  }
}

function connect(
  frame: WebFrameMain,
  sender: WebContents,
  keys: KeyStore,
  chat: ChatRepository,
  log: Log
): void {
  const channel = new MessageChannelMain()
  const port = channel.port1
  const sink = buildSink(port)
  const runs = new Map<string, RunContext>()

  port.on('message', function (event) {
    const request = parseInbound(event.data)
    if (!request) {
      log.warn('rejected malformed port message')
      return
    }
    if (request.kind === 'abort') {
      runs.get(request.runID)?.controller.abort()
      return
    }
    if (request.kind === 'tool-approval') {
      runs.get(request.runID)?.approvals.get(request.toolCallId)?.settle(request.approved)
      return
    }
    if (runs.size >= MAX_CONCURRENT_RUNS) {
      sink.post({ kind: 'error', runID: request.runID, message: '并发运行数已达上限' })
      return
    }

    const context: RunContext = { controller: new AbortController(), approvals: new Map() }
    runs.set(request.runID, context)
    void run(request, sink, context, keys, chat, log).finally(function () {
      context.approvals.forEach(function (ticket) {
        ticket.dispose()
      })
      context.approvals.clear()
      runs.delete(request.runID)
    })
  })

  function abortAll() {
    runs.forEach(function (context) {
      context.controller.abort()
    })
    runs.clear()
  }

  port.on('close', function () {
    abortAll()
  })
  sender.once('destroyed', function () {
    abortAll()
    sink.close()
  })

  port.start()
  frame.postMessage(CHANNELS.ASSISTANT.PORT, null, [channel.port2])
  log.info('port attached')
}

export { connect }
export type { Log }
