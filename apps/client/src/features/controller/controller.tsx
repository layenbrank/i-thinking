'use client'
import clsx from 'clsx'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useKeyModifier } from '@reactuses/core'

import {
  bindSortableGrid,
  reorderByIds,
  type SortableGridSession
} from '@/features/controller/sortable-grid'
import { registerMirrorSwitch } from '@/features/controller/mirror-switch'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'
import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  bindMirrorTransition,
  findMirrorDirection,
  type MirrorDirection
} from '@/lib/mirror-transition'
import { bindTileScrollFx, type TileScrollFx } from '@/lib/tile-scroll-fx'
import { useMirrorStore } from '@/stores/mirror.ts'

interface MirrorProps {
  children: ReactNode
}

const SYNC_DEBOUNCE_MS = 48

function findScroller(gridEl: HTMLElement): HTMLElement {
  return (gridEl.closest('[data-mirror-scroller]') as HTMLElement | null) ?? gridEl
}

function findGridTiles(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.magnetic-tile'))
}

const Controller = {
  /**
   * Mirror 滚动视口：切换 active mirror 时先退场再换数据再进场
   */
  Mirror(props: MirrorProps) {
    const mirrors = useMirrorStore((state) => state.mirrors)
    const activeId = useMirrorStore((state) => state.active.mirror?.id ?? null)
    const [paneId, setPaneId] = useState(activeId)
    const paneRef = useRef<HTMLDivElement>(null)
    const scrimRef = useRef<HTMLDivElement>(null)
    const transitionRef = useRef(bindMirrorTransition())
    const directionRef = useRef<MirrorDirection>(1)
    const isFirstEnter = useRef(true)
    const mirrorsRef = useRef(mirrors)
    const paneIdRef = useRef(paneId)

    mirrorsRef.current = mirrors
    paneIdRef.current = paneId

    // 外部首次注入 / 同步 active（非 pager 路径）
    useEffect(
      function () {
        if (!activeId) return
        if (paneIdRef.current == null) {
          setPaneId(activeId)
        }
      },
      [activeId]
    )

    useEffect(function () {
      const transition = transitionRef.current
      return registerMirrorSwitch(async function (nextId) {
        const currentId = paneIdRef.current
        if (!nextId || nextId === currentId) return

        const direction = findMirrorDirection(mirrorsRef.current, currentId, nextId)
        directionRef.current = direction

        const store = useMirrorStore.getState()
        const payloadPromise = store.toFetchMirrorPayload(nextId)
        const pane = paneRef.current
        const scrim = scrimRef.current
        if (pane) await transition.playExit(pane, direction, scrim)

        const payload = await payloadPromise
        if (!payload) return
        store.toCommitMirrorPayload(payload)
        setPaneId(nextId)
      })
    }, [])

    useEffect(function () {
      return function () {
        transitionRef.current.destroy()
      }
    }, [])

    // pane remount 后播进场（首次 mount 定格，避免闪一下）
    useLayoutEffect(
      function () {
        const pane = paneRef.current
        if (!pane || !paneId) return

        if (isFirstEnter.current) {
          isFirstEnter.current = false
          return
        }

        // 新页从顶部进入，避免继承旧滚动位置
        const scroller = pane.closest('[data-mirror-scroller]') as HTMLElement | null
        if (scroller) scroller.scrollTop = 0

        void transitionRef.current.playEnter(pane, directionRef.current, scrimRef.current)
      },
      [paneId]
    )

    return (
      <div className={clsx(styles.controller, styles.mirror)}>
        <div data-mirror-scroller className={styles.scroller}>
          <div
            ref={paneRef}
            key={paneId ?? 'empty'}
            data-mirror-pane
            className={styles.pane}>
            {props.children}
          </div>
        </div>
        <div ref={scrimRef} className={styles.scrim} aria-hidden />
      </div>
    )
  },
  MagneticTile() {
    const magneticTiles = useMirrorStore((state) => state.magneticTiles)
    const gridRef = useRef<HTMLDivElement>(null)
    const sortableRef = useRef<SortableGridSession | null>(null)
    const scrollFxRef = useRef<TileScrollFx | null>(null)
    const control = useKeyModifier('Control')
    const controlRef = useRef(control)
    const tilesRef = useRef(magneticTiles)

    controlRef.current = control
    tilesRef.current = magneticTiles

    useEffect(function () {
      const gridEl = gridRef.current
      if (!gridEl) return

      const scroller = findScroller(gridEl)
      const scrollFx = bindTileScrollFx(scroller)
      scrollFxRef.current = scrollFx

      let syncRaf = 0
      let syncTimer = 0

      /** 格子增删后防抖同步滚动跟踪节点 */
      function trackTiles() {
        if (syncRaf) return
        syncRaf = requestAnimationFrame(function () {
          syncRaf = 0
          window.clearTimeout(syncTimer)
          syncTimer = window.setTimeout(function () {
            const root = gridRef.current
            if (!root) return
            scrollFx.track(findGridTiles(root))
          }, SYNC_DEBOUNCE_MS)
        })
      }

      // 延后跟踪，避开 pane 进场动画窗口内的 IO / quickTo 初始化开销
      let isBooted = false
      const bootTimer = window.setTimeout(function () {
        isBooted = true
        trackTiles()
      }, 240)

      const mutation = new MutationObserver(function () {
        if (!isBooted) return
        trackTiles()
      })
      mutation.observe(gridEl, { childList: true })

      let isPersisting = false
      let pendingIds: string[] | null = null

      /** 乐观更新 index 并落库；并发重排进队列 */
      function persistReorder(orderedIds: string[]) {
        const current = tilesRef.current ?? []
        const moved = reorderByIds(current, orderedIds).map(function (tile, index) {
          return { ...tile, index }
        })

        const prev = current
        const store = useMirrorStore.getState()
        store.toUpdateMagneticTiles(moved)

        const updates = moved
          .filter(function (tile) {
            const before = prev.find(function (item) {
              return item.id === tile.id
            })
            return before?.index !== tile.index
          })
          .map(function (tile) {
            return {
              key: tile.id,
              change: { index: tile.index }
            }
          })

        if (!updates.length) {
          isPersisting = false
          if (pendingIds) {
            const next = pendingIds
            pendingIds = null
            persistReorder(next)
          }
          return
        }

        isPersisting = true
        void store
          .toUpdateMagneticTile(updates)
          .catch(function () {
            const mirrorID = useMirrorStore.getState().active.mirror?.id
            if (mirrorID) {
              void useMirrorStore.getState().toReadMirror(mirrorID)
            } else {
              useMirrorStore.getState().toUpdateMagneticTiles(prev)
            }
          })
          .finally(function () {
            isPersisting = false
            if (pendingIds) {
              const next = pendingIds
              pendingIds = null
              persistReorder(next)
            }
          })
      }

      const sortableSession = bindSortableGrid(gridEl, {
        isDisabled() {
          return Boolean(controlRef.current)
        },
        onDragStart() {
          scrollFx.pause()
        },
        onDragEnd() {
          scrollFx.resume()
        },
        onReorder(orderedIds) {
          if (isPersisting) {
            pendingIds = orderedIds
            return
          }
          persistReorder(orderedIds)
        }
      })

      sortableRef.current = sortableSession
      sortableSession.updateDisabled(Boolean(controlRef.current))

      return function () {
        mutation.disconnect()
        window.clearTimeout(bootTimer)
        if (syncRaf) cancelAnimationFrame(syncRaf)
        window.clearTimeout(syncTimer)
        sortableSession.destroy()
        sortableRef.current = null
        scrollFx.destroy()
        scrollFxRef.current = null
      }
    }, [])

    useEffect(
      function () {
        sortableRef.current?.updateDisabled(Boolean(control))
      },
      [control]
    )

    return (
      <div
        ref={gridRef}
        className={clsx([styles.controller, styles['magnetic-tile']])}>
        {magneticTiles?.map(function (value) {
          const Component = Reflection[value.component]

          return (
            <MagneticTile.Suspense
              key={value.id}
              id={value.id}
              size={value.size}
              shape={value.shape}
              direction={value.direction}>
              <OverlayProvider magneticTileID={value.id}>
                <Component {...value} />
              </OverlayProvider>
            </MagneticTile.Suspense>
          )
        })}
      </div>
    )
  }
}

export default Controller
