// @vitest-environment jsdom
import { type AssistantClient, useAui, useAuiState } from '@assistant-ui/react'
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 会话装配的端到端回归：挂真的 `ChatRuntimeProvider`，只把两个端口换成假的。
 *
 * 这里的断言全是"曾经真的坏过"的点：
 * - 新建会话发消息时，历史写入必须带**落库后的会话 id**（拿不到就是外键失败 +
 *   assistant-ui 静默吞掉 → 消息凭空消失）
 * - 运行请求里的 `host.sessionID` 必须与历史写入同一个 id（主进程按它记
 *   `studio 线程 → opencode 会话` 映射、记用量）
 * - 点开左侧会话必须按**它的** id 去读历史（读不到就永远是空白）
 *
 * 造这些断言的原因是：上面两条链的失败在界面上都表现为"没反应"，没有日志就走不出迷雾。
 */

const fake = vi.hoisted(function () {
  return {
    threads: [] as Array<{
      id: string
      title: string
      pinned: boolean
      updatedAt: number
      providerID: string | null
      workspaceID: string | null
    }>,
    rows: [] as Array<{
      threadID: string
      id: string
      parentID: string | null
      format: string
      content: string
    }>,
    loadedThreads: [] as string[],
    appended: [] as Array<{ threadID: string; id: string }>,
    createdThreads: 0,
    runHosts: [] as Array<Record<string, unknown>>
  }
})

vi.mock('@/features/chat/port/history.ts', function () {
  return {
    createHistoryPort: function () {
      return {
        async findThreads() {
          return fake.threads
        },
        async findThread(id: string) {
          return (
            fake.threads.find(function (row) {
              return row.id === id
            }) ?? null
          )
        },
        async createThread(input?: { title?: string }) {
          fake.createdThreads += 1
          const thread = {
            id: `db-session-${fake.createdThreads}`,
            title: input?.title ?? '新会话',
            pinned: false,
            updatedAt: Date.now(),
            providerID: null,
            workspaceID: null
          }
          fake.threads.push(thread)
          return thread
        },
        async updateThread(id: string, patch: { title?: string }) {
          const thread = fake.threads.find(function (row) {
            return row.id === id
          })
          if (!thread) throw new Error('会话不存在')
          Object.assign(thread, patch)
          return thread
        },
        async deleteThread(id: string) {
          fake.threads = fake.threads.filter(function (row) {
            return row.id !== id
          })
        },
        async findMessages(input: { threadID: string }) {
          fake.loadedThreads.push(input.threadID)
          return fake.rows
            .filter(function (row) {
              return row.threadID === input.threadID
            })
            .map(function (row) {
              return {
                id: row.id,
                parentID: row.parentID,
                format: row.format,
                content: row.content
              }
            })
        },
        async appendMessage(input: {
          threadID: string
          id: string
          parentID: string | null
          format: string
          content: string
        }) {
          fake.appended.push({ threadID: input.threadID, id: input.id })
          fake.rows.push({ ...input })
        },
        async updateMessage() {},
        async deleteMessages() {}
      }
    }
  }
})

vi.mock('@/features/chat/port/instance.ts', function () {
  return {
    chatModelPort: {
      async findTarget() {
        return { providerID: 'fake-provider', model: 'fake-model' }
      },
      async *run(input: { host?: Record<string, unknown> }) {
        fake.runHosts.push(input.host ?? {})
        yield { kind: 'text', blockID: 'b1', text: '收到' }
        yield { kind: 'finish', finishReason: 'stop', usage: { totalTokens: 1 } }
      },
      respondToApproval() {
        return true
      }
    },
    /** 与真实实现同形：会话 id 由调用方给出，原样带进 `host` */
    findHostOptions(_target: unknown, sessionID: string) {
      return { supportsTools: true, approval: 'auto', workspaceID: 'ws-1', sessionID }
    }
  }
})

const { ChatRuntimeProvider } = await import('./runtime.tsx')

/** 一条可被 `LOCAL_CODEC` 解出来的历史行（格式名与实现里的常量一致） */
function toStoredRow(threadID: string, id: string, text: string) {
  return {
    threadID,
    id,
    parentID: null,
    format: 'ith/thread-message-like',
    content: JSON.stringify({
      role: 'user',
      content: [{ type: 'text', text }],
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString()
    })
  }
}

let client: AssistantClient | undefined

function Harness() {
  const aui = useAui()

  // 渲染期不写外部变量：句柄在 effect 里交给用例
  useEffect(
    function () {
      client = aui
    },
    [aui]
  )

  const items = useAuiState(function (state) {
    return state.threads.threadItems
  })
  const messages = useAuiState(function (state) {
    return state.thread.messages
  })

  return (
    <div>
      <ul data-testid="threads">
        {items.map(function (item) {
          return (
            <li
              key={item.id}
              data-remote={item.remoteId ?? ''}
              data-thread={item.id}>
              {item.title}
            </li>
          )
        })}
      </ul>
      <div data-testid="messages">
        {messages.map(function (message) {
          const text = message.content
            .filter(function (part) {
              return part.type === 'text'
            })
            .map(function (part) {
              return part.type === 'text' ? part.text : ''
            })
            .join('')
          return <p key={message.id}>{text}</p>
        })}
      </div>
    </div>
  )
}

// vitest 没开 `globals`，RTL 的自动清理挂不上：不手动清，上一个用例的 DOM 会留在页面里
afterEach(cleanup)

// 每个用例都要自己造现场：`fake` 与模块级 `historyPort` 是跨用例共享的
beforeEach(function () {
  fake.threads.length = 0
  fake.rows.length = 0
  fake.loadedThreads.length = 0
  fake.appended.length = 0
  fake.runHosts.length = 0
  fake.createdThreads = 0
})

describe('会话装配（runtime）', function () {
  it('新建会话发消息：历史写入与运行请求都带落库后的会话 id', async function () {
    render(
      <ChatRuntimeProvider>
        <Harness />
      </ChatRuntimeProvider>
    )

    await waitFor(function () {
      expect(client).toBeDefined()
    })

    await act(async function () {
      await client!.thread().append({ role: 'user', content: [{ type: 'text', text: '测试' }] })
    })

    await waitFor(function () {
      expect(fake.appended.length).toBeGreaterThan(0)
    })

    const threadID = fake.appended[0].threadID
    expect(threadID).toBeTruthy()
    expect(threadID).toBe(`db-session-${fake.createdThreads}`)
    expect(
      fake.appended.every(function (row) {
        return row.threadID === threadID
      })
    ).toBe(true)

    await waitFor(function () {
      expect(fake.runHosts.length).toBeGreaterThan(0)
    })
    expect(fake.runHosts[0].sessionID).toBe(threadID)
  })

  it('本次新建的会话：发完消息再切回来，历史照样渲染（从侧栏点回原会话）', async function () {
    render(
      <ChatRuntimeProvider>
        <Harness />
      </ChatRuntimeProvider>
    )

    await waitFor(function () {
      expect(client).toBeDefined()
    })

    await act(async function () {
      await client!.thread().append({
        role: 'user',
        content: [{ type: 'text', text: '第一条消息' }]
      })
    })
    await waitFor(function () {
      expect(fake.appended.length).toBeGreaterThan(0)
    })

    const createdID = fake.appended[0].threadID
    expect(createdID).toBe(`db-session-${fake.createdThreads}`)

    // 再开一个会话、然后切回刚才那个 —— 这正是「点开左侧会话一片空白」的操作序列：
    // 身份若只认那份可能过期的列表项快照，切回来就会读成空历史
    await act(async function () {
      void client!.threads.switchToNewThread()
    })
    await act(async function () {
      void client!.threads.switchToThread(createdID)
    })

    // 会话标题就是首条消息的截断，所以只能在消息区里找（侧栏那份是标题）
    const pane = screen.getByTestId('messages')
    await waitFor(function () {
      expect(within(pane).getByText('第一条消息')).toBeTruthy()
    })
  })

  it('点开已有会话：按它的会话 id 读历史并渲染出来', async function () {
    const thread = {
      id: 'db-session-old',
      title: '旧会话',
      pinned: false,
      updatedAt: Date.now(),
      providerID: null,
      workspaceID: null
    }
    fake.threads.push(thread)
    fake.rows.push(toStoredRow(thread.id, 'm1', '历史消息一'))

    render(
      <ChatRuntimeProvider>
        <Harness />
      </ChatRuntimeProvider>
    )

    await waitFor(function () {
      expect(screen.getByText('旧会话')).toBeTruthy()
    })

    const item = screen.getByText('旧会话').closest('li')!
    expect(item.getAttribute('data-remote')).toBe(thread.id)

    act(function () {
      void client!.threads.switchToThread(item.getAttribute('data-thread')!)
    })

    await waitFor(function () {
      expect(fake.loadedThreads).toContain(thread.id)
    })
    await waitFor(function () {
      expect(screen.getByText('历史消息一')).toBeTruthy()
    })
  })
})
