import { ThemeProvider as BaseThemeProvider } from '@i-thinking/design/composite/theme-provider'
import { useTheme } from '@i-thinking/design/hooks/use-theme'
import { Toaster } from '@i-thinking/design/primitive/sonner'
import { isThemeMode, type ThemeStorage } from '@i-thinking/design/lib/theme'
import type { ReactNode } from 'react'

/** 主题在 electron-store 里的扁平键（渲染进程经 preload 的 itc.store 读写） */
const THEME_KEY = 'theme'

const storage: ThemeStorage = {
  async read() {
    const value = await itc.store.toRead({ key: THEME_KEY })
    return isThemeMode(value) ? value : null
  },
  async write(theme) {
    await itc.store.toWrite({ key: THEME_KEY, value: theme })
  }
}

/**
 * Studio 主题提供者：`@i-thinking/design` 的 ThemeProvider + electron-store 持久化。
 * 主题只关心明暗切换；颜色/圆角等一律是 globals.css 的 CSS 变量。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return <BaseThemeProvider storage={storage}>{children}</BaseThemeProvider>
}

/** 通知层：跟随当前解析后的主题（sonner 的 theme 只认 light/dark） */
export function ThemeToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster theme={resolvedTheme} />
}
