'use client'
import clsx from 'clsx'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useKeyModifier } from '@reactuses/core'

import { ContextMenu } from '@/components/contextmenu'
import { useScrollFx } from '@/features/controller/hooks/use-scroll-fx'
import { bindSortable, reorder, type SortableSession } from '@/features/controller/lib/sortable'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'
import { buildItems, CLASS_NAMES } from '@/features/magnetic-tile/layout-menu'
import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'

interface MirrorProps {
  children: ReactNode
}

const STAMP = Date.now()

const SITES: { url: string; title: string; color: string }[] = [
  { url: 'https://www.baidu.com', title: '百度', color: '#1677ff' },
  { url: 'https://www.taobao.com', title: '淘宝', color: '#ff6a00' },
  { url: 'https://www.jd.com', title: '京东', color: '#e1251b' },
  { url: 'https://www.bilibili.com', title: '哔哩哔哩', color: '#fb7299' },
  { url: 'https://www.zhihu.com', title: '知乎', color: '#056de8' },
  { url: 'https://www.xiaohongshu.com', title: '小红书', color: '#ff2442' },
  { url: 'https://www.douban.com', title: '豆瓣', color: '#00b51d' },
  { url: 'https://www.weibo.com', title: '微博', color: '#e6162d' }
]

const TILES: MagneticTile[] = SITES.map(function (site, index) {
  return {
    id: `tile-nav-${index}`,
    index,
    title: site.title,
    url: site.url,
    round: '12px',
    mark: [...site.title].at(0) ?? null,
    size: 1,
    shape: 'square',
    direction: 'horizontal',
    mirrorID: 'mirror-placeholder',
    updatedAt: STAMP,
    createdAt: STAMP,
    textColor: '#ffffff',
    component: 'navigation',
    description: site.title,
    collectionID: null,
    downloadCount: 0,
    background: { color: site.color },
    backdrop: null,
    archivedAt: null
  }
})

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
    const [tiles, setTiles] = useState(TILES)
    const gridRef = useRef<HTMLDivElement>(null)
    const sortableRef = useRef<SortableSession | null>(null)
    const control = useKeyModifier('Control')
    const controlRef = useRef(control)
    const tilesRef = useRef(tiles)

    controlRef.current = control
    tilesRef.current = tiles

    const scrollFx = useScrollFx(gridRef)

    useEffect(
      function () {
        const gridEl = gridRef.current
        if (!gridEl) return

        /** 占位：仅本地重排，不落库 */
        function persistReorder(ids: string[]) {
          const current = tilesRef.current
          const moved = reorder(current, ids).map(function (tile, index) {
            return { ...tile, index }
          })
          setTiles(moved)
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
          {tiles.map(function (value, index) {
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
