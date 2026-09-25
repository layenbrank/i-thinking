import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  findLastUserMessage,
  planPrompt,
  SessionStore,
  toPromptFiles,
  toSessionTitle,
  type PromptMessage,
  type SessionMapping
} from './session'

/**
 * 换引擎时最容易出错的地方：渲染层每轮**发全量线程**，opencode 服务端**自己持历史**，
 * `session.prompt` 只该收到新消息。切分错了就直接劣化体验（模型看到重复提问），
 * 引用清洗错了就是安全问题（`..` 越界读任意文件）。
 */

const DIRECTORY = path.resolve('/work/space')

function user(content: string, partial: Partial<PromptMessage> = {}): PromptMessage {
  return { role: 'user', content, ...partial }
}

function assistant(content: string): PromptMessage {
  return { role: 'assistant', content }
}

describe('planPrompt · 增量切分', function () {
  it('首轮只发最后一条用户消息（之前的助手回复 opencode 这边没有）', function () {
    const messages = [user('第一问'), assistant('第一答'), user('第二问')]
    const plan = planPrompt(messages, null, DIRECTORY)

    expect(plan.text).toBe('第二问')
    expect(plan.nextCount).toBe(3)
  })

  it('映射在时只发新增的用户消息（助手回复不进 prompt）', function () {
    const messages = [user('第一问'), assistant('第一答'), user('第二问')]
    const mapping: SessionMapping = { sessionID: 's-1', messageCount: 2 }

    const plan = planPrompt(messages, mapping, DIRECTORY)
    expect(plan.text).toBe('第二问')
    expect(plan.nextCount).toBe(3)
  })

  it('多轮之间夹了助手回复时取最后一条新增用户消息', function () {
    const messages = [
      user('第一问'),
      assistant('第一答'),
      user('第二问'),
      assistant('第二答'),
      user('第三问')
    ]

    expect(planPrompt(messages, { sessionID: 's-1', messageCount: 3 }, DIRECTORY).text).toBe('第三问')
  })

  it('没有新增时重发最后一条用户消息（重新生成 / 上一轮失败重试）', function () {
    const messages = [user('第一问'), assistant('第一答')]
    const plan = planPrompt(messages, { sessionID: 's-1', messageCount: 2 }, DIRECTORY)

    expect(plan.text).toBe('第一问')
    expect(plan.nextCount).toBe(2)
  })

  it('线程被改短（删消息 / 分支）时按映射失效处理', function () {
    const messages = [user('新分支第一问')]
    const plan = planPrompt(messages, { sessionID: 's-1', messageCount: 99 }, DIRECTORY)

    expect(plan.text).toBe('新分支第一问')
    expect(plan.nextCount).toBe(1)
  })

  it('一条用户消息都没有时给空文本（不炸，也不重放助手的话）', function () {
    const plan = planPrompt([assistant('只有助手')], null, DIRECTORY)

    expect(plan).toEqual({ text: '', files: [], nextCount: 1 })
  })

  it('findLastUserMessage 从尾部往前找', function () {
    expect(findLastUserMessage([user('a'), assistant('b')])?.content).toBe('a')
    expect(findLastUserMessage([assistant('b')])).toBeNull()
  })
})

describe('planPrompt · 工作区根清单', function () {
  const ROOTS = [DIRECTORY, path.resolve('/work/other/service')]

  it('首轮把多根清单贴在提问前，避免模型从盘符根全盘搜', function () {
    const plan = planPrompt([user('看看 service')], null, DIRECTORY, ROOTS)

    expect(plan.text.endsWith('看看 service')).toBe(true)
    expect(plan.text).toContain(ROOTS[1])
    expect(plan.text).toContain(`${DIRECTORY}（当前工作目录）`)
  })

  it('已被 opencode 记进历史的后续轮次不再重复贴', function () {
    const plan = planPrompt(
      [user('第一问'), assistant('第一答'), user('看看 service')],
      { sessionID: 's-1', messageCount: 2 },
      DIRECTORY,
      ROOTS
    )

    expect(plan.text).toBe('看看 service')
  })

  it('只有当前工作目录时没有清单可贴', function () {
    expect(planPrompt([user('看看 service')], null, DIRECTORY, [DIRECTORY]).text).toBe(
      '看看 service'
    )
    expect(planPrompt([user('看看 service')], null, DIRECTORY).text).toBe('看看 service')
  })

  it('没有可发的用户消息时清单也不该单独发出去', function () {
    expect(planPrompt([assistant('只有助手')], null, DIRECTORY, ROOTS).text).toBe('')
  })
})

describe('toPromptFiles · 图片', function () {
  it('裸 base64 补成 data URL', function () {
    expect(
      toPromptFiles(
        user('看图', { images: [{ mediaType: 'image/png', data: 'AAA' }] }),
        DIRECTORY
      )
    ).toEqual([{ uri: 'data:image/png;base64,AAA', name: 'image-1' }])
  })

  it('已经是 data URL 的原样保留', function () {
    const data = 'data:image/jpeg;base64,BBB'

    expect(
      toPromptFiles(user('看图', { images: [{ mediaType: 'image/jpeg', data }] }), DIRECTORY)
    ).toEqual([{ uri: data, name: 'image-1' }])
  })

  it('多张图片各自编号', function () {
    const files = toPromptFiles(
      user('看图', {
        images: [
          { mediaType: 'image/png', data: 'A' },
          { mediaType: 'image/png', data: 'B' }
        ]
      }),
      DIRECTORY
    )

    expect(
      files.map(function (file) {
        return file.name
      })
    ).toEqual(['image-1', 'image-2'])
  })
})

describe('toPromptFiles · 工作区引用', function () {
  it('相对路径解析成 file:// 绝对地址（Windows 盘符要成为 /C:/…）', function () {
    const files = toPromptFiles(user('看这个', { attachments: ['src/a.ts'] }), DIRECTORY)
    const absolute = path.resolve(DIRECTORY, 'src/a.ts').replace(/\\/g, '/').replace(/^\/+/, '')

    expect(files).toHaveLength(1)
    expect(files[0].name).toBe('src/a.ts')
    expect(files[0].uri).toBe(`file:///${absolute}`)
  })

  it('反斜杠与首尾空白先归一（渲染进程给的是平台路径）', function () {
    expect(toPromptFiles(user('x', { attachments: ['  src\\b.ts \n'] }), DIRECTORY)[0].name).toBe(
      'src/b.ts'
    )
  })

  it('拒绝绝对路径 / 盘符 / 上跳（附件读取不经过越界审批）', function () {
    const attachments = ['/etc/passwd', 'C:/Windows/win.ini', 'c:\\windows\\win.ini', '../../secret', 'a/../../b']

    expect(toPromptFiles(user('x', { attachments }), DIRECTORY)).toEqual([])
  })

  it('../ 只是路径段，不误伤文件名里带点的（如 `a..b.ts`）', function () {
    expect(toPromptFiles(user('x', { attachments: ['a..b.ts'] }), DIRECTORY)[0].name).toBe('a..b.ts')
  })

  it('去重、忽略空串，并限制条数', function () {
    const many = Array.from({ length: 40 }, function (_value, index) {
      return `f${index}.ts`
    })

    expect(toPromptFiles(user('x', { attachments: ['a.ts', 'a.ts', '   '] }), DIRECTORY)).toHaveLength(1)
    expect(toPromptFiles(user('x', { attachments: many }), DIRECTORY)).toHaveLength(32)
  })

  it('图片与引用共用一个 files 数组（图片在前）', function () {
    const files = toPromptFiles(
      user('x', { images: [{ mediaType: 'image/png', data: 'A' }], attachments: ['a.ts'] }),
      DIRECTORY
    )

    expect(
      files.map(function (file) {
        return file.name
      })
    ).toEqual(['image-1', 'a.ts'])
  })
})

describe('toSessionTitle · opencode 会话列表可读', function () {
  type StartLike = Parameters<typeof toSessionTitle>[0]

  function startRequest(messages: PromptMessage[]): StartLike {
    return { runID: 'abcdef1234567890', messages } as unknown as StartLike
  }

  it('取首条用户消息并压掉换行', function () {
    const title = toSessionTitle(
      startRequest([assistant('助手先说话'), user('你好\n  世界')])
    )

    expect(title).toBe('你好 世界')
  })

  it('太长时截断（不让会话列表被一行撑爆）', function () {
    expect(toSessionTitle(startRequest([user('x'.repeat(200))]))).toBe(`${'x'.repeat(60)}…`)
  })

  it('没有用户消息时用 runID 兜底', function () {
    expect(toSessionTitle(startRequest([]))).toBe('studio-abcdef12')
    expect(toSessionTitle(startRequest([user('   ')]))).toBe('studio-abcdef12')
  })
})

describe('SessionStore · 映射持久化', function () {
  function createStore(initial: Record<string, unknown> = {}) {
    let current = initial
    const store = new SessionStore({
      toRead: function () {
        return current
      },
      toWrite: function (value) {
        current = value
      }
    })
    return {
      store,
      toRaw: function () {
        return current
      }
    }
  }

  it('写入后能读回', function () {
    const { store } = createStore()
    store.toWrite('thread-1', { sessionID: 's-1', messageCount: 4 })

    expect(store.find('thread-1')).toEqual({ sessionID: 's-1', messageCount: 4 })
  })

  it('缺失或形状不对的记录按「没有映射」处理（不能凭半个记录恢复会话）', function () {
    const { store } = createStore({
      missing: { messageCount: 1 },
      empty: { sessionID: '', messageCount: 1 },
      badCount: { sessionID: 's-1', messageCount: 'x' },
      notObject: 'nope'
    })

    expect(store.find('unknown')).toBeNull()
    expect(store.find('missing')).toBeNull()
    expect(store.find('empty')).toBeNull()
    expect(store.find('badCount')).toBeNull()
    expect(store.find('notObject')).toBeNull()
  })

  it('删除只动自己那条，别的线程的映射要留着', function () {
    const { store, toRaw } = createStore()
    store.toWrite('thread-1', { sessionID: 's-1', messageCount: 1 })
    store.toWrite('thread-2', { sessionID: 's-2', messageCount: 2 })

    store.toRemove('thread-1')

    expect(store.find('thread-1')).toBeNull()
    expect(store.find('thread-2')).toEqual({ sessionID: 's-2', messageCount: 2 })
    expect(Object.keys(toRaw())).toEqual(['thread-2'])
  })
})
