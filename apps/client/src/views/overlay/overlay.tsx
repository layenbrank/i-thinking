import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Suspense, lazy, useEffect } from 'react'

import { Fallback } from '@/components/fallback'
import {
  useOverlayStore,
  type OverlayMode,
  type OverlayPanelKind
} from '@/stores/overlay'
import styles from '@/views/overlay/overlay.module.scss'
import PanelWidget from '@/views/overlay/widgets/panel'
import PinWidget from '@/views/overlay/widgets/pin'

interface PendingMount {
  kind: string
  applicationId?: string | null
  size?: string | null
  shape?: string | null
  direction?: string | null
}

const Screenshot = lazy(function () {
  return import('@/views/screenshot/screenshot')
})

interface MountPayload {
  kind?: OverlayPanelKind
  applicationId?: string
  size?: Mirror.Size
  shape?: Mirror.Shape
  direction?: Mirror.Direction
}

export default function OverlayShell() {
  const mode = useOverlayStore(function (s) {
    return s.mode
  })
  const widgets = useOverlayStore(function (s) {
    return s.widgets
  })
  const setMode = useOverlayStore(function (s) {
    return s.setMode
  })
  const mountPanel = useOverlayStore(function (s) {
    return s.mountPanel
  })
  const removeWidget = useOverlayStore(function (s) {
    return s.removeWidget
  })
  const exitCapture = useOverlayStore(function (s) {
    return s.exitCapture
  })
  const addPin = useOverlayStore(function (s) {
    return s.addPin
  })
  const clearPins = useOverlayStore(function (s) {
    return s.clearPins
  })

  useEffect(
    function () {
      let unlistenMode: (() => void) | undefined
      let unlistenMount: (() => void) | undefined
      let unlistenUnmount: (() => void) | undefined
      let unlistenClear: (() => void) | undefined
      let unlistenHide: (() => void) | undefined
      let cancelled = false

      function applyMount(payload: MountPayload | PendingMount | null | undefined) {
        const kind = payload?.kind as OverlayPanelKind | undefined
        if (!kind) return
        if (kind !== 'countdown' && kind !== 'calendar' && kind !== 'clock') return
        const applicationId =
          payload && 'applicationId' in payload
            ? (payload.applicationId ?? undefined)
            : undefined
        mountPanel(kind, applicationId ?? undefined, {
          size: (payload?.size ?? undefined) as Mirror.Size | undefined,
          shape: (payload?.shape ?? undefined) as Mirror.Shape | undefined,
          direction: (payload?.direction ?? undefined) as Mirror.Direction | undefined
        })
      }

      function applyUnmount(payload: { kind?: string } | null | undefined) {
        const kind = payload?.kind
        if (!kind) return
        if (kind !== 'countdown' && kind !== 'calendar' && kind !== 'clock') return
        removeWidget(kind)
      }

      ;(async function () {
        try {
          unlistenMode = await listen<OverlayMode>('overlay://mode', function (event) {
            setMode(event.payload)
          })
          unlistenMount = await listen<MountPayload>('overlay://mount', function (event) {
            applyMount(event.payload)
          })
          unlistenUnmount = await listen<{ kind: string }>('overlay://unmount', function (event) {
            applyUnmount(event.payload)
          })
          unlistenClear = await listen('overlay://clear-pins', function () {
            clearPins()
          })
          unlistenHide = await listen('overlay://hide', function () {
            setMode('idle')
            void invoke('overlay:hide')
          })
          const pending = await invoke<PendingMount | null>('overlay:take-pending')
          if (!cancelled) applyMount(pending)
        } catch (err) {
          if (!cancelled) console.warn('[overlay] event listen failed', err)
        }
      })()

      return function () {
        cancelled = true
        unlistenMode?.()
        unlistenMount?.()
        unlistenUnmount?.()
        unlistenClear?.()
        unlistenHide?.()
      }
    },
    [clearPins, mountPanel, removeWidget, setMode]
  )

  const pins = widgets.filter(function (w) {
    return w.kind === 'pin'
  })
  const panels = widgets.filter(function (w) {
    return w.kind !== 'pin'
  })

  return (
    <div className={styles.shell}>
      <div className={styles.stage}>
        {panels.map(function (widget) {
          if (widget.kind === 'pin') return null
          return (
            <PanelWidget
              key={widget.id}
              widget={widget}
            />
          )
        })}
        {pins.map(function (widget) {
          if (widget.kind !== 'pin') return null
          return (
            <PinWidget
              key={widget.id}
              widget={widget}
            />
          )
        })}
        {mode === 'capture' ? (
          <div className={styles.capture}>
            <Suspense fallback={<Fallback.Route />}>
              <Screenshot
                embedded
                onExit={function () {
                  void exitCapture()
                }}
                onPinned={function (input) {
                  addPin(input)
                  void exitCapture()
                }}
              />
            </Suspense>
          </div>
        ) : null}
      </div>
    </div>
  )
}
