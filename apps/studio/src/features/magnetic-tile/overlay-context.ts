import { createContext } from 'react'

/**
 * 浮层（Overlay）的共享契约：context、类型、命令式 API。
 *
 * 与组件文件 `overlay.tsx` 分居两个模块：组件文件只导出组件（Fast Refresh 的要求），
 * 这里放 context / 类型 / 按磁贴 id 的命令式入口，两边共享同一个 context 与 HANDLERS。
 */

/** 宿主内：磁贴 id → Overlay 显隐回调 */
type VisibleFn = (visible: boolean) => void

/** 关闭手势：Esc / 点击遮罩 */
type DismissReason = 'escape' | 'overlay'

/** framed：配置弹层；fluid：工作台（morph） */
type OverlayMode = 'framed' | 'fluid'

/** 关闭后的缓存策略 */
type Cache = 'destroy' | 'keepAlive'

interface OverlayContextProps {
  visible: boolean
  renderable: boolean
  fullscreen: boolean
  onUpdateVisible: (value: boolean) => void
  onUpdateRenderable: (value: boolean) => void
  onUpdateFullscreen: (value: boolean) => void
}

const OverlayContext = createContext<OverlayContextProps>({
  visible: false,
  renderable: false,
  fullscreen: false,
  onUpdateVisible: function (value) {
    void value
  },
  onUpdateRenderable: function (value) {
    void value
  },
  onUpdateFullscreen: function (value) {
    void value
  }
})

const HANDLERS = new Map<string, VisibleFn>()

function bindOverlay(id: string, onVisible: VisibleFn) {
  HANDLERS.set(id, onVisible)
  return function () {
    if (HANDLERS.get(id) === onVisible) HANDLERS.delete(id)
  }
}

/** 按磁贴 id 呈现 Overlay（须已 bind） */
function presentOverlay(id: string) {
  const onVisible = HANDLERS.get(id)
  if (!onVisible) {
    console.warn('[overlay] unbound id', id)
    return false
  }
  onVisible(true)
  return true
}

export { bindOverlay, OverlayContext, presentOverlay }
export type { Cache, DismissReason, OverlayContextProps, OverlayMode }
