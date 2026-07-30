/**
 * Mirror 悬浮胶囊分页（纵向亮色玻璃）
 *
 * - portal 到 body，保证 DOM 可见、不被 Layout/Scroller 裁剪
 * - 数据由 toInitialize（空库种子常量）保证
 */
import { clsx } from 'clsx'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  findIsMirrorSwitching,
  requestMirrorSwitch,
  subscribeMirrorSwitching
} from '@/features/controller/mirror-switch'
import { useMirrorStore } from '@/stores/mirror.ts'
import styles from '@/views/overview/mirror-pager.module.scss'

function MirrorPager() {
  const mirrors = useMirrorStore((state) => state.mirrors)
  const activeId = useMirrorStore((state) => state.active.mirror?.id)
  const [isBusy, setIsBusy] = useState(findIsMirrorSwitching)

  const sorted = mirrors.slice().toSorted(function (a, b) {
    return a.index - b.index
  })

  useEffect(function () {
    return subscribeMirrorSwitching(function () {
      setIsBusy(findIsMirrorSwitching())
    })
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={styles.pager}
      data-mirror-pager
      role="tablist"
      aria-label="Mirror 分页"
      aria-busy={isBusy || undefined}>
      <div className={styles.track}>
        {sorted.map(function (mirror) {
          const isActive = mirror.id === activeId
          const page = mirror.index + 1
          return (
            <button
              key={mirror.id}
              type="button"
              role="tab"
              data-mirror-bullet
              data-active={isActive ? 'true' : undefined}
              aria-selected={isActive}
              aria-label={mirror.title}
              title={mirror.title}
              disabled={isBusy || sorted.length < 2}
              className={clsx(styles.bullet, isActive && styles.active)}
              onClick={function () {
                if (isBusy || isActive || sorted.length < 2) return
                void requestMirrorSwitch(mirror.id)
              }}>
              {page}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
}

export { MirrorPager }
