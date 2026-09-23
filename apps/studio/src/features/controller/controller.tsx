import { useKeyModifier } from '@reactuses/core'
import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'

import { ContextMenu } from '@/components/contextmenu'
import styles from '@/features/controller/controller.module.scss'
import { useScrollFx } from '@/features/controller/hooks/use-scroll-fx'
import { bindSortable, reorder, type SortableSession } from '@/features/controller/lib/sortable'
import { Reflection } from '@/features/controller/reflection.tsx'
import { buildItems } from '@/features/magnetic-tile/layout-items'
import { CLASS_NAMES } from '@/features/magnetic-tile/layout-menu'
import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { useMirrorStore } from '@/stores/mirror'

interface MirrorProps {
  children: ReactNode
}

const Controller = {
  /** 占位滚动视口；mirror 切换与 store 尚未接入 */
  Mirror(props: MirrorProps) {
    return (
      <div className={clsx(styles.controller, styles.mirror)}>
        <div
          data-mirror-scroller
          className={styles.scroller}>
          <div
            data-mirror-pane
            className={styles.pane}>
            {props.children}
          </div>
        </div>
      </div>
    )
  },
  MagneticTile() {
    const magneticTiles = useMirrorStore(function (state) {
      return state.magneticTiles
    })
    const gridRef = useRef<HTMLDivElement>(null)
    const sortableRef = useRef<SortableSession | null>(null)
    const control = useKeyModifier('Control')
    const controlRef = useRef(control)
    const tilesRef = useRef(magneticTiles)

    controlRef.current = control
    tilesRef.current = magneticTiles

    const scrollFx = useScrollFx(gridRef)

    useEffect(function () {
      // 失败由 store 自己报（打印 + toast），这里等不到 rejection
      void useMirrorStore.getState().initialize()
    }, [])

    useEffect(
      function () {
        const gridEl = gridRef.current
        if (!gridEl) return

        /** 拖拽重排：乐观更新 + 逐个 index 落库；写不动时由 store 提示并重读真值 */
        function persistReorder(ids: string[]) {
          const moved = reorder(tilesRef.current, ids)
          void useMirrorStore.getState().toApplyOrder(moved)
        }

        const session = bindSortable(gridEl, {
          isDisabled() {
            return Boolean(controlRef.current)
          },
          onDragStart() {
            scrollFx.pause()
          },
          onDragEnd() {
            scrollFx.resume()
          },
          onReorder(ids) {
            persistReorder(ids)
          }
        })

        sortableRef.current = session
        session.disable(Boolean(controlRef.current))

        return function () {
          session.destroy()
          sortableRef.current = null
        }
      },
      [scrollFx]
    )

    useEffect(
      function () {
        sortableRef.current?.disable(Boolean(control))
      },
      [control]
    )

    return (
      <ContextMenu
        trigger=".magnetic-tile"
        classNames={CLASS_NAMES}
        findItems={function (el) {
          const id = el.getAttribute('data-id')
          if (!id) return []
          const tile = tilesRef.current?.find(function (item) {
            return item.id === id
          })
          return tile ? buildItems(tile) : []
        }}>
        <div
          ref={gridRef}
          className={clsx([styles.controller, styles['magnetic-tile']])}>
          {magneticTiles.map(function (value, index) {
            const Component = Reflection[value.component]
            // 旧库存量行的 component 可能不在白名单中，兜底跳过避免渲染崩溃
            if (!Component) return null

            return (
              <MagneticTile.Enter
                key={value.id}
                index={index}>
                <MagneticTile.Suspense
                  id={value.id}
                  size={value.size}
                  shape={value.shape}
                  direction={value.direction}>
                  <OverlayProvider magneticTileID={value.id}>
                    <Component {...value} />
                  </OverlayProvider>
                </MagneticTile.Suspense>
              </MagneticTile.Enter>
            )
          })}
        </div>
      </ContextMenu>
    )
  }
}

export default Controller
