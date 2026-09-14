import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode
} from 'react'

import { ThemeContext } from '../hooks/use-theme'
import {
  applyTheme,
  isThemeMode,
  readSystemTheme,
  resolveTheme,
  subscribeSystemTheme,
  useLocalThemeStorage,
  type ResolvedTheme,
  type ThemeMode,
  type ThemeStorage
} from '../lib/theme'

interface ThemeProviderProps {
  children: ReactNode
  /** 首帧使用的主题（存储读取完成前）；默认 'system' */
  defaultTheme?: ThemeMode
  /** 持久化实现；缺省用 localStorage（Electron 建议传主进程存储） */
  storage?: ThemeStorage
  storageKey?: string
  /** 应用 `.dark` 的目标，默认 document.documentElement */
  target?: HTMLElement | null
}

/**
 * ThemeProvider —— 标准 shadcn 的暗色模式实现：切换根节点 `.dark` class。
 *
 * 不订阅颜色/圆角/字号（那些是 CSS 变量，写在 globals.css），也不依赖 next-themes，
 * 这样 Electron 与 MV3 页面可以共用，存储各自由 `storage` 注入。
 */
function ThemeProvider({
  children,
  defaultTheme = 'system',
  storage,
  storageKey,
  target
}: ThemeProviderProps) {
  const fallbackStorage = useLocalThemeStorage(storageKey)
  const themeStorage = storage ?? fallbackStorage

  const [theme, updateTheme] = useState<ThemeMode>(defaultTheme)

  const systemTheme = useSyncExternalStore<ResolvedTheme>(
    subscribeSystemTheme,
    readSystemTheme,
    function () {
      return 'light'
    }
  )

  const resolvedTheme = resolveTheme(theme, systemTheme)

  // 首屏同步落地，避免深色下白底闪烁
  useLayoutEffect(
    function () {
      const element = target ?? (typeof document === 'undefined' ? null : document.documentElement)
      if (!element) return
      applyTheme(element, resolvedTheme)
    },
    [resolvedTheme, target]
  )

  // 读取已持久化的选择（存储可能是异步的：Electron IPC / chrome.storage）
  useEffect(
    function () {
      let active = true
      void Promise.resolve(themeStorage.read()).then(function (stored) {
        if (!active || !isThemeMode(stored)) return
        updateTheme(stored)
      })
      return function () {
        active = false
      }
    },
    [themeStorage]
  )

  const setTheme = useCallback(
    function (next: ThemeMode) {
      updateTheme(next)
      void Promise.resolve(themeStorage.write(next))
    },
    [themeStorage]
  )

  const value = useMemo(
    function () {
      return { theme, resolvedTheme, setTheme }
    },
    [theme, resolvedTheme, setTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export { ThemeProvider }
export type { ThemeProviderProps }
