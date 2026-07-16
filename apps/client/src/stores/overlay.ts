import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type OverlayMode = 'idle' | 'capture'

export type OverlayPanelKind = 'countdown' | 'calendar' | 'clock'

export interface OverlayPinWidget {
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

export interface OverlayPanelWidget {
  id: string
  kind: OverlayPanelKind
  x: number
  y: number
  w: number
  h: number
  z: number
  applicationId?: string
}

export type OverlayWidget = OverlayPinWidget | OverlayPanelWidget

const PANEL_DEFAULTS: Record<OverlayPanelKind, { w: number; h: number }> = {
  countdown: { w: 400, h: 420 },
  calendar: { w: 600, h: 400 },
  clock: { w: 480, h: 360 }
}

interface OverlayStore {
  mode: OverlayMode
  widgets: OverlayWidget[]
  zCursor: number
  setMode: (mode: OverlayMode) => void
  mountPanel: (kind: OverlayPanelKind, applicationId?: string) => void
  addPin: (input: {
    src: string
    x?: number
    y?: number
    w: number
    h: number
    opacity?: number
  }) => string
  updateWidget: (id: string, patch: Partial<Pick<OverlayWidget, 'x' | 'y' | 'w' | 'h' | 'z'>>) => void
  updatePin: (
    id: string,
    patch: Partial<Pick<OverlayPinWidget, 'x' | 'y' | 'w' | 'h' | 'z' | 'opacity' | 'isThrough' | 'src'>>
  ) => void
  removeWidget: (id: string) => void
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
        widgets: [],
        zCursor: 10,

        setMode(mode) {
          setter(function (state) {
            state.mode = mode
          })
        },

        mountPanel(kind, applicationId) {
          setter(function (state) {
            const existing = state.widgets.find(function (w) {
              return w.kind === kind
            })
            if (existing) {
              existing.z = nextZ(state)
              if (applicationId && existing.kind !== 'pin') {
                existing.applicationId = applicationId
              }
              return
            }
            const size = PANEL_DEFAULTS[kind]
            const margin = 48 + state.widgets.length * 24
            state.widgets.push({
              id: kind,
              kind,
              x: margin,
              y: margin,
              w: size.w,
              h: size.h,
              z: nextZ(state),
              applicationId
            })
          })
          void getter().ensureVisible()
        },

        addPin(input) {
          let id = ''
          setter(function (state) {
            id = `pin-${Date.now()}-${state.zCursor}`
            const offset = (state.widgets.filter((w) => w.kind === 'pin').length % 8) * 28
            state.widgets.push({
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

        updateWidget(id, patch) {
          setter(function (state) {
            const widget = state.widgets.find(function (w) {
              return w.id === id
            })
            if (!widget) return
            if (patch.x !== undefined) widget.x = patch.x
            if (patch.y !== undefined) widget.y = patch.y
            if (patch.w !== undefined) widget.w = patch.w
            if (patch.h !== undefined) widget.h = patch.h
            if (patch.z !== undefined) widget.z = patch.z
          })
        },

        updatePin(id, patch) {
          setter(function (state) {
            const widget = state.widgets.find(function (w) {
              return w.id === id && w.kind === 'pin'
            })
            if (!widget || widget.kind !== 'pin') return
            Object.assign(widget, patch)
          })
        },

        removeWidget(id) {
          setter(function (state) {
            state.widgets = state.widgets.filter(function (w) {
              return w.id !== id
            })
          })
          void getter().hideIfEmpty()
        },

        clearPins() {
          setter(function (state) {
            state.widgets = state.widgets.filter(function (w) {
              return w.kind !== 'pin'
            })
          })
          void getter().hideIfEmpty()
        },

        bringToFront(id) {
          setter(function (state) {
            const widget = state.widgets.find(function (w) {
              return w.id === id
            })
            if (!widget) return
            widget.z = nextZ(state)
          })
        },

        hasContent() {
          return getter().widgets.length > 0 || getter().mode === 'capture'
        },

        async hideIfEmpty() {
          const { mode, widgets } = getter()
          if (mode === 'capture' || widgets.length > 0) return
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
