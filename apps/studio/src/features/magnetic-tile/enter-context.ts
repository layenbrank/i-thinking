import { createContext, useContext } from 'react'

/**
 * 入场上下文（`.ts` 而非 `.tsx`：本模块不定义组件，只提供 context 与 hook）。
 *
 * 组件文件 `enter.tsx` 只导出组件 `Enter` —— Fast Refresh 要求组件文件的导出全是组件，
 * context / hook 这类非组件导出单独放这里，两边共享同一个 context 实例。
 */

type EnterValue = {
  isActive: boolean
  index: number
}

const ENTER_IDLE: EnterValue = {
  isActive: false,
  index: 0
}

const EnterContext = createContext<EnterValue>(ENTER_IDLE)

function useEnter() {
  return useContext(EnterContext)
}

export { EnterContext, useEnter }
export type { EnterValue }
