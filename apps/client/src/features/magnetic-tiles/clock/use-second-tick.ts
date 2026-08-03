import { useDocumentVisibility } from '@reactuses/core'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useRef, useState } from 'react'

/** 对齐到下一整秒的延迟（与 Vue getNextTickDelay 同源） */
function findNextTickDelay() {
  const now = performance.now()
  const remain = 1000 - (now % 1000)
  return remain === 0 ? 1000 : remain
}

function useSecondTick(): Dayjs {
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })
  const timer = useRef(0)
  const visibility = useDocumentVisibility('visible')

  useEffect(
    function () {
      window.clearTimeout(timer.current)

      if (visibility === 'hidden') return

      function tick() {
        onUpdateNow(dayjs())
        timer.current = window.setTimeout(tick, findNextTickDelay())
      }

      onUpdateNow(dayjs())
      timer.current = window.setTimeout(tick, findNextTickDelay())

      return function () {
        window.clearTimeout(timer.current)
      }
    },
    [visibility]
  )

  return now
}

export { findNextTickDelay, useSecondTick }
