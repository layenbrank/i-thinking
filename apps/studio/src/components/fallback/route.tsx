import { Loader2Icon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ROUTE } from '@/components/fallback/constants.ts'

/** 路由懒加载占位：延迟 DELAY 后才出现，避免快路径下闪一下 */
export default function RouteFallback() {
  const [visible, updateVisible] = useState(false)

  useEffect(function () {
    const timer = window.setTimeout(function () {
      updateVisible(true)
    }, ROUTE.DELAY)
    return function () {
      window.clearTimeout(timer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 flex items-center justify-center gap-2 text-muted-foreground">
      <Loader2Icon
        aria-hidden
        className="size-5 animate-spin"
      />
      <span className="text-sm">{ROUTE.LABEL}</span>
    </div>
  )
}
