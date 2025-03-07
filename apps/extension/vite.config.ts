import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { dirname, resolve } from 'node:path'
import { findUpSync } from 'find-up'
import pkg from './package.json'

// 查找 turbo.json 或 pnpm-workspace.yaml 等 monorepo 根目录特有的文件
const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

// https://vite.dev/config/
export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
  const env = loadEnv(mode || 'development', '')

  return {
    base: `/${pkg.name}/`,
    plugins: [
      vue(),
      vueJsx(),
      vueDevTools(),
      AutoImport({
        dts: 'src/types/auto-imports.d.ts',
        imports: ['vue', 'vue-router']
      }),
      Components({
        dts: 'src/types/components.d.ts'
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      // 方案1: 输出到根目录的 dist 文件夹下（需要修改 turbo.json）
      outDir: resolve(rootDir, `dist/${pkg.name}`),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue', 'vue-router', 'pinia']
          }
        }
      }
    },
    server: {
      port: 1024
    }
  }
})
