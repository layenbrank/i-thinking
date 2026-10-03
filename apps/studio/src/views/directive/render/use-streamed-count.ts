import { startTransition, useEffect, useState } from 'react'

/**
 * 分片 / 流式挂载：先露出前 `chunkSize` 个，再在空闲时段一块块补齐。
 *
 * 切排序、换筛选时靠 `resetKey` 归零重播，避免「旧列表残留半截」。
 * `resetKey` / `chunkSize` 变化在**渲染期**同步归零，不能等 effect，否则会先闪一帧全量。
 * 用 `requestIdleCallback`（退化到 `setTimeout`）而不是每帧 rAF，免得和布局抢主线程。
 */

const CHUNK_SIZE = 12
const IDLE_TIMEOUT_MS = 48

function scheduleIdle(task: () => void): () => void {
  const idle = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }
  ).requestIdleCallback

  if (typeof idle === 'function') {
    const id = idle(task, { timeout: IDLE_TIMEOUT_MS })
    return function () {
      globalThis.cancelIdleCallback?.(id)
    }
  }

  const id = globalThis.setTimeout(task, 0)
  return function () {
    globalThis.clearTimeout(id)
  }
}

function findFirstCount(total: number, chunkSize: number): number {
  const safeTotal = Math.max(total, 0)
  const step = Math.max(chunkSize, 1)
  return Math.min(step, safeTotal)
}

function useStreamedCount(
  total: number,
  resetKey: string | number,
  chunkSize: number = CHUNK_SIZE
): number {
  const first = findFirstCount(total, chunkSize)
  const safeTotal = Math.max(total, 0)
  const [count, updateCount] = useState(first)
  const [seenKey, updateSeenKey] = useState(resetKey)
  const [seenChunk, updateSeenChunk] = useState(chunkSize)

  const isReset = seenKey !== resetKey || seenChunk !== chunkSize
  const isOver = !isReset && count > safeTotal
  // 渲染期对齐：reset 归零；total 变少则钳制。返回值用本轮算出的值，避免再闪一帧旧 count
  const shown = isReset ? first : isOver ? safeTotal : count

  if (isReset) {
    updateSeenKey(resetKey)
    updateSeenChunk(chunkSize)
    updateCount(first)
  } else if (isOver) {
    updateCount(safeTotal)
  }

  useEffect(
    function () {
      const step = Math.max(chunkSize, 1)
      let next = Math.min(step, safeTotal)
      updateCount(next)

      if (next >= safeTotal) return

      let cancelSchedule: (() => void) | null = null
      let isAlive = true

      function pump() {
        if (!isAlive) return
        next = Math.min(next + step, safeTotal)
        startTransition(function () {
          updateCount(next)
        })
        if (next < safeTotal) {
          cancelSchedule = scheduleIdle(pump)
        }
      }

      cancelSchedule = scheduleIdle(pump)

      return function () {
        isAlive = false
        cancelSchedule?.()
      }
    },
    [safeTotal, resetKey, chunkSize]
  )

  return shown
}

export { CHUNK_SIZE, useStreamedCount }
