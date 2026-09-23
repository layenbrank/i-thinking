import { describe, expect, it } from 'vitest'

import type { CorexRun } from '@/stores/corex'
import type { CorexFrame } from '@/stores/run-logs'

import { formatFrames, formatLogText, formatRunLogs } from './run-log'

/** 固定时刻，避免断言跟着系统时钟走 */
const AT = new Date(2026, 0, 1, 12, 34, 56, 789)

function frame(partial: Partial<CorexFrame> & Pick<CorexFrame, 'kind'>): CorexFrame {
  return { runId: 'run-1', step: 'build', action: 'shell.run', receivedAt: AT, ...partial }
}

function frames(...kinds: Array<CorexFrame['kind']>): CorexFrame[] {
  return kinds.map(function (kind, index) {
    return frame({ kind, step: `step-${index}` })
  })
}

function run(partial: Partial<CorexRun> = {}): CorexRun {
  return {
    id: 'run-1',
    name: 'build-intern',
    status: 'ok',
    startedAt: AT,
    endedAt: AT,
    doneSteps: 0,
    result: null,
    error: null,
    ...partial
  }
}

describe('formatFrames', function () {
  it('numbers lines from the frame index', function () {
    const actual = formatFrames([frame({ kind: 'step_start' })])

    expect(actual[0].id).toBe(0)
    expect(actual[0].message).toContain('[build] [step_start]')
  })

  it('marks a failed step as an error', function () {
    const actual = formatFrames([frame({ kind: 'step_end', ok: false, took_ms: 12 })])

    expect(actual[0].level).toBe('error')
    expect(actual[0].message).toContain('step_fail')
    expect(actual[0].message).toContain('(12ms)')
  })

  it('stamps each line with the moment its frame arrived', function () {
    const actual = formatFrames([
      frame({ kind: 'step_start', receivedAt: new Date(2026, 0, 1, 12, 0, 0, 1) }),
      frame({ kind: 'step_end', receivedAt: new Date(2026, 0, 1, 12, 0, 5, 2) })
    ])

    expect(
      actual.map(function (entry) {
        return entry.time
      })
    ).toEqual(['12:00:00.001', '12:00:05.002'])
  })

  it('merges adjacent chunks of one stream into a single block', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: 'first\n' }),
      frame({ kind: 'step_output', stream: 'stdout', text: 'second\n' })
    ])

    expect(actual).toHaveLength(1)
    expect(actual[0].message).toBe('[build] [stdout]\nfirst\nsecond\n')
    expect(actual[0].time).toBe('12:34:56.789')
  })

  it('breaks the line when the stream, the step or the frame kind changes', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: 'out' }),
      frame({ kind: 'step_output', stream: 'stderr', text: 'err' }),
      frame({ kind: 'step_start', step: 'next' }),
      frame({ kind: 'step_output', step: 'next', stream: 'stdout', text: 'out' })
    ])

    expect(
      actual.map(function (entry) {
        return entry.message
      })
    ).toEqual([
      '[build] [stdout]\nout',
      '[build] [stderr]\nerr',
      '[next] [step_start]\nshell.run',
      '[next] [stdout]\nout'
    ])
  })

  it('keeps only the tail of an output line that grew past the limit', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: 'x'.repeat(60_000) }),
      frame({ kind: 'step_output', stream: 'stdout', text: 'y'.repeat(10) })
    ])

    expect(actual).toHaveLength(1)
    expect(actual[0].message).toContain('更早的输出已省略')
    expect(actual[0].message.endsWith('y'.repeat(10))).toBe(true)
  })

  it('starts a new block once one grew past the line limit', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: 'x\n'.repeat(45) }),
      frame({
        kind: 'step_output',
        stream: 'stdout',
        text: 'tail\n',
        receivedAt: new Date(2026, 0, 1, 12, 0, 9, 9)
      })
    ])

    expect(actual).toHaveLength(2)
    expect(actual[0].message.startsWith('[build] [stdout]\n')).toBe(true)
    expect(actual[1].time).toBe('12:00:09.009')
    expect(actual[1].message.endsWith('tail\n')).toBe(true)
  })

  it('keeps the newest blocks and marks the lost head', function () {
    const overflow: CorexFrame[] = []
    for (let index = 0; index < 14; index += 1) {
      overflow.push(
        frame({
          kind: 'step_output',
          stream: 'stdout',
          text: 'x\n'.repeat(45),
          receivedAt: new Date(2026, 0, 1, 12, 0, index, 0)
        })
      )
    }
    const actual = formatFrames(overflow)

    expect(actual).toHaveLength(12)
    expect(actual[0].message.startsWith('…（更早的输出已省略）')).toBe(true)
    expect(actual[0].message).toContain('[build] [stdout]')
    expect(
      actual.map(function (entry) {
        return entry.id
      })
    ).toEqual([...Array(12).keys()])
  })

  it('drops the colour escapes a child process left in its output', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: '\u001b[32mok\u001b[0m 完成\n' })
    ])

    expect(actual[0].message).toBe('[build] [stdout]\nok 完成\n')
  })

  it('keeps only the last redraw of a progress line', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: '10%\r50%\r' }),
      frame({ kind: 'step_output', stream: 'stdout', text: '100% 好了\n' })
    ])

    expect(actual[0].message).toBe('[build] [stdout]\n100% 好了\n')
  })

  it('reads CRLF as one line break instead of a redraw', function () {
    const actual = formatFrames([
      frame({ kind: 'step_output', stream: 'stdout', text: 'first\r\nsecond\r\n' })
    ])

    expect(actual[0].message).toBe('[build] [stdout]\nfirst\nsecond\n')
  })
})

describe('formatRunLogs', function () {
  it('counts the steps corex actually ran and warns about the skipped ones', function () {
    const actual = formatRunLogs(
      run({ doneSteps: 2, result: null }),
      frames('step_start', 'step_end', 'step_start', 'step_end'),
      3
    )

    expect(actual[4]).toEqual({
      id: 4,
      time: '12:34:56.789',
      level: 'success',
      message: '运行完成 · 执行 2/3 步，1 步未执行'
    })
    // 终帧是 null：最后一步被 when 跳过，corex 没东西可返回
    expect(actual[5].message).toContain('最后一步没有返回值')
  })

  it('spreads a shell result into readable lines', function () {
    const actual = formatRunLogs(
      run({
        doneSteps: 1,
        result: { exit_code: 0, success: true, stdout: 'done\n', stderr: 'warn' }
      }),
      frames('step_end'),
      1
    )

    expect(
      actual.map(function (entry) {
        return entry.message
      })
    ).toEqual([
      '[step-0] [step_ok] shell.run\ncompleted',
      '运行完成 · 执行 1/1 步',
      '退出码 0',
      'stdout\ndone',
      'stderr\nwarn'
    ])
  })

  it('flags a result that reports failure', function () {
    const actual = formatRunLogs(
      run({ doneSteps: 1, result: { success: false, stderr: 'boom' } }),
      frames('step_end'),
      1
    )

    expect(actual[2].level).toBe('error')
    expect(actual[3].level).toBe('error')
  })

  it('falls back to json for a result it cannot unfold', function () {
    const actual = formatRunLogs(run({ doneSteps: 1, result: { total: 2 } }), frames('step_end'), 1)

    expect(actual[2].message).toBe('返回值\n{\n  "total": 2\n}')
  })

  it('truncates a long result', function () {
    const actual = formatRunLogs(
      run({ doneSteps: 1, result: { stdout: 'x'.repeat(5000) } }),
      frames('step_end'),
      1
    )

    expect(actual[2].message).toContain('已截断，共 5000 字符')
  })

  it('says how far a failed run got and prints the reason next to it', function () {
    const actual = formatRunLogs(
      run({ status: 'failed', doneSteps: 1, error: '源路径不存在' }),
      frames('step_end'),
      3
    )

    expect(actual[1]).toEqual({
      id: 1,
      time: '12:34:56.789',
      level: 'error',
      message: '运行失败 · 已执行 1/3 步'
    })
    expect(actual[2].message).toBe('源路径不存在')
  })

  it('leaves a running task without an outcome, so the log keeps growing', function () {
    const actual = formatRunLogs(run({ status: 'running', endedAt: null }), frames('step_start'), 3)

    expect(actual).toHaveLength(1)
    expect(actual[0].message).toContain('[step-0] [step_start]')
  })

  it('cleans the control junk out of a failure reason too', function () {
    const actual = formatRunLogs(
      run({ status: 'failed', doneSteps: 1, error: '\u001b[31m源路径不存在\u001b[0m' }),
      frames('step_end'),
      3
    )

    expect(actual[2].message).toBe('源路径不存在')
  })

  it('omits the total when the directive is not loaded', function () {
    const actual = formatRunLogs(run({ result: 'ok' }), [], 0)

    expect(actual[0].message).toBe('运行完成 · 执行 0 步')
    expect(actual[1].message).toBe('ok')
  })
})

describe('formatLogText', function () {
  it('pairs every line with its time and level', function () {
    const text = formatLogText([
      { id: 0, time: '12:34:56.789', level: 'info', message: '[build] [step_start]' },
      { id: 1, time: '12:34:57.000', level: 'error', message: '源路径不存在' }
    ])

    expect(text).toBe(
      '12:34:56.789 [INFO] [build] [step_start]\n12:34:57.000 [ERROR] 源路径不存在'
    )
  })

  it('keeps a multi-line block as one entry', function () {
    const text = formatLogText([
      { id: 0, time: '12:34:56.789', level: 'info', message: 'stdout\nline one\nline two' }
    ])

    expect(text.split('\n')).toHaveLength(3)
  })

  it('yields an empty string when there is nothing to copy', function () {
    expect(formatLogText([])).toBe('')
  })
})
