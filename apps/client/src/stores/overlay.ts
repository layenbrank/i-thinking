import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { findMarkerBox, parseMarkerLayout, type MarkerLayout } from '@/features/magnetic-tile/size'

type OverlayMode = 'idle' | 'capture'

type OverlayTileKind = 'countdown' | 'calendar' | 'clock'

const OVERLAY_TILE_KINDS: readonly OverlayTileKind[] = ['countdown', 'calendar', 'clock']

function isOverlayTileKind(value: string): value is OverlayTileKind {
  return (OVERLAY_TILE_KINDS as readonly string[]).includes(value)
}

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
  kind: OverlayTileKind
  x: number
  y: number
  w: number
  h: number
  z: number
  magneticTileID: string
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

type OverlayItem = OverlayTexture | OverlayTile

interface OverlayStore {
  mode: OverlayMode
  items: OverlayItem[]
  zCursor: number
  updateMode: (mode: OverlayMode) => void
  mountTile: (
    kind: OverlayTileKind,
    magneticTileID: string,
    layout?: Partial<MarkerLayout>
  ) => void
  addTexture: (input: {
    src: string
    x?: number
    y?: number
    w: number
    h: number
    opacity?: number
  }) => string
  updateItem: (id: string, patch: Partial<Pick<OverlayItem, 'x' | 'y' | 'w' | 'h' | 'z'>>) => void
  updateTexture: (
    id: string,
    patch: Partial<
      Pick<OverlayTexture, 'x' | 'y' | 'w' | 'h' | 'z' | 'opacity' | 'isThrough' | 'src'>
    >
  ) => void
  removeItem: (id: string) => void
  clearTextures: () => void
  bringToFront: (id: string) => void
  hasContent: () => boolean
  hideIfEmpty: () => Promise<void>
  ensureVisible: () => Promise<void>
  enterCapture: () => Promise<void>
  exitCapture: () => Promise<void>
}

function nextZ(state: { zCursor: number }): number {
  state.zCursor += 1
  return state.zCursor
}

const useOverlayStore = create<OverlayStore>()(
  devtools(
    immer(function (setter, getter) {
      return {
        mode: 'idle',
        items: [],
        zCursor: 10,

        updateMode(mode) {
          setter(function (state) {
            state.mode = mode
          })
        },

        mountTile(kind, magneticTileID, layout) {
          setter(function (state) {
            const parsed = parseMarkerLayout(layout)
            const box = findMarkerBox(parsed)
            const existing = state.items.find(function (w) {
              return w.kind !== 'texture' && w.id === magneticTileID
            })
            if (existing && existing.kind !== 'texture') {
              existing.z = nextZ(state)
              existing.kind = kind
              existing.size = parsed.size
              existing.shape = parsed.shape
              existing.direction = parsed.direction
              existing.w = box.w
              existing.h = box.h
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
              direction: parsed.direction
            })
          })
          void getter().ensureVisible()
        },

        addTexture(input) {
          let id = ''
          setter(function (state) {
            id = `texture-${Date.now()}-${state.zCursor}`
            const offset =
              (state.items.filter(function (w) {
                return w.kind === 'texture'
              }).length %
                8) *
              28
            state.items.push({
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
            })
          })
          void getter().ensureVisible()
          return id
        },

        updateItem(id, patch) {
          setter(function (state) {
            const entry = state.items.find(function (w) {
              return w.id === id
            })
            if (!entry) return
            if (patch.x !== undefined) entry.x = patch.x
            if (patch.y !== undefined) entry.y = patch.y
            if (patch.w !== undefined) entry.w = patch.w
            if (patch.h !== undefined) entry.h = patch.h
            if (patch.z !== undefined) entry.z = patch.z
          })
        },

        updateTexture(id, patch) {
          setter(function (state) {
            const entry = state.items.find(function (w) {
              return w.id === id && w.kind === 'texture'
            })
            if (!entry || entry.kind !== 'texture') return
            Object.assign(entry, patch)
          })
        },

        removeItem(id) {
          setter(function (state) {
            state.items = state.items.filter(function (w) {
              return w.id !== id
            })
          })
          void getter().hideIfEmpty()
        },

        clearTextures() {
          setter(function (state) {
            state.items = state.items.filter(function (w) {
              return w.kind !== 'texture'
            })
          })
          void getter().hideIfEmpty()
        },

        bringToFront(id) {
          setter(function (state) {
            const entry = state.items.find(function (w) {
              return w.id === id
            })
            if (!entry) return
            entry.z = nextZ(state)
          })
        },

        hasContent() {
          return getter().items.length > 0 || getter().mode === 'capture'
        },

        async hideIfEmpty() {
          const { mode, items } = getter()
          if (mode === 'capture' || items.length > 0) return
          try {
            await invoke('overlay:hide')
          } catch {
            /* non-tauri */
          }
        },

        async ensureVisible() {
          try {
            await invoke('overlay:ensure')
          } catch {
            /* non-tauri */
          }
        },

        async enterCapture() {
          setter(function (state) {
            state.mode = 'capture'
          })
          try {
            await invoke('overlay:update-mode', { mode: 'capture' })
          } catch {
            /* non-tauri */
          }
        },

        async exitCapture() {
          setter(function (state) {
            state.mode = 'idle'
          })
          try {
            await invoke('overlay:update-mode', { mode: 'idle' })
          } catch {
            /* non-tauri */
          }
          await getter().hideIfEmpty()
        }
      }
    }),
    { name: 'overlay-store' }
  )
)

export type { OverlayMode, OverlayTileKind, OverlayTexture, OverlayTile, OverlayItem }
export { useOverlayStore, isOverlayTileKind, OVERLAY_TILE_KINDS }
