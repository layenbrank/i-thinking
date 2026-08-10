import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { useEffect, useRef } from 'react'

import { useThrough } from '@/hooks/use-through'
import { isMagneticTileComponent } from '@/constants/magnetic-tile/components'
import {
  useOverlayStore,
  type OverlayMode,
  type OverlayTile,
  type OverlayTexture
} from '@/stores/overlay'
import styles from '@/views/overlay/overlay.module.scss'
import Tile from '@/views/overlay/tile'
import Texture from '@/views/overlay/texture'

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

  useThrough(OVERLAY_SHELL_SOURCE, { rootRef: shellRef, enabled: true })

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
      <div className={styles.stage}>
        {tiles.map(function (entry) {
          return (
            <Tile
              key={entry.id}
              item={entry}
            />
          )
        })}
        {textures.map(function (entry) {
          return (
            <Texture
              key={entry.id}
              item={entry}
            />
          )
        })}
      </div>
    </div>
  )
}

export default OverlayShell
export { OverlayShell }
