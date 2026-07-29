'use client'
import clsx from 'clsx'
import { useEffect, useRef, type ReactNode } from 'react'
import { useKeyModifier } from '@reactuses/core'

import {
  bindSortableGrid,
  reorderByIds,
  type SortableGridSession
} from '@/features/controller/sortable-grid'
import styles from '@/features/controller/controller.module.scss'
import { Reflection } from '@/features/controller/reflection.tsx'
import { MagneticTile, OverlayProvider } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { bindTileScrollMotion } from '@/lib/gsap-magnetic-tile'
import { useMirrorStore } from '@/stores/mirror.ts'

interface MirrorProps {
  children: ReactNode
}

const Controller = {
  Mirror(props: MirrorProps) {
    return (
      <div
        data-mirror-scroller
        className={clsx(styles.controller, styles.mirror)}>
        {props.children}
      </div>
    )
  },
  MagneticTile() {
    const magneticTiles = useMirrorStore((state) => state.magneticTiles)
    const gridRef = useRef<HTMLDivElement>(null)
    const sortableRef = useRef<SortableGridSession | null>(null)
    const control = useKeyModifier('Control')
    const controlRef = useRef(control)
    const tilesRef = useRef(magneticTiles)

    controlRef.current = control
    tilesRef.current = magneticTiles

    useEffect(
      function () {
        const gridEl = gridRef.current
        if (!gridEl) return

        const scroller =
          (gridEl.closest('[data-mirror-scroller]') as HTMLElement | null) ?? gridEl

        const scrollMotion = bindTileScrollMotion(scroller)

        let syncRaf = 0
        let syncTimer = 0
        function syncScrollTiles() {
          if (syncRaf) return
          syncRaf = requestAnimationFrame(function () {
            syncRaf = 0
            window.clearTimeout(syncTimer)
            syncTimer = window.setTimeout(function () {
              const root = gridRef.current
              if (!root) return
              const tiles = Array.from(root.querySelectorAll<HTMLElement>('.magnetic-tile'))
              scrollMotion.syncTiles(tiles)
            }, 48)
          })
        }

        syncScrollTiles()

        const mutation = new MutationObserver(function () {
          syncScrollTiles()
        })
        mutation.observe(gridEl, { childList: true })

        let isPersisting = false
        let pendingIds: string[] | null = null

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
          isDisabled: function () {
            return Boolean(controlRef.current)
          },
          onSortStart: function () {
            scrollMotion.pause()
          },
          onSortEnd: function () {
            scrollMotion.resume()
          },
          onReorderIds: function (orderedIds) {
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
          if (syncRaf) cancelAnimationFrame(syncRaf)
          window.clearTimeout(syncTimer)
          sortableSession.destroy()
          sortableRef.current = null
          scrollMotion.destroy()
        }
      },
      []
    )

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
