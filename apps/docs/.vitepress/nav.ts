import type { DefaultTheme } from 'vitepress'
export default [
  {
    text: 'Home',
    link: '/'
  },
  {
    text: 'Packages',
    link: '/packages/core/core.md',
    activeMatch: '/packages/'
  },
  {
    text: 'Configs',
    link: '/configs/vite/vite.md',
    activeMatch: '/configs/'
  }
] as DefaultTheme.NavItem[]
