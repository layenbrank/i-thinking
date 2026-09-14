import {
  fromThreadMessageLike,
  type MessageFormatItem,
  type MessageStorageEntry,
  type ThreadMessage
} from '@assistant-ui/react'
import { describe, expect, it } from 'vitest'

import type { ChatHistoryPort, ChatModelPort, ChatStoredMessage, ChatThread } from '../ports'
import { createChatModelAdapter } from './chat-model'
import { createThreadHistoryAdapter, LOCAL_FORMAT } from './thread-history'
import { createThreadListAdapter } from './thread-list'

/** 内存版历史端口：按写入顺序返回消息，语义与主进程实现一致 */
class MemoryPort implements ChatHistoryPort {
  private readonly threads = new Map<string, ChatThread>()
  private readonly messages: Array<{ threadID: string } & ChatStoredMessage> = []
  private seq = 0

  async findThreads(): Promise<ChatThread[]> {
    return [...this.threads.values()]
  }

  async findThread(id: string): Promise<ChatThread | null> {
    return this.threads.get(id) ?? null
  }

  async createThread(input?: { title?: string; providerID?: string | null }): Promise<ChatThread> {
    this.seq += 1
    const thread: ChatThread = {
      id: `thread-${this.seq}`,
      title: input?.title ?? '新会话',
      pinned: false,
      updatedAt: this.seq,
      providerID: input?.providerID ?? null
    }
    this.threads.set(thread.id, thread)
    return thread
  }

  async updateThread(id: string, patch: { title?: string; pinned?: boolean }): Promise<ChatThread> {
    const thread = this.threads.get(id)
    if (!thread) throw new Error(`thread not found: ${id}`)
    const next = { ...thread, ...patch, updatedAt: thread.updatedAt + 1 }
    this.threads.set(id, next)
    return next
  }

  async deleteThread(id: string): Promise<void> {
    this.threads.delete(id)
  }

  async findMessages(input: { threadID: string }): Promise<ChatStoredMessage[]> {
    return this.messages
      .filter(function (row) {
        return row.threadID === input.threadID
      })
      .map(function (row) {
        return { id: row.id, parentID: row.parentID, format: row.format, content: row.content }
      })
  }

  async appendMessage(input: { threadID: string } & ChatStoredMessage): Promise<void> {
    this.messages.push(input)
  }

  async updateMessage(input: { id: string; format?: string; content?: string }): Promise<void> {
    const row = this.messages.find(function (item) {
      return item.id === input.id
    })
    if (!row) throw new Error(`message not found: ${input.id}`)
    if (input.content !== undefined) row.content = input.content
    if (input.format !== undefined) row.format = input.format
  }

  async deleteMessages(input: { ids: string[] }): Promise<void> {
    const doomed = new Set(input.ids)
    for (let index = this.messages.length - 1; index >= 0; index -= 1) {
      if (doomed.has(this.messages[index].id)) this.messages.splice(index, 1)
    }
  }
}

/** withFormat 测试用的消息形状 */
interface TestMessage {
  id: string
  text: string
}

function buildMessage(
  id: string,
  text: string,
  role: 'user' | 'assistant' = 'user'
): ThreadMessage {
  return fromThreadMessageLike({ role, content: [{ type: 'text', text }] }, id, {
    type: 'complete',
    reason: 'unknown'
  })
}

async function buildPort(): Promise<{ port: MemoryPort; threadID: string }> {
  const port = new MemoryPort()
  const thread = await port.createThread()
  return { port, threadID: thread.id }
}

describe('createThreadHistoryAdapter', function () {
  it('append 后 load 能原样读回，并按 lastMessageAt 计算 head', async function () {
    const { port, threadID } = await buildPort()
    const adapter = createThreadHistoryAdapter(port, function () {
      return threadID
    })

    await adapter.append({ parentId: null, message: buildMessage('m1', '你好') })
    await adapter.append({ parentId: 'm1', message: buildMessage('m2', '在的', 'assistant') })

    const repository = await adapter.load()
    expect(repository.headId).toBe('m2')
    expect(repository.messages).toHaveLength(2)
    expect(
      repository.messages.map(function (item) {
        return item.parentId
      })
    ).toEqual([null, 'm1'])
  })

  it('分支时 head 取最近的叶子（无子节点）', async function () {
    const { port, threadID } = await buildPort()
    const adapter = createThreadHistoryAdapter(port, function () {
      return threadID
    })

    await adapter.append({ parentId: null, message: buildMessage('m1', '根') })
    await adapter.append({ parentId: 'm1', message: buildMessage('m2', '分支 A', 'assistant') })
    await adapter.append({ parentId: 'm1', message: buildMessage('m3', '分支 B', 'assistant') })
    // 两个叶子（m2 / m3）；再给 A 接一条，最新叶子变成 m4
    await adapter.append({ parentId: 'm2', message: buildMessage('m4', 'A 的后续', 'assistant') })

    const repository = await adapter.load()
    expect(repository.headId).toBe('m4')
  })

  it('跳过其它格式的行（本地与在线格式不混读）', async function () {
    const { port, threadID } = await buildPort()
    const adapter = createThreadHistoryAdapter(port, function () {
      return threadID
    })

    await adapter.append({ parentId: null, message: buildMessage('m1', '本地') })
    await port.appendMessage({
      threadID,
      id: 'ai-1',
      parentID: null,
      format: 'ai-sdk/v6',
      content: JSON.stringify({ role: 'user', parts: [] })
    })

    const repository = await adapter.load()
    expect(repository.messages).toHaveLength(1)
    expect(repository.messages[0].message.id).toBe('m1')
    expect(LOCAL_FORMAT).toBe('ith/thread-message-like')
  })

  it('delete 按 id 删除；update 覆写同一条', async function () {
    const { port, threadID } = await buildPort()
    const adapter = createThreadHistoryAdapter(port, function () {
      return threadID
    })

    await adapter.append({ parentId: null, message: buildMessage('m1', '原文') })
    await adapter.update?.({ parentId: null, message: buildMessage('m1', '改后') })
    const updated = await adapter.load()
    expect(updated.messages[0].message.content).toEqual([{ type: 'text', text: '改后' }])

    await adapter.delete?.([{ parentId: null, message: buildMessage('m1', '改后') }])
    expect((await adapter.load()).messages).toHaveLength(0)
  })

  it('withFormat 用调用方的格式适配器读写同一存储', async function () {
    const { port, threadID } = await buildPort()
    const adapter = createThreadHistoryAdapter(port, function () {
      return threadID
    })

    const formatted = adapter.withFormat?.({
      format: 'ai-sdk/v6',
      getId: function (message: TestMessage) {
        return message.id
      },
      encode: function (item: MessageFormatItem<TestMessage>) {
        return { text: item.message.text }
      },
      decode: function (stored: MessageStorageEntry<{ text: string }>) {
        return {
          parentId: stored.parent_id,
          message: { id: stored.id, text: stored.content.text }
        }
      }
    })

    expect(formatted).toBeDefined()
    await formatted?.append({ parentId: null, message: { id: 'a1', text: '在线写入' } })
    const loaded = await formatted?.load()
    expect(loaded?.messages[0].message).toEqual({ id: 'a1', text: '在线写入' })

    // 本地适配器读不到在线格式的行
    expect((await adapter.load()).messages).toHaveLength(0)
  })

  it('没有活动会话时给出可展示的错误', async function () {
    const { port } = await buildPort()
    const adapter = createThreadHistoryAdapter(port, function () {
      return null
    })

    await expect(adapter.load()).rejects.toThrow('[CHAT] 没有活动会话')
  })
})

describe('createChatModelAdapter', function () {
  function buildModelPort(events: Parameters<typeof Array.from>[0]): ChatModelPort {
    return {
      async findTarget() {
        return { providerID: 'p1', model: 'qwen3:8b' }
      },
      async *run() {
        for (const event of events as unknown as Array<Record<string, unknown>>) {
          yield event as never
        }
      }
    }
  }

  it('把增量聚合成快照，finish 时带状态与用量', async function () {
    const adapter = createChatModelAdapter(
      buildModelPort([
        { kind: 'reasoning', blockID: 'r1', text: '想想' },
        { kind: 'text', blockID: 't1', text: '你' },
        { kind: 'text', blockID: 't1', text: '好' },
        { kind: 'finish', finishReason: 'stop', usage: { totalTokens: 7 } }
      ])
    )

    const options = { messages: [buildMessage('m1', '你好')] } as never
    const snapshots: Array<readonly { type: string; text?: string }[]> = []
    for await (const result of (
      adapter.run as (input: never) => AsyncGenerator<{
        content?: readonly { type: string; text?: string }[]
        status?: { type: string }
      }>
    )(options)) {
      if (result.content) snapshots.push(result.content)
    }

    expect(snapshots[0]).toEqual([{ type: 'reasoning', text: '想想' }])
    expect(snapshots[1]).toEqual([
      { type: 'reasoning', text: '想想' },
      { type: 'text', text: '你' }
    ])
    expect(snapshots[2]).toEqual([
      { type: 'reasoning', text: '想想' },
      { type: 'text', text: '你好' }
    ])
    expect(snapshots[3]).toEqual([
      { type: 'reasoning', text: '想想' },
      { type: 'text', text: '你好' }
    ])
  })

  it('error 事件抛出可展示错误，aborted 直接结束', async function () {
    const failing = createChatModelAdapter(
      buildModelPort([{ kind: 'error', message: '连接被拒绝' }])
    )
    await expect(
      (async function () {
        for await (const _result of (failing.run as (input: never) => AsyncGenerator<unknown>)({
          messages: [buildMessage('m1', '你好')]
        } as never)) {
          // 消费到抛错为止
        }
      })()
    ).rejects.toThrow('连接被拒绝')

    const aborted = createChatModelAdapter(buildModelPort([{ kind: 'aborted' }]))
    const results: unknown[] = []
    for await (const result of (aborted.run as (input: never) => AsyncGenerator<unknown>)({
      messages: [buildMessage('m1', '你好')]
    } as never)) {
      results.push(result)
    }
    expect(results).toHaveLength(0)
  })

  it('未配置 provider / 没有可用文本时报错', async function () {
    const noTarget = createChatModelAdapter({
      findTarget: async function () {
        return null
      },
      run: async function* () {
        yield { kind: 'aborted' } as never
      }
    })

    await expect(
      (async function () {
        for await (const _result of (noTarget.run as (input: never) => AsyncGenerator<unknown>)({
          messages: []
        } as never)) {
          // 不应该有任何事件
        }
      })()
    ).rejects.toThrow('未配置本地模型 provider')

    const noText = createChatModelAdapter({
      findTarget: async function () {
        return { providerID: 'p1', model: 'qwen3:8b' }
      },
      run: async function* () {
        yield { kind: 'aborted' } as never
      }
    })
    await expect(
      (async function () {
        for await (const _result of (noText.run as (input: never) => AsyncGenerator<unknown>)({
          messages: []
        } as never)) {
          // 不应该有任何事件
        }
      })()
    ).rejects.toThrow('没有可发送的消息')
  })
})

describe('createThreadListAdapter', function () {
  it('list / initialize / rename / delete / fetch', async function () {
    const port = new MemoryPort()
    const adapter = createThreadListAdapter(port)

    const created = await adapter.initialize('local-1')
    await adapter.rename(created.remoteId, '改名后')
    const fetched = await adapter.fetch(created.remoteId)
    expect(fetched.title).toBe('改名后')
    expect(fetched.status).toBe('regular')

    const listed = await adapter.list()
    expect(
      listed.threads.map(function (thread) {
        return thread.remoteId
      })
    ).toEqual([created.remoteId])

    await adapter.delete(created.remoteId)
    expect((await adapter.list()).threads).toHaveLength(0)
  })

  it('fetch 不存在的会话抛错；归档明确不支持', async function () {
    const adapter = createThreadListAdapter(new MemoryPort())

    await expect(adapter.fetch('missing')).rejects.toThrow('[CHAT] 会话不存在')
    await expect(adapter.archive('missing')).rejects.toThrow('[CHAT] 暂不支持归档')
    await expect(adapter.unarchive('missing')).rejects.toThrow('[CHAT] 暂不支持归档')
  })
})
