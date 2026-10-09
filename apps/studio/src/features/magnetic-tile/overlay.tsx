import { Dialog, DialogContent } from '@i-thinking/design/components/dialog'
import { clsx, type ClassValue } from 'clsx'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { ABORT_TIMEOUT_MS } from '@/constants/magnetic-tile/components'
import {
  bindOverlay,
  OverlayContext,
  type Cache,
  type DismissReason,
  type OverlayMode
} from './overlay-context'
import styles from './magnetic-tile.module.scss'

interface OverlayProps {
  children?: ReactNode
  className?: ClassValue
  style?: CSSProperties
  width?: CSSProperties['width']
  /** fluid 覆盖默认高度；framed 由 aspect-ratio 定高，忽略本值 */
  height?: CSSProperties['height']
  /** framed：配置弹层；fluid：工作台（morph） */
  mode?: OverlayMode
  /** 底栏操作区；不传则不渲染 */
  controls?: ReactNode
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
  destroyOnHidden?: boolean
  onCancel?: (reason: DismissReason) => void
}

type OverlayControlProps = Pick<OverlayProps, 'cache' | 'onAbort' | 'abortTimeoutMs'>

/** 关闭原因由 Base UI 的 `onOpenChange` 第二参给出，取代 radix 的 onEscapeKeyDown / onPointerDownOutside */
type OpenChangeDetails = Parameters<NonNullable<ComponentProps<typeof Dialog>['onOpenChange']>>[1]

interface OverlayProviderProps {
  children: ReactNode
  magneticTileID?: string
}

const WIDTH = '80%'

function OverlayProvider(props: OverlayProviderProps) {
  const [visible, setVisible] = useState(false)
  const [renderable, setRenderable] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const updateVisible = useCallback(function (value: boolean) {
    setVisible(value)
    if (value) {
      setRenderable(true)
      return
    }
    setFullscreen(false)
  }, [])

  useEffect(
    function () {
      if (!props.magneticTileID) return
      return bindOverlay(props.magneticTileID, updateVisible)
    },
    [props.magneticTileID, updateVisible]
  )

  const context = useMemo(
    function () {
      return {
        visible,
        renderable,
        fullscreen,
        onUpdateVisible: updateVisible,
        onUpdateRenderable: setRenderable,
        onUpdateFullscreen: setFullscreen
      }
    },
    [visible, renderable, fullscreen, updateVisible]
  )

  return <OverlayContext value={context}>{props.children}</OverlayContext>
}

/**
 * MagneticTile Overlay Facade：尺寸走 CSS class，公开 props 为白名单。
 */
function Overlay(props: OverlayProps) {
  const {
    className,
    width = WIDTH,
    height,
    onCancel,
    children,
    cache = 'destroy',
    onAbort,
    abortTimeoutMs = ABORT_TIMEOUT_MS,
    destroyOnHidden,
    controls,
    style: styleProp,
    mode = 'framed'
  } = props
  const { visible, fullscreen, onUpdateVisible, onUpdateRenderable } = useContext(OverlayContext)

  const shouldDestroyOnHidden = cache === 'destroy' ? true : (destroyOnHidden ?? false)
  /** keepAlive：关闭后仍留在 DOM（iframe 不重载）；关闭态靠 .overlay[data-closed] 隐藏 */
  const isKeepMounted = !shouldDestroyOnHidden

  const hasControls = controls !== null && controls !== undefined
  const isFluid = mode === 'fluid'

  async function handleAfterClose() {
    if (cache !== 'destroy') return

    onUpdateRenderable(false)
    if (!onAbort) return

    try {
      await Promise.race([
        onAbort(),
        new Promise<void>(function (resolve) {
          window.setTimeout(resolve, abortTimeoutMs)
        })
      ])
    } catch (error) {
      // 清理失败不能挡住强制卸载：出声后继续
      console.error('[overlay] 强制卸载前的清理失败', error)
    }
  }

  function handleCancel(reason: DismissReason) {
    onUpdateVisible(false)
    onCancel?.(reason)
  }

  /** Esc / 遮罩 / 关闭按钮统一走这里；理由由 `onOpenChange` 的 eventDetails 补充 */
  function handleOpenChange(open: boolean, eventDetails: OpenChangeDetails) {
    if (open) return

    if (eventDetails.reason === 'escape-key') {
      handleCancel('escape')
      return
    }
    if (eventDetails.reason === 'outside-press') {
      handleCancel('overlay')
      return
    }

    onUpdateVisible(false)
  }

  // 尺寸由 .framed / .fluid / .fullscreen 管；仅透传 style，fluid 可覆盖 height
  const overlayStyle: CSSProperties =
    !fullscreen && height !== null && height !== undefined
      ? { ...styleProp, height }
      : { ...styleProp }

  return (
    <Dialog
      open={visible}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={function (open) {
        // 关闭收尾挂这里：官方文档把它定义为「开关动画都结束后」的回调，也是迁移参考里
        // 替代 radix `forceMount`/收尾动作的指定位置（`apps/v4` 的 skill：forceMount → keepMounted on Portal,
        // otherwise dropped, use `actionsRef.current.unmount()` + `onOpenChangeComplete`）。
        //
        // 注意它**开/关都会回调**：开侧来自 `DialogPopup` 里的 `onComplete() { if (open) ... }`，
        // 关侧来自共享 popup store 的 `useOpenStateTransitions` → `forceUnmount()` → `onOpenChangeComplete(false)`
        // （`utils/popups/popupStoreUtils.js`）。只 grep `dialog/` 目录会看不到关侧那一处。
        if (!open) void handleAfterClose()
      }}>
      <DialogContent
        showCloseButton={false}
        keepMounted={isKeepMounted}
        data-slot="magnetic-tile-overlay"
        className={clsx(
          'magnetic-tile-overlay',
          styles.overlay,
          !fullscreen && (isFluid ? styles.fluid : styles.framed),
          fullscreen && styles.fullscreen,
          className
        )}
        style={{ ...overlayStyle, width: fullscreen ? '100%' : width }}>
        <div className={styles.body}>{children}</div>
        {hasControls ? <div className={styles.controls}>{controls}</div> : null}
      </DialogContent>
    </Dialog>
  )
}

export { Overlay, OverlayProvider }
export type {
  Cache,
  DismissReason,
  OverlayControlProps,
  OverlayMode,
  OverlayProps,
  OverlayProviderProps
}
