import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { findUpSync } from 'find-up'

import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VueMcp } from 'vite-plugin-vue-mcp'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import pkg from './package.json'

const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    VueMcp(),
    vueDevTools(),
    Icons({
      compiler: 'vue3',
      autoInstall: true,
      scale: 1,
      defaultStyle: '',
      defaultClass: '',
      jsx: 'react',
      iconCustomizer(collection, icon, props) {
        props['aria-hidden'] = 'true'
      },
      customCollections: {
        // 'local' 是自定义集合名称，可以改为任何你喜欢的名称
        local: FileSystemIconLoader(
          resolve(rootDir, 'apps/client/src/assets/icons'),
          // resolve(rootDir, 'src/assets/icons'),
          function (svg) {
            return svg.replace(/^<svg /, '<svg fill="currentColor" ')
          }
        )
      }
    }),
    AutoImport({
      dts: 'src/types/auto-imports.d.ts',
      include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/, /\.md$/],
      imports: ['vue', 'vue-router', 'pinia']
    }),
    Components({
      resolvers: [
        AntDesignVueResolver({
          importStyle: false
        }),
        IconsResolver({
          prefix: 'Icon',
          customCollections: ['local']
        })
      ],
      dts: 'src/types/components.d.ts'
    }),
    electron({
      main: {
        // Shortcut of `build.lib.entry`.
        entry: 'electron/main.ts'
      },
      preload: {
        // Shortcut of `build.rollupOptions.input`.
        // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
        input: path.join(__dirname, 'electron/preload.ts')
      },
      // Ployfill the Electron and Node.js API for Renderer process.
      // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
      // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
      renderer:
        process.env.NODE_ENV === 'test'
          ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
            undefined
          : {}
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia']
  },
  build: {
    // outDir: resolve(rootDir, `dist/${pkg.name.replace(/^@desktop-widgets\//, '')}`),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id, meta) {
          // 分包配置映射表，便于维护和扩展
          const chunkMap: Readonly<Record<string, RegExp[]>> = {
            // 前端核心框架
            'core-framework': [/[\\/]node_modules[\\/](vue|vue-router|pinia|@vue)[\\/]/],

            // UI 组件库 - 主库
            'ui-antdv': [/[\\/]node_modules[\\/]ant-design-vue[\\/]/],

            // UI 组件库 - 第三方依赖
            'ui-antdv-vendors': [
              /[\\/]node_modules[\\/](@ant-design|@ctrl\/tinycolor|@emotion|@simonwep\/pickr|array-tree-filter|async-validator|dom-align|dom-scroll-into-view|resize-observer-polyfill|scroll-into-view-if-needed|shallow-equal|stylis|throttle-debounce|vue-types|warning)[\\/]/
            ],

            // UI 图标
            'ui-icons': [/[\\/]node_modules[\\/](@iconify\/json)[\\/]/],

            // 工具库 - 国际化
            'lib-i18n': [/[\\/]node_modules[\\/](vue-i18n|@intlify)[\\/]/],

            // 工具库 - 日期时间
            'lib-datetime': [/[\\/]node_modules[\\/](dayjs|lunisolar|tyme4ts)[\\/]/],

            // 工具库 - 存储
            'lib-storage': [/[\\/]node_modules[\\/]dexie[\\/]/],

            // 工具库 - UI 增强
            'lib-ui-enhance': [/[\\/]node_modules[\\/](swiper|@vueuse|sortablejs)[\\/]/],

            // 工具库 - 网络请求
            'lib-network': [
              /[\\/]node_modules[\\/](axios|alova|@alova|rate-limiter-flexible|@ngify)[\\/]/
            ],

            // 工具库 - 核心工具集
            'lib-utils': [
              /[\\/]node_modules[\\/](clsx|rxjs|lodash-es|deep-pick-omit|uuid|fuse\.js)[\\/]/
            ]
          }

          // 遍历映射表，匹配当前模块路径
          for (const [chunkName, patterns] of Object.entries(chunkMap)) {
            if (patterns.some((pattern) => pattern.test(id))) {
              return chunkName
            }
          }

          // 其他第三方依赖
          if (/[\\/]node_modules[\\/]/.test(id)) {
            return 'vendors'
          }
        }
      }
    }
  },
  css: {
    modules: {
      // 生成的类名格式
      generateScopedName: '[name]-[local]-[hash:base64:6]',
      // 是否驼峰化 CSS 类名
      localsConvention: 'camelCase',
      // 哪些文件需要使用 CSS Modules（默认：/\.module\./）
      scopeBehaviour: 'local',
      // 自定义哈希函数
      hashPrefix: 'prefix'
    },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
        // additionalData: '@import "@/styles/variables.scss";',
      }
    }
  }
})
