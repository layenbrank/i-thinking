import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Suspense, lazy, useEffect } from 'react'

import { Fallback } from '@/components/fallback'
import {
  useOverlayStore,
  isOverlayPanelKind,
  type OverlayMode,
  type OverlayPanelKind
} from '@/stores/overlay'
import styles from '@/views/overlay/overlay.module.scss'
import Panel from '@/views/overlay/panels/panel'
import Pin from '@/views/overlay/panels/pin'

interface MountPanelPayload {
  kind?: string
  magneticTileID?: string | null
  size?: string | null
  shape?: string | null
  direction?: string | null
}

const Screenshot = lazy(function () {
  return import('@/views/screenshot/screenshot')
})

export default function OverlayShell() {
  const mode = useOverlayStore(function (s) {
    return s.mode
  })
  const items = useOverlayStore(function (s) {
    return s.items
  })
  const updateMode = useOverlayStore(function (s) {
    return s.updateMode
  })
  const mountPanel = useOverlayStore(function (s) {
    return s.mountPanel
  })
  const removeItem = useOverlayStore(function (s) {
    return s.removeItem
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

      function applyMount(payload: MountPanelPayload | null | undefined) {
        const kind = payload?.kind
        if (!kind || !isOverlayPanelKind(kind)) return
        mountPanel(kind, payload?.magneticTileID ?? undefined, {
          size: (payload?.size ?? undefined) as Mirror.Size | undefined,
          shape: (payload?.shape ?? undefined) as Mirror.Shape | undefined,
          direction: (payload?.direction ?? undefined) as Mirror.Direction | undefined
        })
      }

      function applyUnmount(payload: { kind?: string } | null | undefined) {
        const kind = payload?.kind
        if (!kind || !isOverlayPanelKind(kind)) return
        removeItem(kind)
      }

      ;(async function () {
        try {
          unlistenMode = await listen<OverlayMode>('overlay://mode', function (event) {
            updateMode(event.payload)
          })
          unlistenMount = await listen<MountPanelPayload>('overlay://mount', function (event) {
            applyMount(event.payload)
          })
          unlistenUnmount = await listen<{ kind: string }>('overlay://unmount', function (event) {
            applyUnmount(event.payload)
          })
          unlistenClear = await listen('overlay://clear-pins', function () {
            clearPins()
          })
          unlistenHide = await listen('overlay://hide', function () {
            updateMode('idle')
            void invoke('overlay:hide')
          })
          const pending = await invoke<MountPanelPayload | null>('overlay:take-pending')
          if (!cancelled) applyMount(pending)
          const pendingUnmount = await invoke<{ kind: string } | null>(
            'overlay:take-pending-unmount'
          )
          if (!cancelled) applyUnmount(pendingUnmount)
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
    [clearPins, mountPanel, removeItem, updateMode]
  )

  const pins = items.filter(function (entry) {
    return entry.kind === 'pin'
  })
  const panels = items.filter(function (entry) {
    return entry.kind !== 'pin'
  })

  return (
    <div className={styles.shell}>
      <div className={styles.stage}>
        {panels.map(function (entry) {
          if (entry.kind === 'pin') return null
          return (
            <Panel
              key={entry.id}
              item={entry}
            />
          )
        })}
        {pins.map(function (entry) {
          if (entry.kind !== 'pin') return null
          return (
            <Pin
              key={entry.id}
              item={entry}
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
