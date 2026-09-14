import {
  fromThreadMessageLike,
  type GenericThreadHistoryAdapter,
  type MessageFormatAdapter,
  type MessageFormatItem,
  type ThreadHistoryAdapter,
  type ThreadMessage,
  type ThreadMessageLike
} from '@assistant-ui/react'

import type { ChatHistoryPort, ChatStoredMessage } from '../ports'

/**
 * 历史适配器：把 `ChatHistoryPort` 接到 assistant-ui runtime。
 *
 * 两种用法共用一个存储：
 * - 离线（`useLocalRuntime`）：用本包内置格式 `LOCAL_FORMAT`（content 是 JSON 载荷）
 * - 在线（`useChatRuntime` 等）：走 `withFormat(adapter)`，由调用方的格式适配器编解码
 *
 * 同一条会话**不要**混写两种格式（load 时只认得出自己那种，其余行会被跳过）。
 */

/** 离线 runtime 的内置消息格式 */
const LOCAL_FORMAT = 'ith/thread-message-like'

/**
 * 内置格式的载荷：只留可 JSON 往返的字段（时间存 ISO 字符串，避免 Date 序列化歧义）。
 * 用 type 而非 interface：`TStorageFormat extends Record<string, unknown>` 需要隐式索引签名。
 */
type LocalPayload = {
  role: ThreadMessageLike['role']
  content: ThreadMessageLike['content']
  createdAt: string
  status?: ThreadMessageLike['status']
}

const LOCAL_CODEC: MessageFormatAdapter<ThreadMessage, LocalPayload> = {
  format: LOCAL_FORMAT,
  getId(message) {
    return message.id
  },
  encode(item) {
    const { message } = item
    return {
      role: message.role,
      content: message.content as ThreadMessageLike['content'],
      createdAt: message.createdAt.toISOString(),
      ...(message.status ? { status: message.status } : {})
    }
  },
  decode(stored) {
    const payload = stored.content
    return {
      parentId: stored.parent_id,
      message: fromThreadMessageLike(
        {
          role: payload.role,
          content: payload.content,
          createdAt: new Date(payload.createdAt),
          ...(payload.status ? { status: payload.status } : {})
        },
        stored.id,
        { type: 'complete', reason: 'unknown' }
      )
    }
  }
}

function requireThreadID(findThreadID: () => string | null): string {
  const threadID = findThreadID()
  if (!threadID) throw new Error('[CHAT] 没有活动会话')
  return threadID
}

/** 分支树的 head：从后往前找第一条"不是任何消息的父节点"的消息 */
function findHeadID<TMessage>(
  items: MessageFormatItem<TMessage>[],
  getId: (message: TMessage) => string
): string | null {
  const parentIDs = new Set(
    items.map(function (item) {
      return item.parentId
    })
  )

  for (let index = items.length - 1; index >= 0; index -= 1) {
    const id = getId(items[index].message)
    if (!parentIDs.has(id)) return id
  }
  return null
}

function parsePayload<TPayload>(row: ChatStoredMessage): TPayload {
  return JSON.parse(row.content) as TPayload
}

/** 指定格式的通用适配器：存储行 ↔ `MessageFormatItem` 的编解码都在这里 */
function createFormattedAdapter<TMessage, TStorageFormat extends Record<string, unknown>>(
  port: ChatHistoryPort,
  findThreadID: () => string | null,
  formatAdapter: MessageFormatAdapter<TMessage, TStorageFormat>
): GenericThreadHistoryAdapter<TMessage> {
  function findThread(): string {
    return requireThreadID(findThreadID)
  }

  function toStoredMessage(item: MessageFormatItem<TMessage>) {
    return {
      threadID: findThread(),
      id: formatAdapter.getId(item.message),
      parentID: item.parentId,
      format: formatAdapter.format,
      content: JSON.stringify(formatAdapter.encode(item))
    }
  }

  return {
    async load() {
      const rows = await port.findMessages({ threadID: findThread() })
      const items = rows
        .filter(function (row) {
          return row.format === formatAdapter.format
        })
        .map(function (row) {
          return formatAdapter.decode({
            id: row.id,
            parent_id: row.parentID,
            format: row.format,
            content: parsePayload<TStorageFormat>(row)
          })
        })

      return { headId: findHeadID(items, formatAdapter.getId), messages: items }
    },

    async append(item) {
      await port.appendMessage(toStoredMessage(item))
    },

    async update(item) {
      const stored = toStoredMessage(item)
      await port.updateMessage({
        id: stored.id,
        format: stored.format,
        content: stored.content
      })
    },

    async delete(items) {
      await port.deleteMessages({
        ids: items.map(function (item) {
          return formatAdapter.getId(item.message)
        })
      })
    }
  }
}

/**
 * @param findThreadID 每次调用都重新取当前线程 —— runtime 会在切线程后再读，
 *   不要在构造时捕获线程 id（见 `RemoteThreadListOptions.unstable_useAdapters` 的说明）。
 */
function createThreadHistoryAdapter(
  port: ChatHistoryPort,
  findThreadID: () => string | null
): ThreadHistoryAdapter {
  const local = createFormattedAdapter(port, findThreadID, LOCAL_CODEC)

  return {
    async load() {
      const repository = await local.load()
      return {
        headId: repository.headId ?? null,
        messages: repository.messages.map(function (item) {
          return { message: item.message, parentId: item.parentId }
        })
      }
    },

    async append(item) {
      await local.append({ parentId: item.parentId, message: item.message })
    },

    /** 第二个参数是"本地 id"，用于乐观消息换成服务端 id 的场景（本仓 id 由客户端生成，无需换） */
    async update(item) {
      await local.update?.({ parentId: item.parentId, message: item.message }, item.message.id)
    },

    async delete(items) {
      await local.delete?.(
        items.map(function (item) {
          return { parentId: item.parentId, message: item.message }
        })
      )
    },

    withFormat(formatAdapter) {
      return createFormattedAdapter(port, findThreadID, formatAdapter)
    }
  }
}

export { createThreadHistoryAdapter, LOCAL_FORMAT }
