import type { RemoteThreadListAdapter, ThreadMessage } from '@assistant-ui/react'
import { createAssistantStream, type AssistantStream } from 'assistant-stream'

import type { ChatHistoryPort, ChatThread } from '../ports'

/**
 * 会话列表适配器：把 `ChatHistoryPort` 接到 assistant-ui 的
 * `useRemoteThreadListRuntime`（自建列表，不用 Assistant Cloud）。
 */

type InitializeResponse = Awaited<ReturnType<RemoteThreadListAdapter['initialize']>>
type ThreadMetadata = Awaited<ReturnType<RemoteThreadListAdapter['fetch']>>

const NEW_THREAD_TITLE = '新会话'
/** 启发式标题长度上限 */
const MAX_TITLE_CHARS = 24

function toMetadata(thread: ChatThread): ThreadMetadata {
  return {
    status: 'regular',
    remoteId: thread.id,
    title: thread.title,
    lastMessageAt: new Date(thread.updatedAt),
    custom: { pinned: thread.pinned, workspaceID: thread.workspaceID }
  }
}

/** 用首条用户文本做本地标题（不调用模型）；没有可用文本时退回默认名 */
function buildTitle(messages: readonly ThreadMessage[]): string {
  for (const message of messages) {
    if (message.role !== 'user') continue

    const text = message.content
      .filter(function (part) {
        return part.type === 'text'
      })
      .map(function (part) {
        return part.text
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (text) return text.length > MAX_TITLE_CHARS ? `${text.slice(0, MAX_TITLE_CHARS)}…` : text
  }
  return NEW_THREAD_TITLE
}

function createThreadListAdapter(port: ChatHistoryPort): RemoteThreadListAdapter {
  return {
    async list() {
      const threads = await port.findThreads()
      return { threads: threads.map(toMetadata) }
    },

    async initialize(): Promise<InitializeResponse> {
      const thread = await port.createThread({ title: NEW_THREAD_TITLE })
      return { remoteId: thread.id }
    },

    async rename(remoteId, newTitle) {
      await port.updateThread(remoteId, { title: newTitle })
    },

    /**
     * 归档暂不支持（chat 域暂无 `archivedAt` 列）：抛可展示的错误，
     * 而不是静默成功 —— 否则 UI 会显示"已归档"但状态没落库。
     */
    async archive() {
      throw new Error('[CHAT] 暂不支持归档')
    },

    async unarchive() {
      throw new Error('[CHAT] 暂不支持归档')
    },

    async delete(remoteId) {
      await port.deleteThread(remoteId)
    },

    async fetch(threadId) {
      const thread = await port.findThread(threadId)
      if (!thread) throw new Error(`[CHAT] 会话不存在: ${threadId}`)
      return toMetadata(thread)
    },

    async generateTitle(remoteId, messages): Promise<AssistantStream> {
      const title = buildTitle(messages)
      return createAssistantStream(async function (controller) {
        // 说明要求：落库必须在流结束前完成，否则并发标题会被更旧的写覆盖
        await port.updateThread(remoteId, { title })
        controller.appendText(title)
      })
    }
  }
}

export { createThreadListAdapter, NEW_THREAD_TITLE }
