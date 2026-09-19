import type {
  ChatModelAdapter,
  ChatModelRunResult,
  ThreadAssistantMessagePart,
  ThreadMessage,
  ToolCallMessagePartStatus
} from '@assistant-ui/react'

import type { ChatModelPort, ChatRunMessage, ChatUsage } from '../ports'

/**
 * 离线模型适配器：把 `ChatModelPort` 的事件流聚合成 assistant-ui 需要的**快照**。
 *
 * runtime 期望的是"当前完整内容"而不是增量，所以每个事件后推一份累计快照；
 * 中止（`abortSignal`）由端口实现负责打断底层请求。
 *
 * 工具调用（P2）：`tool-call` 变成 content 里的 tool-call part，
 * `tool-approval-request` 把它标成 `requires-action`（UI 拿到 `approval` 后决定放行/拒绝），
 * `tool-result` 回填结果并收束为 `complete`。
 */

/** 取消息里的纯文本（发给模型的上下文；工具 part 由宿主执行、不参与重放） */
function collectText(message: ThreadMessage): string {
  return message.content
    .filter(function (part) {
      return part.type === 'text'
    })
    .map(function (part) {
      return part.text
    })
    .join('\n')
    .trim()
}
/** 工具调用的累积状态：事件流是增量的，part 是快照，这里负责把前者拼成后者 */
interface ToolAccumulator {
  toolCallId: string
  toolName: string
  args: unknown
  argsText: string
  result?: unknown
  isError?: boolean
  /** 有待用户决定的审批时存在；`approved === undefined` 表示尚未拍板 */
  approval?: NonNullable<Extract<ThreadAssistantMessagePart, { type: 'tool-call' }>['approval']>
}

type ToolPart = Extract<ThreadAssistantMessagePart, { type: 'tool-call' }>

function toToolStatus(tool: ToolAccumulator): ToolCallMessagePartStatus {
  if (tool.approval && tool.approval.approved === undefined) {
    return { type: 'requires-action', reason: 'tool-calls' }
  }
  if (tool.isError) {
    return { type: 'incomplete', reason: 'tool-calls' }
  }
  return tool.result === undefined ? { type: 'running' } : { type: 'complete' }
}

function toToolPart(tool: ToolAccumulator): ToolPart {
  return {
    type: 'tool-call',
    toolCallId: tool.toolCallId,
    toolName: tool.toolName,
    args: tool.args,
    argsText: tool.argsText,
    status: toToolStatus(tool),
    ...(tool.result === undefined ? {} : { result: tool.result }),
    ...(tool.isError === undefined ? {} : { isError: tool.isError }),
    ...(tool.approval === undefined ? {} : { approval: tool.approval })
  } as ToolPart
}

function toRunMessages(messages: readonly ThreadMessage[]): ChatRunMessage[] {
  const runs: ChatRunMessage[] = []

  for (const message of messages) {
    // 正在生成的占位消息不参与下一轮上下文
    if (message.status?.type === 'running') continue

    const content = collectText(message)
    const attachments = collectAttachments(message)
    const images = collectImages(message)
    if (!content && attachments.length === 0 && images.length === 0) continue

    runs.push({
      role: message.role,
      content,
      ...(attachments.length > 0 ? { attachments } : {}),
      ...(images.length > 0 ? { images } : {})
    })
  }
  return runs
}

/**
 * 工作区引用名单：只有 file part（相对路径，内容为空）。
 * 图片不进这份名单，否则文件名会被当成 fs_read 路径。
 */
function collectAttachments(message: ThreadMessage): string[] {
  const names: string[] = []
  for (const part of message.content) {
    if (part.type !== 'file') continue
    if (!part.filename) continue
    if (names.includes(part.filename)) continue
    names.push(part.filename)
  }
  return names
}

function mediaTypeOf(dataUrl: string): string {
  const match = /^data:([^;,]+)/.exec(dataUrl)
  return match?.[1] || 'image/png'
}

/** 用户消息里的图片 data URL。非 data URL（空引用）不算图片内容 */
function collectImages(message: ThreadMessage): { mediaType: string; data: string }[] {
  if (message.role !== 'user') return []

  const images: { mediaType: string; data: string }[] = []
  for (const part of message.content) {
    if (part.type !== 'image') continue
    if (!part.image.startsWith('data:')) continue
    images.push({ mediaType: mediaTypeOf(part.image), data: part.image })
  }
  return images
}

function buildContent(
  text: string,
  reasoning: string,
  tools: Map<string, ToolAccumulator>
): ThreadAssistantMessagePart[] {
  const parts: ThreadAssistantMessagePart[] = []
  if (reasoning) parts.push({ type: 'reasoning', text: reasoning })
  if (text) parts.push({ type: 'text', text })
  tools.forEach(function append(tool) {
    parts.push(toToolPart(tool))
  })
  return parts
}

function toStatus(finishReason: string): ChatModelRunResult['status'] {
  return finishReason === 'length'
    ? { type: 'incomplete', reason: 'length' }
    : { type: 'complete', reason: 'stop' }
}

function toCustom(usage: ChatUsage): Record<string, unknown> {
  return { usage }
}

/** 适配器可选项：宿主扩展（工具集 / 审批策略 / 沙箱根）与系统提示词由 app 提供，每次运行现读 */
interface ChatModelAdapterOptions {
  findHost?: () => Record<string, unknown>
  findSystem?: () => string | undefined
}

function createChatModelAdapter(
  port: ChatModelPort,
  options: ChatModelAdapterOptions = {}
): ChatModelAdapter {
  return {
    async *run(runOptions) {
      const target = await port.findTarget()
      if (!target) throw new Error('[CHAT] 未配置本地模型 provider')

      const messages = toRunMessages(runOptions.messages)
      if (messages.length === 0) throw new Error('[CHAT] 没有可发送的消息')

      const host = options.findHost?.() ?? {}
      const system = options.findSystem?.()
      const extras = {
        ...(system ? { system } : {}),
        ...(Object.keys(host).length > 0 ? { host } : {})
      }
      const input = { ...target, messages, ...extras }

      let text = ''
      let reasoning = ''
      const tools = new Map<string, ToolAccumulator>()

      for await (const event of port.run(input, runOptions.abortSignal)) {
        switch (event.kind) {
          case 'text':
            text += event.text
            break
          case 'reasoning':
            reasoning += event.text
            break
          case 'tool-call':
            tools.set(event.toolCallId, {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.input,
              argsText: JSON.stringify(event.input ?? {})
            })
            break
          case 'tool-approval-request': {
            const existing = tools.get(event.toolCallId)
            tools.set(event.toolCallId, {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.input,
              argsText: JSON.stringify(event.input ?? {}),
              ...existing,
              approval: {
                id: event.toolCallId,
                ...(event.prompt ? { prompt: event.prompt } : {})
              }
            })
            break
          }
          case 'tool-result': {
            const existing = tools.get(event.toolCallId)
            tools.set(event.toolCallId, {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: existing?.args ?? null,
              argsText: existing?.argsText ?? '',
              ...existing,
              result: event.output,
              isError: event.isError === true,
              approval: existing?.approval
                ? { ...existing.approval, approved: event.isError ? false : true }
                : undefined
            })
            break
          }
          case 'finish':
            yield {
              content: buildContent(text, reasoning, tools),
              status: toStatus(event.finishReason),
              metadata: { custom: toCustom(event.usage) }
            }
            return
          case 'aborted':
            return
          case 'error':
            throw new Error(event.message)
        }

        yield { content: buildContent(text, reasoning, tools) }
      }
    }
  }
}

export { createChatModelAdapter }
export type { ChatModelAdapterOptions }
