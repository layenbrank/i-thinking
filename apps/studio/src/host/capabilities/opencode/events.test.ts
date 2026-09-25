import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createEventMapper, describeOpencodeError } from './events'

/**
 * 事件翻译层是「opencode v2 事件」与「studio 端口协议」之间唯一的接缝，三条约束都是实测出来的：
 * 1. 工具名只在 `session.tool.input.started` 里出现（`called` 只给 input，`success`/`failed`
 *    连名字都没有）⇒ 必须自己按 callID 记名字；
 * 2. `ended` 带着整段文本 ⇒ 已经发过增量的块不能再补发一遍；
 * 3. 终态**不由这里产出**（可重试失败之后还会有第二次尝试）⇒ 这里只给 `findResult()`。
 */

const RUN_ID = 'run-1'

function toData(partial: Record<string, unknown>): Record<string, unknown> {
  return { sessionID: 's-1', assistantMessageID: 'm-1', ...partial }
}

describe('文本与推理增量', function () {
  it('delta 原样翻成 text 事件', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'session.text.delta', data: toData({ delta: '你好', ordinal: 0 }) }))
      .toEqual([{ kind: 'text', runID: RUN_ID, blockID: 'text:m-1:0', text: '你好' }])
  })

  it('空 delta 不产事件（模型偶尔发空串）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'session.text.delta', data: toData({ delta: '', ordinal: 0 }) }))
      .toEqual([])
    expect(mapper.map({ type: 'session.text.delta', data: toData({ ordinal: 0 }) })).toEqual([])
  })

  it('ended 带的整段文本在发过增量后不再补发（否则正文会重复一遍）', function () {
    const mapper = createEventMapper(RUN_ID)

    mapper.map({ type: 'session.text.delta', data: toData({ delta: '你', ordinal: 0 }) })
    expect(
      mapper.map({ type: 'session.text.ended', data: toData({ text: '你好', ordinal: 0 }) })
    ).toEqual([])
  })

  it('没有增量的整段（模型直出整段）补发一次', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({ type: 'session.text.ended', data: toData({ text: '整段回答', ordinal: 0 }) })
    ).toEqual([{ kind: 'text', runID: RUN_ID, blockID: 'text:m-1:0', text: '整段回答' }])

    // 再发一次也不重复
    expect(
      mapper.map({ type: 'session.text.ended', data: toData({ text: '整段回答', ordinal: 0 }) })
    ).toEqual([])
  })

  it('同一序号下推理与正文各占一个块（不会串进正文）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({ type: 'session.reasoning.delta', data: toData({ delta: '想', ordinal: 0 }) })
    ).toEqual([{ kind: 'reasoning', runID: RUN_ID, blockID: 'reasoning:m-1:0', text: '想' }])
    expect(
      mapper.map({ type: 'session.text.delta', data: toData({ delta: '答', ordinal: 0 }) })
    ).toEqual([{ kind: 'text', runID: RUN_ID, blockID: 'text:m-1:0', text: '答' }])
  })

  it('不同消息 / 不同序号的块各自独立', function () {
    const mapper = createEventMapper(RUN_ID)

    mapper.map({ type: 'session.text.delta', data: toData({ delta: 'a', ordinal: 0 }) })

    expect(
      mapper.map({ type: 'session.text.ended', data: toData({ text: 'b', ordinal: 1 }) })
    ).toEqual([{ kind: 'text', runID: RUN_ID, blockID: 'text:m-1:1', text: 'b' }])
  })
})

describe('工具调用', function () {
  it('工具名由 input.started 记住，called 只补入参', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({
        type: 'session.tool.input.started',
        data: toData({ id: 'c-1', name: 'read' })
      })
    ).toEqual([])

    expect(
      mapper.map({ type: 'session.tool.called', data: toData({ id: 'c-1', input: { path: 'a' } }) })
    ).toEqual([
      {
        kind: 'tool-call',
        runID: RUN_ID,
        toolCallId: 'c-1',
        toolName: 'read',
        input: { path: 'a' }
      }
    ])
  })

  it('同一个 callID 只宣告一次 tool-call', function () {
    const mapper = createEventMapper(RUN_ID)
    mapper.map({ type: 'session.tool.input.started', data: toData({ id: 'c-1', name: 'read' }) })
    mapper.map({ type: 'session.tool.called', data: toData({ id: 'c-1', input: {} }) })

    expect(mapper.map({ type: 'session.tool.called', data: toData({ id: 'c-1', input: {} }) }))
      .toEqual([])
  })

  it('没等到 input.started 就用 unknown（宁可名字难看，也不能丢事件）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'session.tool.called', data: toData({ id: 'c-9', input: {} }) }))
      .toMatchObject([{ toolName: 'unknown', toolCallId: 'c-9' }])
  })

  it('success 把纯文本内容拼成字符串', function () {
    const mapper = createEventMapper(RUN_ID)
    mapper.map({ type: 'session.tool.input.started', data: toData({ id: 'c-1', name: 'grep' }) })

    expect(
      mapper.map({
        type: 'session.tool.success',
        data: toData({
          id: 'c-1',
          content: [
            { type: 'text', text: '第一行' },
            { type: 'text', text: '第二行' }
          ]
        })
      })
    ).toEqual([
      {
        kind: 'tool-result',
        runID: RUN_ID,
        toolCallId: 'c-1',
        toolName: 'grep',
        output: '第一行\n第二行',
        isError: false
      }
    ])
  })

  it('混了非文本内容时原样交给界面', function () {
    const mapper = createEventMapper(RUN_ID)
    const content = [{ type: 'text', text: 'a' }, { type: 'file', uri: 'file:///a.png' }]

    expect(mapper.map({ type: 'session.tool.success', data: toData({ id: 'c-1', content }) }))
      .toMatchObject([{ output: content }])
  })

  it('failed 走 isError 并把错误文案当输出', function () {
    const mapper = createEventMapper(RUN_ID)
    mapper.map({ type: 'session.tool.input.started', data: toData({ id: 'c-1', name: 'shell' }) })

    expect(
      mapper.map({ type: 'session.tool.failed', data: toData({ id: 'c-1', error: '命令退出码 1' }) })
    ).toEqual([
      {
        kind: 'tool-result',
        runID: RUN_ID,
        toolCallId: 'c-1',
        toolName: 'shell',
        output: '命令退出码 1',
        isError: true
      }
    ])
  })

  it('没有错误文案时也给一句能读的', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'session.tool.failed', data: toData({ id: 'c-1' }) })).toMatchObject(
      [{ output: '工具执行失败', isError: true }]
    )
  })

  it('同一个 callID 只出一次工具结果（success 与 failed 都发也不重复）', function () {
    const mapper = createEventMapper(RUN_ID)
    mapper.map({ type: 'session.tool.success', data: toData({ id: 'c-1', content: 'ok' }) })

    expect(mapper.map({ type: 'session.tool.failed', data: toData({ id: 'c-1', error: 'x' }) }))
      .toEqual([])
  })

  it('缺 callID 的事件丢掉（没有 id 就无法与工具卡对上）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'session.tool.called', data: toData({}) })).toEqual([])
    expect(mapper.map({ type: 'session.tool.success', data: toData({}) })).toEqual([])
  })
})

describe('权限询问', function () {
  it('toolCallId 取 source.id（data.id 是询问自己的 id）', function () {
    const mapper = createEventMapper(RUN_ID)
    mapper.map({ type: 'session.tool.input.started', data: toData({ id: 'c-1', name: 'edit' }) })
    mapper.map({
      type: 'session.tool.called',
      data: toData({ id: 'c-1', input: { filePath: 'a.ts' } })
    })

    expect(
      mapper.map({
        type: 'permission.asked',
        data: toData({
          id: 'p-1',
          action: 'edit',
          resources: ['a.ts'],
          source: { type: 'tool', messageID: 'm-1', id: 'c-1' }
        })
      })
    ).toEqual([
      {
        kind: 'tool-approval-request',
        runID: RUN_ID,
        toolCallId: 'c-1',
        toolName: 'edit',
        input: { filePath: 'a.ts' },
        prompt: '修改文件：a.ts'
      }
    ])
  })

  it('没有 source 时退回询问 id（至少能回执）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({
        type: 'permission.asked',
        data: toData({ id: 'p-1', action: 'shell', resources: ['rm -rf /'] })
      })
    ).toMatchObject([{ toolCallId: 'p-1', toolName: 'shell', prompt: '执行命令：rm -rf /' }])
  })

  it('缺 action / sessionID / id 的询问丢掉（回执发不出去）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'permission.asked', data: toData({}) })).toEqual([])
    expect(
      mapper.map({ type: 'permission.asked', data: { id: 'p-1', action: 'edit' } })
    ).toEqual([])
  })

  it('resources 里的非字符串被过滤（上游可能给对象）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({
        type: 'permission.asked',
        data: toData({ id: 'p-1', action: 'read', resources: ['a.ts', 1, null] })
      })
    ).toMatchObject([{ prompt: '读取文件：a.ts' }])
  })
})

describe('过程事件与终态', function () {
  beforeEach(function () {
    vi.spyOn(console, 'warn').mockImplementation(function () {})
  })

  afterEach(function () {
    vi.restoreAllMocks()
  })

  it('step.ended 累计 token 与 finish，本身不产事件', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({
        type: 'session.step.ended',
        data: toData({ finish: 'tool-calls', tokens: { input: 10, output: 5 } })
      })
    ).toEqual([])

    mapper.map({
      type: 'session.step.ended',
      data: toData({ finish: 'stop', tokens: { input: 3, output: 2 } })
    })

    expect(mapper.findResult()).toEqual({
      finishReason: 'stop',
      usage: { inputTokens: 13, outputTokens: 7, totalTokens: 20 }
    })
  })

  it('没有 finish / token 时给安全默认值', function () {
    expect(createEventMapper(RUN_ID).findResult()).toEqual({
      finishReason: 'stop',
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    })
  })

  it('step.failed / retry.scheduled 只记日志，不当终态（还会重试）', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(
      mapper.map({ type: 'session.retry.scheduled', data: toData({ error: { message: 'boom' } }) })
    ).toEqual([])
    expect(mapper.map({ type: 'session.step.failed', data: toData({ error: 'boom' }) })).toEqual([])
    expect(console.warn).toHaveBeenCalledTimes(2)
  })

  it('不认识的事件类型与非对象 data 一律忽略', function () {
    const mapper = createEventMapper(RUN_ID)

    expect(mapper.map({ type: 'session.idle', data: toData({}) })).toEqual([])
    expect(mapper.map({ type: 'session.execution.succeeded', data: toData({}) })).toEqual([])
    expect(mapper.map({ type: 'session.text.delta' })).toEqual([])
    expect(mapper.map({ type: 'session.text.delta', data: 'not-an-object' })).toEqual([])
    expect(mapper.map({})).toEqual([])
  })
})

describe('describeOpencodeError · 网关失败信封', function () {
  it('普通错误原样返回', function () {
    expect(describeOpencodeError(new Error('boom'))).toBe('boom')
    expect(describeOpencodeError('boom')).toBe('boom')
  })

  it('空错误也要有一句话', function () {
    expect(describeOpencodeError(undefined)).toBe('未知错误')
    expect(describeOpencodeError({})).toBe('未知错误')
  })

  it('从报文里抠出网关的 code + msg（HTTP 200 的失败信封）', function () {
    const text =
      'Response stream ended without a finish reason. body={"code":400006,"msg":"配额已用尽"}'

    expect(describeOpencodeError(new Error(text))).toBe('400006: 配额已用尽')
  })

  it('信封被转义过一层也能认出来', function () {
    const text = 'upstream error: {"error":"{\\"code\\":400006,\\"msg\\":\\"配额已用尽\\"}"}'

    expect(describeOpencodeError(text)).toBe('400006: 配额已用尽')
  })

  it('只有 msg 没有 code 时不给空冒号', function () {
    expect(describeOpencodeError('{"msg":"模型不存在"}')).toBe('模型不存在')
  })

  it('认不出信封时给出原始报文', function () {
    expect(describeOpencodeError(new Error('connect ECONNREFUSED'))).toBe('connect ECONNREFUSED')
  })
})
