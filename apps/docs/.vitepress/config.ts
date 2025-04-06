import { defineConfig } from 'vitepress'
import nav from './nav.ts'
import sidebar from './sidebar.ts'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  lang: 'zh-CN',

  title: 'TurboRepo',
  cleanUrls: true,
  description: 'TurboRepo 文档',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  themeConfig: {
    logo: '/logo.svg',
    nav,
    sidebar,
    socialLinks: [
      { icon: 'github', link: 'https://lihecloud.cn' },
      { icon: 'twitter', link: 'https://lihecloud.cn' },
      { icon: 'discord', link: 'https://lihecloud.cn' }
    ]
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    }
  }
  // themeConfig: {
  //   // https://vitepress.dev/reference/default-theme-config
  //   nav: [
  //     { text: 'Home', link: '/' },
  //     { text: 'Examples', link: '/markdown-examples' }
  //   ],

  //   sidebar: [
  //     {
  //       text: 'Examples',
  //       items: [
  //         { text: 'Markdown Examples', link: '/markdown-examples' },
  //         { text: 'Runtime API Examples', link: '/api-examples' }
  //       ]
  //     }
  //   ],

  //   socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }]
  // }
})
