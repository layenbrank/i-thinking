import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import type { SurfaceStyleInput } from '@/features/magnetic-tile/surface-style'
import {
  findMarkerBox,
  LAYOUT_FALLBACK,
  parseMarkerLayout,
  type MarkerLayout
} from '@/features/magnetic-tile/size'

type OverlayMode = 'idle' | 'capture'

interface OverlayTexture {
  id: string
  kind: 'texture'
  x: number
  y: number
  w: number
  h: number
  z: number
  src: string
  opacity: number
  isThrough: boolean
}

interface OverlayTile {
  id: string
  /** 磁贴 component，与主窗一致 */
  kind: MagneticTile.Component
  x: number
  y: number
  w: number
  h: number
  z: number
  magneticTileID: string
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  round: string | null
  background: MagneticTile.Background | null
}

type OverlayItem = OverlayTexture | OverlayTile

/** overlay:write 磁贴载荷（camelCase JSON，tenantID 大写 ID） */
interface TileWritePayload {
  kind: 'tile'
  x: number
  y: number
  w: number
  h: number
  z: number
  tenantID: string
  component: MagneticTile.Component
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  round: string | null
  background: string | null
}

/** overlay:update patch：updateItem / updateTexture 字段并集（isThrough 不持久化） */
type OverlayPatch = Partial<
  Pick<OverlayTexture, 'x' | 'y' | 'w' | 'h' | 'z' | 'opacity' | 'isThrough' | 'src'>
>

/** overlay:read 返回行 */
interface OverlayRow {
  id: string
  kind: 'texture' | 'tile'
  x: number
  y: number
  w: number
  h: number
  z: number
  src?: string | null
  opacity?: number | null
  tenantID?: string | null
  component?: string | null
  size?: Mirror.Size | null
  shape?: Mirror.Shape | null
  direction?: Mirror.Direction | null
  round?: string | null
  background?: string | null
  archivedAt?: string | null
  createdAt: string
  updatedAt: string
}

interface OverlayStore {
  mode: OverlayMode
  items: OverlayItem[]
  zCursor: number
  toMode: (mode: OverlayMode) => void
  toMount: (
    kind: MagneticTile.Component,
    magneticTileID: string,
    layout?: Partial<MarkerLayout> & SurfaceStyleInput
  ) => void
  toWrite: (input: {
    src: string
    x?: number
    y?: number
    w: number
    h: number
    opacity?: number
  }) => string
  toUpdate: (id: string, patch: OverlayPatch) => void
  toRemove: (id: string) => void
  toClear: () => void
  toFront: (id: string) => void
  hasContent: () => boolean
  toHide: () => Promise<void>
  toShow: () => Promise<void>
  toCapture: () => Promise<void>
  toExit: () => Promise<void>
  toInitialize: () => Promise<void>
}

function nextZ(state: { zCursor: number }): number {
  state.zCursor += 1
  return state.zCursor
}

const useOverlayStore = create<OverlayStore>()(
  devtools(
    immer(function (setter, getter) {
      /** 防抖定时器 + 按 id 合并的待发送 patch */
      let updateTimer: ReturnType<typeof setTimeout> | undefined
      const pendingPatches = new Map<string, OverlayPatch>()

      function scheduleUpdate(id: string, patch: OverlayPatch) {
        const merged = pendingPatches.get(id) ?? {}
        pendingPatches.set(id, Object.assign(merged, patch))
        clearTimeout(updateTimer)
        updateTimer = setTimeout(flushUpdates, 150)
      }

      function flushUpdates() {
        updateTimer = undefined
        const batch = Array.from(pendingPatches.entries())
        pendingPatches.clear()
        for (const [id, patch] of batch) {
          // isThrough 仅运行时状态，不持久化
          const { isThrough: _isThrough, ...rest } = patch
          if (Object.keys(rest).length === 0) continue
          void invoke('overlay:update', { id, patch: rest }).catch(function (e) {
            console.warn('[overlay] update failed:', e)
          })
        }
      }

      function dropPending(id: string) {
        pendingPatches.delete(id)
      }

      return {
        mode: 'idle',
        items: [],
        zCursor: 10,

        toMode(mode) {
          setter(function (state) {
            state.mode = mode
          })
        },

        toMount(kind, magneticTileID, layout) {
          let payload: TileWritePayload | null = null
          setter(function (state) {
            const parsed = parseMarkerLayout(layout)
            const box = findMarkerBox(parsed)
            const round = layout?.round ?? null
            const background = layout?.background ?? null
            const existing = state.items.find(function (w) {
              return w.kind !== 'texture' && w.id === magneticTileID
            })
            if (existing && existing.kind !== 'texture') {
              existing.z = nextZ(state)
              existing.kind = kind
              existing.size = parsed.size
              existing.shape = parsed.shape
              existing.direction = parsed.direction
              existing.round = round
              existing.background = background
              existing.w = box.w
              existing.h = box.h
              payload = {
                kind: 'tile',
                x: existing.x,
                y: existing.y,
                w: existing.w,
                h: existing.h,
                z: existing.z,
                tenantID: magneticTileID,
                component: kind,
                size: parsed.size,
                shape: parsed.shape,
                direction: parsed.direction,
                round,
                background: background ? JSON.stringify(background) : null
              }
              return
            }
            const margin = 48 + state.items.length * 24
            state.items.push({
              id: magneticTileID,
              kind,
              x: margin,
              y: margin,
              w: box.w,
              h: box.h,
              z: nextZ(state),
              magneticTileID,
              size: parsed.size,
              shape: parsed.shape,
              direction: parsed.direction,
              round,
              background
            })
            payload = {
              kind: 'tile',
              x: margin,
              y: margin,
              w: box.w,
              h: box.h,
              z: state.zCursor,
              tenantID: magneticTileID,
              component: kind,
              size: parsed.size,
              shape: parsed.shape,
              direction: parsed.direction,
              round,
              background: background ? JSON.stringify(background) : null
            }
          })
          if (payload) {
            void invoke('overlay:write', { item: payload }).catch(function (e) {
              console.warn('[overlay] write tile failed:', e)
            })
          }
          void getter().toShow()
        },

        toWrite(input) {
          let id = ''
          let writeItem: {
            kind: 'texture'
            x: number
            y: number
            w: number
            h: number
            z: number
            src: string
            opacity: number
          } | null = null
          setter(function (state) {
            id = `texture-${Date.now()}-${state.zCursor}`
            const offset =
              (state.items.filter(function (w) {
                return w.kind === 'texture'
              }).length %
                8) *
              28
            const item: OverlayTexture = {
              id,
              kind: 'texture',
              x: input.x ?? 80 + offset,
              y: input.y ?? 80 + offset,
              w: input.w,
              h: input.h,
              z: nextZ(state),
              src: input.src,
              opacity: input.opacity ?? 1,
              isThrough: false
            }
            state.items.push(item)
            writeItem = {
              kind: 'texture',
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              z: item.z,
              src: item.src,
              opacity: item.opacity
            }
          })
          if (writeItem) {
            const localId = id
            void invoke<string>('overlay:write', { item: writeItem })
              .then(function (rowId) {
                // texture 以后端返回的 id 为准，回填本地 item
                if (!rowId || rowId === localId) return
                setter(function (state) {
                  const entry = state.items.find(function (w) {
                    return w.id === localId
                  })
                  if (entry) entry.id = rowId
                })
              })
              .catch(function (e) {
                console.warn('[overlay] write texture failed:', e)
              })
          }
          void getter().toShow()
          return id
        },

        toUpdate(id, patch) {
          setter(function (state) {
            const entry = state.items.find(function (w) {
              return w.id === id
            })
            if (!entry) return
            Object.assign(entry, patch)
          })
          scheduleUpdate(id, patch)
        },

        toRemove(id) {
          setter(function (state) {
            state.items = state.items.filter(function (w) {
              return w.id !== id
            })
          })
          dropPending(id)
          void invoke('overlay:remove', { ids: [id] }).catch(function (e) {
            console.warn('[overlay] remove failed:', e)
          })
          void getter().toHide()
        },

        toClear() {
          const textureIds = getter()
            .items.filter(function (w) {
              return w.kind === 'texture'
            })
            .map(function (w) {
              return w.id
            })
          setter(function (state) {
            state.items = state.items.filter(function (w) {
              return w.kind !== 'texture'
            })
          })
          textureIds.forEach(dropPending)
          if (textureIds.length > 0) {
            void invoke('overlay:remove', { ids: textureIds }).catch(function (e) {
              console.warn('[overlay] clear failed:', e)
            })
          }
          void getter().toHide()
        },

        toFront(id) {
          let z: number | undefined
          setter(function (state) {
            const entry = state.items.find(function (w) {
              return w.id === id
            })
            if (!entry) return
            entry.z = nextZ(state)
            z = entry.z
          })
          if (z !== undefined) scheduleUpdate(id, { z })
        },

        hasContent() {
          return getter().items.length > 0 || getter().mode === 'capture'
        },

        async toHide() {
          const { mode, items } = getter()
          if (mode === 'capture' || items.length > 0) return
          try {
            await invoke('overlay:hide')
          } catch {
            /* non-tauri */
          }
        },

        async toShow() {
          try {
            await invoke('overlay:ensure')
          } catch {
            /* non-tauri */
          }
        },

        async toCapture() {
          setter(function (state) {
            state.mode = 'capture'
          })
          try {
            await invoke('overlay:update-mode', { mode: 'capture' })
          } catch {
            /* non-tauri */
          }
        },

        async toExit() {
          setter(function (state) {
            state.mode = 'idle'
          })
          try {
            await invoke('overlay:update-mode', { mode: 'idle' })
          } catch {
            /* non-tauri */
          }
          await getter().toHide()
        },

        async toInitialize() {
          try {
            const rows = await invoke<OverlayRow[]>('overlay:read')
            if (!Array.isArray(rows)) return
            const items: OverlayItem[] = []
            for (const row of rows) {
              if (row.kind === 'texture') {
                items.push({
                  id: row.id,
                  kind: 'texture',
                  x: row.x,
                  y: row.y,
                  w: row.w,
                  h: row.h,
                  z: row.z,
                  src: row.src ?? '',
                  opacity: row.opacity ?? 1,
                  isThrough: false
                })
              } else if (row.kind === 'tile') {
                items.push({
                  id: row.id,
                  kind: row.component as MagneticTile.Component,
                  x: row.x,
                  y: row.y,
                  w: row.w,
                  h: row.h,
                  z: row.z,
                  magneticTileID: row.tenantID ?? row.id,
                  size: row.size ?? LAYOUT_FALLBACK.size,
                  shape: row.shape ?? LAYOUT_FALLBACK.shape,
                  direction: row.direction ?? LAYOUT_FALLBACK.direction,
                  round: row.round ?? null,
                  background: row.background ? JSON.parse(row.background) : null
                })
              }
            }
            setter(function (state) {
              state.items = items
              if (items.length > 0) {
                state.zCursor =
                  Math.max(
                    ...items.map(function (i) {
                      return i.z
                    }),
                    10
                  ) + 1
              }
            })
          } catch (e) {
            console.warn('[overlay] toInitialize failed:', e)
          }
        }
      }
    }),
    { name: 'overlay-store' }
  )
)

export type { OverlayMode, OverlayTexture, OverlayTile, OverlayItem, OverlayPatch, OverlayRow }
export { useOverlayStore }
