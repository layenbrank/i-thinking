import { createContext, useContext } from 'react'

import type { ResolvedTheme, ThemeMode } from '../lib/theme'

interface ThemeContextValue {
  /** 用户选择：light / dark / system */
  theme: ThemeMode
  /** 折算后的实际模式（system 已解析） */
  resolvedTheme: ResolvedTheme
  /** 设置主题（会同步写入注入的存储） */
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** 读取主题状态；必须在 ThemeProvider 内使用 */
function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)
  if (!value) {
    throw new Error('useTheme 必须在 ThemeProvider 内使用')
  }
  return value
}

export { ThemeContext, useTheme }
export type { ThemeContextValue }
