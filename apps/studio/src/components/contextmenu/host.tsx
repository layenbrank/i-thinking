import { AnimatePresence } from 'motion/react'
import { createElement, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import { MenuLayer } from '@/components/contextmenu/contextmenu'
import { useDismiss } from '@/components/contextmenu/menu'
import type { MenuSelectInfo } from '@/components/contextmenu/menu'
import {
  dismissMenu,
  findSnapshot,
  resetMenu,
  subscribe,
  updateActiveKey,
  updatePath
} from '@/components/contextmenu/host-store'
import { VIEWPORT_PADDING } from '@/components/contextmenu/position'

function Host() {
  const state = useSyncExternalStore(subscribe, findSnapshot, findSnapshot)

  const container = state.config.onTeleport?.() ?? document.body

  useDismiss({
    visible: state.visible,
    onClose: dismissMenu
  })

  function onSelect(info: MenuSelectInfo) {
    state.config.onSelect?.(info)
    dismissMenu()
  }

  // session 进 key：已打开再开时重播入场；onExitComplete 仅在关闭后 reset
  const layer = state.visible
    ? createElement(MenuLayer, {
        key: `contextmenu-host-${state.session}`,
        layer: { anchor: state.anchor, items: state.items },
        path: state.path,
        activeKey: state.activeKey,
        classNames: state.config.classNames,
        styles: state.config.styles,
        motion: state.config.motion,
        offset: state.config.offset,
        submenuOffset: state.config.submenuOffset,
        boundaryPadding: state.config.boundaryPadding ?? VIEWPORT_PADDING,
        expandDelay: state.config.expandDelay,
        collapseDelay: state.config.collapseDelay,
        container,
        renderItem: state.config.renderItem,
        renderSurface: state.config.renderSurface,
        onUpdatePath: updatePath,
        onUpdateActive: updateActiveKey,
        onSelect,
        onClose: dismissMenu
      })
    : null

  return createPortal(
    createElement(AnimatePresence, {
      onExitComplete: function () {
        // 用最新快照而不是这次渲染的 state：已重新打开时不能把新层 reset 掉
        if (findSnapshot().visible) return
        resetMenu()
      },
      children: layer
    }),
    container
  )
}

export { Host }
