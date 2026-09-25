import { describe, expect, it } from 'vitest'

import { CHANNELS } from '../channels'
import { INVOKE_SPECS } from './index'

/** assistant-ui `generateId()` 的产物形状：7 位 nanoid，不是 uuid */
const NANOID = 'a1B2c3D'
const SESSION_ID = '2f8b0f2e-6d3c-4a51-9c2b-1c0f5a7d9e10'

function parse(channel: string, payload: unknown) {
  const spec = INVOKE_SPECS[channel as keyof typeof INVOKE_SPECS]
  return spec.in.safeParse(payload)
}

describe('chat 消息契约', function () {
  it('接受 runtime 生成的 nanoid 消息 id', function () {
    const result = parse(CHANNELS.CHAT.MESSAGE.APPEND, {
      id: NANOID,
      sessionID: SESSION_ID,
      parentID: null,
      format: 'ith/thread-message-like',
      content: '{"role":"user"}'
    })
    expect(result.success).toBe(true)
  })

  it('接受 nanoid 的 parentID（分支/重试会指向另一条 runtime 消息）', function () {
    const result = parse(CHANNELS.CHAT.MESSAGE.APPEND, {
      sessionID: SESSION_ID,
      parentID: 'Zz9x8Y7',
      format: 'ith/thread-message-like',
      content: '{}'
    })
    expect(result.success).toBe(true)
  })

  it('省略 id 时由主进程兜底生成', function () {
    const result = parse(CHANNELS.CHAT.MESSAGE.APPEND, {
      sessionID: SESSION_ID,
      format: 'ith/thread-message-like',
      content: '{}'
    })
    expect(result.success).toBe(true)
  })

  it('拒绝空消息 id', function () {
    const result = parse(CHANNELS.CHAT.MESSAGE.APPEND, {
      id: '',
      sessionID: SESSION_ID,
      format: 'ith/thread-message-like',
      content: '{}'
    })
    expect(result.success).toBe(false)
  })

  it('更新与删除按 runtime id 定位', function () {
    expect(parse(CHANNELS.CHAT.MESSAGE.UPDATE, { id: NANOID, content: '{}' }).success).toBe(true)
    expect(parse(CHANNELS.CHAT.MESSAGE.REMOVE, { id: NANOID }).success).toBe(true)
    expect(parse(CHANNELS.CHAT.MESSAGE.REMOVE, { id: '' }).success).toBe(false)
  })

  it('会话 id 仍是本进程生成的 uuid', function () {
    expect(parse(CHANNELS.CHAT.SESSION.REMOVE, { id: SESSION_ID }).success).toBe(true)
    expect(parse(CHANNELS.CHAT.SESSION.REMOVE, { id: NANOID }).success).toBe(false)
    expect(parse(CHANNELS.CHAT.MESSAGE.READ, { sessionID: SESSION_ID }).success).toBe(true)
    expect(parse(CHANNELS.CHAT.MESSAGE.READ, { sessionID: NANOID }).success).toBe(false)
  })
})
