import type { Rolldown } from 'vite'

type CodeSplitting = Rolldown.CodeSplittingGroup

/**
 * 分包分组：Vue→React 重写后应用只剩「概览 + 导航磁贴」，原来的长表（vue / antd / markdown /
 * ffmpeg / 各类工具库…）已全部失效，这里只留下真正需要区分的几组。
 */
export const chunks: CodeSplitting[] = [
  {
    name: 'core-assets',
    priority: 90,
    test(id) {
      return /[\\/]src[\\/]assets[\\/]/.test(id)
    }
  },
  {
    name: 'core-database',
    priority: 90,
    test(id) {
      return /[\\/]src[\\/]database[\\/]/.test(id)
    }
  },
  {
    name: 'core-features',
    priority: 80,
    test(id) {
      return /[\\/]src[\\/]features[\\/]/.test(id)
    }
  },
  {
    name: 'core-views',
    priority: 80,
    test(id) {
      return /[\\/]src[\\/]views[\\/]/.test(id)
    }
  },
  {
    name: 'react',
    priority: 50,
    test(id) {
      return /[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(
        id
      )
    }
  },
  {
    name: 'radix',
    priority: 50,
    test(id) {
      return /[\\/]node_modules[\\/](radix-ui|@radix-ui)[\\/]/.test(id)
    }
  },
  {
    name: 'utils',
    priority: 40,
    test(id) {
      return /[\\/]node_modules[\\/](dexie|zod|clsx|lucide-react|@iconify|@tanstack)[\\/]/.test(id)
    }
  }
]
