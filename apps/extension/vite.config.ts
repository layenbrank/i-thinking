import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { dirname, resolve } from 'node:path'
import { findUpSync } from 'find-up'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { VueMcp } from 'vite-plugin-vue-mcp'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import pkg from './package.json'

// 查找 turbo.json 或 pnpm-workspace.yaml 等 monorepo 根目录特有的文件
const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
  const env = loadEnv(mode || 'development', '')

  return {
    base: `/${pkg.name.replace(/^@desktop-widgets\//, '')}/`,
    plugins: [
      vue(),
      VueMcp(),
      vueJsx(),
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
            resolve(rootDir, 'apps/extension/src/assets/icons'),
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
      })
      // createSvgIconsPlugin({
      //   // 指定需要缓存的图标文件夹
      //   iconDirs: [
      //     // resolve(rootDir, 'src/assets/icons'),
      //     resolve(rootDir, 'apps/extension/src/assets/icons')
      //   ],
      //   // 指定symbolId格式
      //   symbolId: 'icon-[dir]-[name]',
      //   inject: 'body-last',
      //   svgoOptions: {
      //     plugins: [
      //       {
      //         name: 'preset-default',
      //         params: {
      //           overrides: {
      //             removeViewBox: false,
      //             removeTitle: false,
      //             removeDesc: { removeAny: true },
      //             removeUselessDefs: false
      //           }
      //         }
      //       },
      //       'removeDimensions'
      //     ]
      //   }
      // })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },

    build: {
      // 方案1: 输出到根目录的 dist 文件夹下（需要修改 turbo.json）
      outDir: resolve(rootDir, `dist/${pkg.name.replace(/^@desktop-widgets\//, '')}`),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          index: 'index.html',
          'service-worker': 'src/libs/service-worker.ts',
          'content-scripts': 'src/libs/content-scripts.ts'
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id, meta) {
            // 分包配置映射表，便于维护和扩展
            const chunkMap: Readonly<Record<string, RegExp[]>> = {
              // 前端核心框架
              'core-framework': [/[\\/]node_modules[\\/](vue|vue-router|pinia|@vue)[\\/]/],

              // 自研组件
              // 'ui-internal': [
              //   /@repo\/ui/,
              //   /packages[\\/]ui/,
              //   /[\\/]node_modules[\\/](@repo\/ui)[\\/]/
              // ],

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
                // /@repo\/core/,
                // /packages[\\/]core/,
                // /[\\/]node_modules[\\/](@repo\/core)[\\/]/,
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
    },
    server: {
      port: 1024,
      proxy: {
        '/bing': {
          target: 'https://cn.bing.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bing/, '')
        },
        '/baidu': {
          target: 'https://www.baidu.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/bing/, '')
        }
      }
    }
  }
})
