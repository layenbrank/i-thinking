import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'

import React from '@vitejs/plugin-react-swc'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'

import { chunks } from './vite.chunk'

const cssRegex: Readonly<RegExp> = /\.css$/i
const imageRegex: Readonly<RegExp> = /\.(png|jpe?g|gif|svg|webp|ico)$/i
const fontRegex: Readonly<RegExp> = /\.(woff2?|ttf|eot|otf)$/i
const videoRegex: Readonly<RegExp> = /\.(mp4|webm|ogg)$/i
const audioRegex: Readonly<RegExp> = /\.(mp3|wav|ogg)$/i
const wasmRegex: Readonly<RegExp> = /\.wasm$/i
const jsonRegex: Readonly<RegExp> = /\.json$/i
const svgRegex: Readonly<RegExp> = /\.svg$/i
const gifRegex: Readonly<RegExp> = /\.gif$/i
const workerRegex: Readonly<RegExp> = /\.worker\.js$/i

const inlineRegexes: readonly RegExp[] = [gifRegex]

const noInlineRegexes: readonly RegExp[] = [
  /icon.*\.(png|jpe?g)$/i, // 图标文件
  /background.*\.(png|jpe?g)$/i // 背景图片
].concat(svgRegex, jsonRegex, videoRegex, audioRegex, fontRegex)

export default defineConfig(function ({ mode }: ConfigEnv): UserConfig {
  const env = loadEnv(mode || 'development', '')
  // Forge 注入 MAIN_WINDOW_VITE_DEV_SERVER_URL 为 localhost，须与 server.host 一致；
  // 勿绑到 WLAN 网卡 IP，否则 Electron 访问 localhost 会 ERR_CONNECTION_REFUSED。
  const PORT = 9523
  const HOST = '127.0.0.1'

  console.log('env ===>', env)
  console.log('dev server ===>', `http://${HOST}:${PORT}`)

  return {
    envDir: resolve(fileURLToPath(new URL('.', import.meta.url))),
    plugins: [
      React({
        devTarget: 'esnext',
        jsxImportSource: 'react',
        tsDecorators: true,
        plugins: []
      }),
      AutoImport({
        dts: 'src/renderer/types/auto-imports.d.ts',
        include: [/\.(?:ts|tsx|js|jsx)$/i],
        imports: [
          'react',
          'react-router-dom',
          {
            react: [['default', 'React']]
          }
        ]
      }),
      compression({
        include: /\.(js|mjs|json|css|less|scss|html)$/i,
        threshold: 10240,
        deleteOriginalAssets: false,
        algorithms: ['gzip'],
        logLevel: 'info'
      })
    ],
    resolve: {
      tsconfigPaths: true,
      alias: {
        '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@': fileURLToPath(new URL('./src/renderer', import.meta.url))
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['node_modules']
    },
    build: {
      target: 'esnext',
      emptyOutDir: true,
      minify: 'terser',
      cssCodeSplit: true,
      cssMinify: 'lightningcss',
      sourcemap: mode === 'development' ? true : false,
      // outDir 由 @electron-forge/plugin-vite 设为 .vite/renderer/<name>，勿覆盖为 dist（否则不会打进 asar）
      assetsInlineLimit(filePath) {
        const isInline = inlineRegexes.some((regex) => regex.test(filePath))
        // return content.length < 10 * 1024 // 小于10kb则内联
        if (isInline) return true

        const isNoInline = noInlineRegexes.some((regex) => regex.test(filePath))
        if (isNoInline) return false

        // 默认情况下，不内联
        return false
      },
      rolldownOptions: {
        output: {
          entryFileNames: 'javascript/[name]-[hash].js',
          chunkFileNames: 'javascript/[name]-[hash].js',
          assetFileNames(chunk) {
            if (!chunk.names) return 'assets/[name]-[hash].[ext]'

            for (const name of chunk.names) {
              if (cssRegex.test(name)) return `css/[name]-[hash][extname]`
              if (imageRegex.test(name)) return `images/[name]-[hash][extname]`
              if (fontRegex.test(name)) return `fonts/[name]-[hash][extname]`
              if (videoRegex.test(name)) return `videos/[name]-[hash][extname]`
              if (audioRegex.test(name)) return `audios/[name]-[hash][extname]`
              if (wasmRegex.test(name)) return `wasm/[name]-[hash][extname]`
              if (workerRegex.test(name)) return `workers/[name]-[hash][extname]`
            }

            return 'assets/[name]-[hash][extname]'
          },
          codeSplitting: {
            groups: chunks
          }
        }
      }
    },
    envPrefix: ['VITE_'],
    css: {
      modules: {
        generateScopedName(name, filename) {
          const fileBaseName = basename(filename).replace(/\.module\.(scss|css|sass|less)$/i, '')
          const scope = basename(dirname(filename))
          const hash = createHash('sha256')
            .update(`${filename}\0${name}`)
            .digest('base64url')
            .slice(0, 6)
          return `${scope}-${fileBaseName}-${name}-${hash}`
        },
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        hashPrefix: 'prefix'
      },
      preprocessorOptions: {
        scss: {
          additionalData: `
                          @use "@/styles/mixins.scss" as *;
                          `
        }
      }
    },
    clearScreen: false,
    server: {
      port: PORT,
      strictPort: true,
      host: HOST,
      watch: {
        ignored: ['**/dist-electron/**']
      }
    }
  }
})
