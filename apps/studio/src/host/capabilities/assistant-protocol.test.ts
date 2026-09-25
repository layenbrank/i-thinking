import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  findErrorMessage,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_CHARS,
  MAX_CONCURRENT_RUNS,
  MAX_CONTENT_CHARS,
  MAX_MESSAGES,
  MAX_PAYLOAD_CHARS,
  receiveInbound,
  type InboundRequest,
  type PortEvent
} from './assistant-protocol'

const RUN_ID = 'run-1'

/** 收下的请求；被拒时为 null —— 只关心「收下没」的用例用它 */
function findParsed(raw: unknown): InboundRequest | null {
  const outcome = receiveInbound(raw)
  return outcome.kind === 'ok' ? outcome.request : null
}

/** 被拒时回给界面的那条终态；`null` 表示这次不必回话（单向消息、捞不到 runID） */
function findRejection(raw: unknown): Extract<PortEvent, { kind: 'error' }> | null {
  const outcome = receiveInbound(raw)
  return outcome.kind === 'rejected' ? outcome.event : null
}

beforeEach(function () {
  // 校验失败会打一行 warn（生产里是排障的唯一线索），测试里不该刷屏
  vi.spyOn(console, 'warn').mockImplementation(function () {})
})

function validStart() {
  return {
    kind: 'start',
    runID: RUN_ID,
    providerID: 'provider-1',
    model: 'qwen3:8b',
    messages: [{ role: 'user', content: '你好' }]
  }
}

describe('receiveInbound · 入站校验', function () {
  it('接受合法的 start / abort', function () {
    expect(findParsed(validStart())).toEqual(validStart())
    expect(findParsed({ kind: 'abort', runID: RUN_ID })).toEqual({ kind: 'abort', runID: RUN_ID })
  })

  it('接受消息级 system 角色，且不接受未知角色', function () {
    const withSystemMessage = {
      ...validStart(),
      messages: [
        { role: 'system', content: '你是助手' },
        { role: 'user', content: '你好' }
      ]
    }
    expect(findParsed(withSystemMessage)).toEqual(withSystemMessage)

    const badRole = {
      ...validStart(),
      messages: [{ role: 'tool', content: 'x' }]
    }
    expect(findParsed(badRole)).toBeNull()
  })

  it('顶层不再有 system（系统提示词只走 messages，档位由 agent 决定）', function () {
    const parsed = findParsed({ ...validStart(), system: '你是助手' })

    expect(parsed).toEqual(validStart())
    expect(parsed).not.toHaveProperty('system')
  })

  it('接受工作区引用，拒绝超量与超长路径', function () {
    const withAttachments = {
      ...validStart(),
      messages: [{ role: 'user', content: '看这些', attachments: ['src/a.ts', 'docs/b.md'] }]
    }
    expect(findParsed(withAttachments)).toEqual(withAttachments)

    const tooMany = {
      ...validStart(),
      messages: [
        {
          role: 'user',
          content: 'x',
          attachments: Array.from({ length: MAX_ATTACHMENTS + 1 }, function (_, index) {
            return `file-${index}.ts`
          })
        }
      ]
    }
    expect(findParsed(tooMany)).toBeNull()

    const tooLong = {
      ...validStart(),
      messages: [
        { role: 'user', content: 'x', attachments: ['x'.repeat(MAX_ATTACHMENT_CHARS + 1)] }
      ]
    }
    expect(findParsed(tooLong)).toBeNull()

    const empty = {
      ...validStart(),
      messages: [{ role: 'user', content: 'x', attachments: [''] }]
    }
    expect(findParsed(empty)).toBeNull()
  })

  it('host 扩展：工具能力 / 审批档位 / 会话 / 工作区', function () {
    const host = {
      supportsTools: false,
      approval: 'readonly',
      sessionID: '11111111-1111-4111-8111-111111111111',
      workspaceID: '22222222-2222-4222-8222-222222222222',
      platformToken: 'jwt-token',
      tenantID: '33333333-3333-4333-8333-333333333333'
    }
    expect(findParsed({ ...validStart(), host })).toEqual({ ...validStart(), host })

    for (const approval of ['ask', 'auto', 'readonly']) {
      expect(findParsed({ ...validStart(), host: { approval } })).not.toBeNull()
    }

    // 档位是封闭枚举 + id 必须是 uuid：渲染进程不能塞任意字符串进来
    expect(findParsed({ ...validStart(), host: { approval: 'yolo' } })).toBeNull()
    expect(findParsed({ ...validStart(), host: { sessionID: 'not-a-uuid' } })).toBeNull()
    expect(findParsed({ ...validStart(), host: { tenantID: 'not-a-uuid' } })).toBeNull()
    expect(findParsed({ ...validStart(), host: { platformToken: 'x'.repeat(4097) } })).toBeNull()
    expect(findParsed({ ...validStart(), host: { platformToken: '' } })).toBeNull()
  })

  it('拒绝未知 kind 与缺字段的消息', function () {
    expect(findParsed({ kind: 'stop', runID: RUN_ID })).toBeNull()
    expect(findParsed({ kind: 'start', runID: RUN_ID })).toBeNull()
    expect(findParsed(null)).toBeNull()
    expect(findParsed('start')).toBeNull()
  })

  it('接受带图片的用户消息，拒绝超长图片', function () {
    const withImage = {
      ...validStart(),
      messages: [
        {
          role: 'user',
          content: '看这张图',
          images: [{ mediaType: 'image/png', data: 'data:image/png;base64,a' }]
        }
      ]
    }
    expect(findParsed(withImage)).toEqual(withImage)

    const tooBig = {
      ...validStart(),
      messages: [
        {
          role: 'user',
          content: '看这张图',
          images: [{ mediaType: 'image/png', data: 'x'.repeat(700_001) }]
        }
      ]
    }
    expect(findParsed(tooBig)).toBeNull()
  })

  it('拒绝超量消息、超长正文', function () {
    const tooMany = {
      ...validStart(),
      messages: Array.from({ length: MAX_MESSAGES + 1 }, function () {
        return { role: 'user', content: 'x' }
      })
    }
    expect(findParsed(tooMany)).toBeNull()

    const tooLong = {
      ...validStart(),
      messages: [{ role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS + 1) }]
    }
    expect(findParsed(tooLong)).toBeNull()
  })

  it('拒绝超过 payload 上限的消息（含不可序列化对象）', function () {
    // 每条都在正文上限内，但总量超过 payload 上限
    const huge = {
      ...validStart(),
      messages: Array.from({ length: 20 }, function () {
        return { role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS) }
      })
    }
    expect(JSON.stringify(huge).length).toBeGreaterThan(MAX_PAYLOAD_CHARS)
    expect(findParsed(huge)).toBeNull()

    expect(findParsed({ ...validStart(), huge: 1n })).toBeNull()
  })

  it('并发上限是大于 1 的小常数', function () {
    expect(MAX_CONCURRENT_RUNS).toBeGreaterThan(1)
    expect(MAX_CONCURRENT_RUNS).toBeLessThanOrEqual(8)
  })
})

describe('receiveInbound · 拒收回话', function () {
  /** 断言确实回了话并取出文案：拒了不回话 = 渲染进程永远挂在等结果上 */
  function rejectMessage(raw: unknown): string {
    const rejection = findRejection(raw)
    if (!rejection) throw new Error('应当回一个 error 事件')
    return rejection.message
  }

  it('给被拒的 start 回一个 error 终态', function () {
    const oversized = {
      ...validStart(),
      messages: [{ role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS + 1) }]
    }
    expect(findParsed(oversized)).toBeNull()

    expect(findRejection(oversized)).toEqual({
      kind: 'error',
      runID: RUN_ID,
      message: expect.stringContaining(String(MAX_CONTENT_CHARS))
    })

    const tooMany = {
      ...validStart(),
      messages: Array.from({ length: MAX_MESSAGES + 1 }, function () {
        return { role: 'user', content: 'x' }
      })
    }
    expect(findParsed(tooMany)).toBeNull()
    expect(findRejection(tooMany)).toMatchObject({ kind: 'error', runID: RUN_ID })
  })

  it('消息里说清三个上限和新开会话的出路', function () {
    const message = rejectMessage({
      ...validStart(),
      messages: [{ role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS + 1) }]
    })

    expect(message).toContain(String(MAX_MESSAGES))
    expect(message).toContain(String(MAX_PAYLOAD_CHARS))
    expect(message).toContain('新开会话')
  })

  it('整包超限时也给「砍内容」的出路（这条连 zod issues 都没有）', function () {
    const huge = {
      ...validStart(),
      messages: Array.from({ length: 20 }, function () {
        return { role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS) }
      })
    }

    expect(rejectMessage(huge)).toContain('新开会话')
  })

  it('单向消息（abort / tool-approval）被拒时不回话', function () {
    expect(findRejection({ kind: 'abort' })).toBeNull()
    expect(findRejection({ kind: 'tool-approval', runID: RUN_ID, approved: true })).toBeNull()
  })

  it('形状不合规时说「重启应用」：让人去新开会话是白跑一趟', function () {
    const brokenShape = { kind: 'start', runID: RUN_ID }
    expect(findParsed(brokenShape)).toBeNull()

    const message = rejectMessage(brokenShape)
    expect(message).toContain('格式')
    expect(message).toContain('重启')
    expect(message).not.toContain('新开会话')
  })

  it('合规载荷走 ok 分支：收下请求，也不必回话', function () {
    expect(receiveInbound(validStart())).toEqual({ kind: 'ok', request: validStart() })
  })

  it('捞不到 runID 就真的只能沉默（回过去也没人认领）', function () {
    expect(findRejection(null)).toBeNull()
    expect(findRejection('start')).toBeNull()
    expect(findRejection({ kind: 'start' })).toBeNull()
    expect(findRejection({ kind: 'start', runID: '' })).toBeNull()
    expect(findRejection({ kind: 'start', runID: 42 })).toBeNull()
    expect(findRejection({ kind: 'start', runID: 'x'.repeat(65) })).toBeNull()
    expect(findRejection({ kind: 'start', runID: 'x'.repeat(64) })).toMatchObject({
      kind: 'error',
      runID: 'x'.repeat(64)
    })
  })
})

describe('findErrorMessage', function () {
  it('原样返回普通错误', function () {
    expect(findErrorMessage(new Error('boom'))).toBe('boom')
    expect(findErrorMessage('plain')).toBe('plain')
    expect(findErrorMessage(null)).toBe('Unknown error')
  })

  it('404 提示检查 provider 的服务地址', function () {
    const error = Object.assign(new Error('Not Found'), { statusCode: 404 })

    expect(findErrorMessage(error)).toContain('服务地址')
  })

  it('配额触顶指出「去哪加量」（上游只回一句文案）', function () {
    const message = findErrorMessage(
      Object.assign(new Error('AI_APICallError: {"code":400006,"msg":"配额已用尽"}'), {
        statusCode: 429
      })
    )

    expect(message).toContain('400006')
    expect(message).toContain('设置 → 额度')
  })

  it('配额提示也认纯中文文案', function () {
    expect(findErrorMessage(new Error('配额已用尽'))).toContain('设置 → 额度')
  })

  it('认 v2 的结构化错误对象（{type, message, status}）', function () {
    const quota = { type: 'api_error', status: 429, message: '{"code":400006,"msg":"配额已用尽"}' }
    expect(findErrorMessage(quota)).toContain('设置 → 额度')

    const notFound = { status: 404, message: 'Not Found' }
    expect(findErrorMessage(notFound)).toContain('服务地址')

    expect(findErrorMessage({ message: 'boom' })).toBe('boom')
    expect(findErrorMessage({ status: 500 })).toBe('Unknown error')
    expect(findErrorMessage({ message: '' })).toBe('Unknown error')
  })
})
