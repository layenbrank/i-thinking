/**
 * 主题契约（标准 shadcn 做法）。
 *
 * - 只有 light / dark / system 三种取值，靠根节点 `.dark` class 切换
 * - 颜色、圆角等一律是 `globals.css` 里的 CSS 变量，不在运行时计算（不用「种子色 + 算法」那套）
 * - 每个 app 自己决定持久化位置：studio 走 electron-store（IPC），extension 走 localStorage
 */

export const THEME_MODES = ['light', 'dark', 'system'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export type ResolvedTheme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** 校验持久化里读到的值（存储是不可信输入） */
export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && (THEME_MODES as readonly string[]).includes(value)
}

/** 读取系统主题（SSR / 非浏览器环境回退 light） */
export function readSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

/** 订阅系统主题变化；返回取消订阅函数（供 useSyncExternalStore 使用） */
export function subscribeSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return function () {}
  }
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return function () {
    media.removeEventListener('change', onChange)
  }
}

export function resolveTheme(
  theme: ThemeMode,
  systemTheme: ResolvedTheme = readSystemTheme()
): ResolvedTheme {
  return theme === 'system' ? systemTheme : theme
}

/**
 * 把解析后的主题写到根节点：`.dark` class + `color-scheme`
 * （后者让原生滚动条、表单控件、选区跟随主题，避免深色下白底闪烁）
 */
export function applyTheme(element: HTMLElement, resolved: ResolvedTheme): void {
  element.classList.toggle('dark', resolved === 'dark')
  element.style.colorScheme = resolved
}

/** 存储适配器：app 注入（默认实现见 useLocalThemeStorage） */
export interface ThemeStorage {
  read: () => ThemeMode | null | Promise<ThemeMode | null>
  write: (theme: ThemeMode) => void | Promise<void>
}

/** 默认存储：localStorage（浏览器 / MV3 页面可用；Electron 建议换成主进程存储） */
export function useLocalThemeStorage(storageKey = 'i-thinking-theme'): ThemeStorage {
  return {
    read() {
      if (typeof localStorage === 'undefined') return null
      const value = localStorage.getItem(storageKey)
      return isThemeMode(value) ? value : null
    },
    write(theme) {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(storageKey, theme)
    }
  }
}

export const THEME_MEDIA_QUERY = DARK_QUERY
