import { useEffect, useState } from 'react'

/**
 * 每 `intervalMs` 走一次的时钟：耗时与「最近执行」的相对时间靠它刷新。
 *
 * `isActive` 为假就不开表 —— 没有任务在跑时，页面上没有东西会随时间变，
 * 让组件定时重渲染纯属浪费。
 */
function useNow(intervalMs: number, isActive: boolean = true): number {
  const [now, updateNow] = useState(Date.now)

  useEffect(
    function () {
      if (!isActive) return
      const timer = window.setInterval(function () {
        updateNow(Date.now())
      }, intervalMs)
      return function () {
        window.clearInterval(timer)
      }
    },
    [intervalMs, isActive]
  )

  return now
}

export { useNow }
