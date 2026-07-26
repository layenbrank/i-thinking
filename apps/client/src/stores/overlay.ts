import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import {
  findMarkerBox,
  parseMarkerLayout,
  type MarkerLayout
} from '@/features/magnetic-tile/size'

export type OverlayMode = 'idle' | 'capture'

export type OverlayPanelKind = 'countdown' | 'calendar' | 'clock'

const OVERLAY_PANEL_KINDS: readonly OverlayPanelKind[] = ['countdown', 'calendar', 'clock']

function isOverlayPanelKind(value: string): value is OverlayPanelKind {
  return (OVERLAY_PANEL_KINDS as readonly string[]).includes(value)
}

export interface OverlayPin {
  id: string
  kind: 'pin'
  x: number
  y: number
  w: number
  h: number
  z: number
  src: string
  opacity: number
  isThrough: boolean
}

export interface OverlayPanel {
  id: string
  kind: OverlayPanelKind
  x: number
  y: number
  w: number
  h: number
  z: number
  magneticTileID?: string
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

export type OverlayItem = OverlayPin | OverlayPanel

interface OverlayStore {
  mode: OverlayMode
  items: OverlayItem[]
  zCursor: number
  updateMode: (mode: OverlayMode) => void
  mountPanel: (
    kind: OverlayPanelKind,
    magneticTileID?: string,
    layout?: Partial<MarkerLayout>
  ) => void
  addPin: (input: {
    src: string
    x?: number
    y?: number
    w: number
    h: number
    opacity?: number
  }) => string
  updateItem: (id: string, patch: Partial<Pick<OverlayItem, 'x' | 'y' | 'w' | 'h' | 'z'>>) => void
  updatePin: (
    id: string,
    patch: Partial<Pick<OverlayPin, 'x' | 'y' | 'w' | 'h' | 'z' | 'opacity' | 'isThrough' | 'src'>>
  ) => void
  removeItem: (id: string) => void
  clearPins: () => void
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

export const useOverlayStore = create<OverlayStore>()(
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

        mountPanel(kind, magneticTileID, layout) {
          setter(function (state) {
            const parsed = parseMarkerLayout(layout)
            const box = findMarkerBox(parsed)
            const existing = state.items.find(function (w) {
              return w.kind === kind
            })
            if (existing && existing.kind !== 'pin') {
              existing.z = nextZ(state)
              if (magneticTileID) existing.magneticTileID = magneticTileID
              existing.size = parsed.size
              existing.shape = parsed.shape
              existing.direction = parsed.direction
              existing.w = box.w
              existing.h = box.h
              return
            }
            const margin = 48 + state.items.length * 24
            state.items.push({
              id: kind,
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

        addPin(input) {
          let id = ''
          setter(function (state) {
            id = `pin-${Date.now()}-${state.zCursor}`
            const offset = (state.items.filter((w) => w.kind === 'pin').length % 8) * 28
            state.items.push({
              id,
              kind: 'pin',
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

        updatePin(id, patch) {
          setter(function (state) {
            const entry = state.items.find(function (w) {
              return w.id === id && w.kind === 'pin'
            })
            if (!entry || entry.kind !== 'pin') return
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

        clearPins() {
          setter(function (state) {
            state.items = state.items.filter(function (w) {
              return w.kind !== 'pin'
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

export { isOverlayPanelKind, OVERLAY_PANEL_KINDS }
