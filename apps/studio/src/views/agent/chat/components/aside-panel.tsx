import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import {
  AsidePanelContext,
  type AsidePanelValue,
  type AsideSection
} from '@/views/agent/chat/components/use-aside-panel.ts'

interface AsidePanelProviderProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

/** 右栏开合状态的下发者；状态本体在 `chat.tsx`（见 `use-aside-panel.ts` 说明） */
export function AsidePanelProvider(props: AsidePanelProviderProps) {
  const { isOpen, onOpenChange, children } = props
  const [focus, updateFocus] = useState<AsideSection | null>(null)

  // 回调用 ref 拿最新值：`onOpenChange` 变化不该让下游的 open/toggle 换身份，
  // 否则依赖它们的 effect（如「有计划就开栏」）会反复触发
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(
    function () {
      onOpenChangeRef.current = onOpenChange
    },
    [onOpenChange]
  )

  const clearFocus = useCallback(function () {
    updateFocus(null)
  }, [])

  const open = useCallback(function (section?: AsideSection) {
    updateFocus(section ?? null)
    onOpenChangeRef.current(true)
  }, [])

  const close = useCallback(function () {
    onOpenChangeRef.current(false)
  }, [])

  const value = useMemo<AsidePanelValue>(
    function () {
      return {
        isOpen,
        focus,
        open,
        close,
        clearFocus,
        toggle: function () {
          onOpenChangeRef.current(!isOpen)
        }
      }
    },
    [isOpen, focus, open, close, clearFocus]
  )

  return <AsidePanelContext.Provider value={value}>{children}</AsidePanelContext.Provider>
}
