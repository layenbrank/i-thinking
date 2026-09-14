import type {
  ChatModelAdapter,
  ChatModelRunResult,
  ThreadAssistantMessagePart,
  ThreadMessage
} from '@assistant-ui/react'

import type { ChatModelPort, ChatRunMessage, ChatUsage } from '../ports'

/**
 * 离线模型适配器：把 `ChatModelPort` 的事件流聚合成 assistant-ui 需要的**快照**。
 *
 * runtime 期望的是"当前完整内容"而不是增量，所以每个事件后推一份累计快照；
 * 中止（`abortSignal`）由端口实现负责打断底层请求。
 *
 * V1 只处理文本与推理；工具调用需要主进程执行工具（P4 特性对齐时再开），
 * 这里遇到 `tool-call` 事件先忽略。
 */

/** 取消息里的纯文本（V1 只发文本，多模态/工具在特性对齐时扩） */
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

function toRunMessages(messages: readonly ThreadMessage[]): ChatRunMessage[] {
  const runs: ChatRunMessage[] = []

  for (const message of messages) {
    // 正在生成的占位消息不参与下一轮上下文
    if (message.status?.type === 'running') continue

    const content = collectText(message)
    if (!content) continue

    runs.push({ role: message.role, content })
  }
  return runs
}

function buildContent(text: string, reasoning: string): ThreadAssistantMessagePart[] {
  const parts: ThreadAssistantMessagePart[] = []
  if (reasoning) parts.push({ type: 'reasoning', text: reasoning })
  if (text) parts.push({ type: 'text', text })
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

function createChatModelAdapter(port: ChatModelPort): ChatModelAdapter {
  return {
    async *run(options) {
      const target = await port.findTarget()
      if (!target) throw new Error('[CHAT] 未配置本地模型 provider')

      const messages = toRunMessages(options.messages)
      if (messages.length === 0) throw new Error('[CHAT] 没有可发送的消息')

      let text = ''
      let reasoning = ''

      for await (const event of port.run({ ...target, messages }, options.abortSignal)) {
        switch (event.kind) {
          case 'text':
            text += event.text
            break
          case 'reasoning':
            reasoning += event.text
            break
          case 'finish':
            yield {
              content: buildContent(text, reasoning),
              status: toStatus(event.finishReason),
              metadata: { custom: toCustom(event.usage) }
            }
            return
          case 'aborted':
            return
          case 'error':
            throw new Error(event.message)
          default:
            // tool-call：V1 不执行工具，忽略
            continue
        }

        yield { content: buildContent(text, reasoning) }
      }
    }
  }
}

export { createChatModelAdapter }
