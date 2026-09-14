import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { findUpSync } from 'find-up'
import { dirname, resolve } from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// 查找 turbo.json 或 pnpm-workspace.yaml 等 monorepo 根目录特有的文件
const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
  const env = loadEnv(mode || 'development', '')

  return {
    plugins: [
      tailwindcss(),
      vue(),
      vueJsx(),
      vueDevTools(),
      AutoImport({
        resolvers: [NaiveUiResolver()],
        dts: 'src/types/auto-imports.d.ts',
        imports: [
          'vue',
          'vue-router',
          {
            'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
          }
        ]
      }),
      Components({
        resolvers: [NaiveUiResolver()],
        dts: 'src/types/components.d.ts'
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      // 输出到包内 dist，便于 Turbo outputs 匹配
      outDir: resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist'),
      emptyOutDir: true,
      // Vite 8 = Rolldown：`manualChunks` 对象/函数写法已不被接受，改用 codeSplitting.groups
      rolldownOptions: {
        output: {
          entryFileNames: '[name].js',
          codeSplitting: {
            groups: [
              {
                name: 'vue',
                test: /[\\/]node_modules[\\/](vue|vue-router|pinia|@vue)[\\/]/
              }
            ]
          }
        }
      }
    },
    css: {
      modules: {
        // 生成的类名格式
        generateScopedName: '[name]__[local]__[hash:base64:5]',
        // 是否驼峰化 CSS 类名
        localsConvention: 'camelCase',
        // 哪些文件需要使用 CSS Modules（默认：/\.module\./）
        scopeBehaviour: 'local',
        // 自定义哈希函数
        hashPrefix: 'prefix'
      },
      preprocessorOptions: {
        scss: {
          // api: 'modern-compiler'
          // additionalData: '@import "@/styles/variables.scss";',
        }
      }
    },
    server: {
      port: 1024
    }
  }
})
