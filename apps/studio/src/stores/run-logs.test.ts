import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CorexFrame } from '@/stores/run-logs'
import {
  MAX_FRAMES,
  appendRunFrame,
  dropRunFrames,
  findRunFrames,
  flushRunFrames,
  registerRun
} from '@/stores/run-logs'

/**
 * 攒批是性能的核心：一帧一次 setState 会让整个指令页跟着输出流重渲染。这里盯住三件事 ——
 * 定时器到点前不落地、只换本批涉事运行的取值、长跑任务的帧有上限。
 */

const AT = new Date(2026, 0, 1, 12, 0, 0, 0)

const IDS = ['a', 'b', 'long']

function frame(runId: string, index: number): CorexFrame {
  return {
    kind: 'step_output',
    runId,
    step: `step-${index}`,
    action: 'shell.run',
    stream: 'stdout',
    text: `${runId}-${index}`,
    receivedAt: AT
  }
}

function texts(runId: string): string[] {
  return findRunFrames(runId).frames.map(function (entry) {
    return entry.text ?? ''
  })
}

beforeEach(function () {
  vi.useFakeTimers()
  flushRunFrames()
  dropRunFrames(IDS)
  // 帧只认登记过的运行（真实调用方都是「起一次运行就登记」），这里按同样的前提复位
  IDS.forEach(registerRun)
})

afterEach(function () {
  vi.useRealTimers()
})

describe('appendRunFrame', function () {
  it('holds frames back until the batch timer fires', function () {
    appendRunFrame(frame('a', 0))

    expect(findRunFrames('a').frames).toHaveLength(0)

    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual(['a-0'])
  })

  it('flushes everything appended inside one window together', function () {
    appendRunFrame(frame('a', 0))
    appendRunFrame(frame('a', 1))
    appendRunFrame(frame('b', 0))

    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual(['a-0', 'a-1'])
    expect(texts('b')).toEqual(['b-0'])
  })

  it('starts a fresh window for frames that arrive after a flush', function () {
    appendRunFrame(frame('a', 0))
    vi.advanceTimersByTime(80)
    appendRunFrame(frame('a', 1))

    expect(texts('a')).toEqual(['a-0'])

    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual(['a-0', 'a-1'])
  })

  it('lets an impatient caller flush early', function () {
    appendRunFrame(frame('a', 0))
    flushRunFrames()

    expect(texts('a')).toEqual(['a-0'])

    // 早退的定时器不该在之后又跑一次
    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual(['a-0'])
  })
})

describe('isolation', function () {
  it('leaves the frames of an untouched run at the same reference', function () {
    appendRunFrame(frame('b', 0))
    vi.advanceTimersByTime(80)

    const before = findRunFrames('b')

    appendRunFrame(frame('a', 0))
    vi.advanceTimersByTime(80)

    expect(findRunFrames('b')).toBe(before)
    expect(findRunFrames('a')).not.toBe(before)
  })

  it('hands out one stable value for a run that has no frames', function () {
    expect(findRunFrames('ghost')).toBe(findRunFrames('ghost'))
  })
})

describe('frame limit', function () {
  it('keeps only the newest frames and counts the rest as dropped', function () {
    const overflow = 5
    for (let index = 0; index < MAX_FRAMES + overflow; index += 1) {
      appendRunFrame(frame('long', index))
    }
    vi.advanceTimersByTime(80)

    const actual = findRunFrames('long')

    expect(actual.frames).toHaveLength(MAX_FRAMES)
    expect(actual.dropped).toBe(overflow)
    expect(actual.frames[0].text).toBe(`long-${overflow}`)
  })
})

describe('registration', function () {
  it('ignores frames of a run nobody tracks', function () {
    appendRunFrame(frame('ghost', 0))
    vi.advanceTimersByTime(80)

    expect(texts('ghost')).toEqual([])
  })

  it('stops collecting once the run is dropped', function () {
    // corex 不会因为界面把运行删了就停下，它还会继续冒帧
    dropRunFrames(['a'])
    appendRunFrame(frame('a', 0))
    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual([])
  })

  it('keeps the runs that survived the same drop', function () {
    dropRunFrames(['a'])
    appendRunFrame(frame('a', 0))
    appendRunFrame(frame('b', 0))
    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual([])
    expect(texts('b')).toEqual(['b-0'])
  })
})

describe('dropRunFrames', function () {
  it('drops frames that already landed', function () {
    appendRunFrame(frame('a', 0))
    vi.advanceTimersByTime(80)
    dropRunFrames(['a'])

    expect(texts('a')).toEqual([])
  })

  it('drops frames that are still waiting in the batch', function () {
    appendRunFrame(frame('a', 0))
    dropRunFrames(['a'])
    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual([])
  })

  it('keeps the other runs of the same batch', function () {
    appendRunFrame(frame('a', 0))
    appendRunFrame(frame('b', 0))
    dropRunFrames(['a'])
    vi.advanceTimersByTime(80)

    expect(texts('a')).toEqual([])
    expect(texts('b')).toEqual(['b-0'])
  })
})
