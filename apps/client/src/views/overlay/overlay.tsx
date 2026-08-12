import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { isMagneticTileComponent } from '@/constants/magnetic-tile/components'
import { useThrough } from '@/hooks/use-through'
import {
  useOverlayStore,
  type OverlayMode,
  type OverlayTexture,
  type OverlayTile
} from '@/stores/overlay'
import styles from '@/views/overlay/overlay.module.scss'
import Texture from '@/views/overlay/texture'
import Tile from '@/views/overlay/tile'

const Screenshot = lazy(function () {
  return import('@/features/screenshot/screenshot')
})

const OVERLAY_SHELL_SOURCE = 'overlay-shell'

interface MountTilePayload {
  kind: string
  magneticTileID: string
  size?: string | null
  shape?: string | null
  direction?: string | null
  round?: string | null
  background?: MagneticTile.Background | null
}

function OverlayShell() {
  const shellRef = useRef<HTMLElement | null>(document.body)
  const stageRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [stageBounds, setStageBounds] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const items = useOverlayStore(function (s) {
    return s.items
  })
  const toMode = useOverlayStore(function (s) {
    return s.toMode
  })
  const toMount = useOverlayStore(function (s) {
    return s.toMount
  })
  const toRemove = useOverlayStore(function (s) {
    return s.toRemove
  })
  const toClear = useOverlayStore(function (s) {
    return s.toClear
  })
  const mode = useOverlayStore(function (s) {
    return s.mode
  })
  const toCaptureExit = useOverlayStore(function (s) {
    return s.toCaptureExit
  })
  const toWrite = useOverlayStore(function (s) {
    return s.toWrite
  })

  useThrough(OVERLAY_SHELL_SOURCE, { rootRef: shellRef, enabled: mode !== 'capture' })

  // 全局 ESC fallback：capture 模式下仍能退出截屏
  useHotkeys(
    'escape',
    function () {
      if (mode === 'capture') {
        void toCaptureExit()
      }
    },
    { enabled: mode === 'capture' }
  )

  // 追踪 stage 尺寸作为拖拽边界
  useEffect(function () {
    const stage = stageRef.current
    if (!stage) return
    const ro = new ResizeObserver(function () {
      setStageBounds({ width: stage.clientWidth, height: stage.clientHeight })
    })
    ro.observe(stage)
    return function () {
      ro.disconnect()
    }
  }, [])

  useEffect(
    function () {
      let unlistenMode: (() => void) | undefined
      let unlistenMount: (() => void) | undefined
      let unlistenUnmount: (() => void) | undefined
      let unlistenClear: (() => void) | undefined
      let unlistenHide: (() => void) | undefined
      let cancelled = false

      function applyMount(payload: MountTilePayload | null | undefined) {
        if (!payload) return
        if (!isMagneticTileComponent(payload.kind) || !payload.magneticTileID) return
        toMount(payload.kind, payload.magneticTileID, {
          size: (payload.size ?? undefined) as Mirror.Size | undefined,
          shape: (payload.shape ?? undefined) as Mirror.Shape | undefined,
          direction: (payload.direction ?? undefined) as Mirror.Direction | undefined,
          round: payload.round ?? null,
          background: payload.background ?? null
        })
      }

      function applyUnmount(payload: { magneticTileID?: string } | null | undefined) {
        if (!payload?.magneticTileID) return
        toRemove(payload.magneticTileID)
      }

      async function bootstrap() {
        try {
          unlistenMode = await listen<OverlayMode>('overlay://mode', function (event) {
            toMode(event.payload)
          })
          unlistenMount = await listen<MountTilePayload>('overlay://mount', function (event) {
            applyMount(event.payload)
          })
          unlistenUnmount = await listen<{ magneticTileID: string }>(
            'overlay://unmount',
            function (event) {
              applyUnmount(event.payload)
            }
          )
          unlistenClear = await listen('overlay://clear-textures', function () {
            toClear()
          })
          unlistenHide = await listen('overlay://hide', function () {
            toMode('idle')
            void invoke('overlay:hide')
          })
          await useOverlayStore.getState().toInitialize()
          applyMount(await invoke<MountTilePayload | null>('overlay:take-pending'))
          applyUnmount(
            await invoke<{ magneticTileID: string } | null>('overlay:take-pending-unmount')
          )
          setReady(true)
        } catch (err) {
          if (!cancelled) console.warn('[overlay] bootstrap failed', err)
        }
      }

      void bootstrap()

      return function () {
        cancelled = true
        unlistenMode?.()
        unlistenMount?.()
        unlistenUnmount?.()
        unlistenClear?.()
        unlistenHide?.()
      }
    },
    [toClear, toMount, toRemove, toMode]
  )

  const textures = items.filter(function (entry): entry is OverlayTexture {
    return entry.kind === 'texture'
  })
  const tiles = items.filter(function (entry): entry is OverlayTile {
    return entry.kind !== 'texture'
  })

  return (
    <div className={styles.shell}>
      <div
        ref={stageRef}
        className={styles.stage}>
        {mode === 'capture' && (
          <Suspense fallback={null}>
            <Screenshot
              embedded={true}
              onExit={toCaptureExit}
              onTexture={function (input) {
                toWrite(input)
              }}
            />
          </Suspense>
        )}
        {ready &&
          mode !== 'capture' &&
          tiles.map(function (entry) {
            return (
              <Tile
                key={entry.id}
                item={entry}
                stageBounds={stageBounds}
              />
            )
          })}
        {ready &&
          mode !== 'capture' &&
          textures.map(function (entry) {
            return (
              <Texture
                key={entry.id}
                item={entry}
                stageBounds={stageBounds}
              />
            )
          })}
      </div>
    </div>
  )
}

export default OverlayShell
export { OverlayShell }
