import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { createHash } from 'node:crypto'

import React from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import { compression } from 'vite-plugin-compression2'

import { chunks } from './vite.chunk.mts'

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
      tailwindcss(),
      React({
        devTarget: 'esnext',
        jsxImportSource: 'react',
        tsDecorators: true,
        plugins: []
      }),
      AutoImport({
        dts: 'src/types/auto-imports.d.ts',
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
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        /**
         * dev 模式下 Vite 用 `react/jsx-dev-runtime`，但**已发布的三方产物是生产 JSX 转换**，
         * 它们 import 的是 `react/jsx-runtime`（CJS）。只要这条链上有一个文件没被预构建，
         * 浏览器就会拿到裸 CJS 并报 `does not provide an export named 'jsx'`（整条路由挂掉，
         * 例如 /chat 依赖的 assistant-ui / ai 链路）。显式纳入预构建即可拿到带互操作的副本。
         */
        'react/jsx-runtime',
        /**
         * 懒加载路由（`/chat` 经 React.lazy）的依赖不在启动扫描里，首次进入才会被发现；
         * 在优化器补跑完成前，这些包是**裸文件**下发的，其中 CJS 的会直接抛
         * `does not provide an export named 'default'`。它们是非 ESM 产物，必须显式登记：
         * `classnames` 与 `secure-json-parse` 是 assistant-ui / ai 链路实际发出的两个 CJS。
         * （判据：加载 /chat 后统计所有非预构建的裸 node_modules 请求，逐个验 CJS 特征。）
         */
        'classnames',
        'secure-json-parse',
        // markdown 渲染链路：`hast-util-to-jsx-runtime`(ESM) 直接 import CJS 的 `style-to-js`，
        // 只要它自己没被预构建，浏览器就会拿到 `style-to-js/cjs/index.js` 的裸文件 →
        // `does not provide an export named 'default'`。把引用方一起登记，让 esbuild 连它的
        // CJS 依赖一块打包并补上 default 互操作。
        'hast-util-to-jsx-runtime',
        'style-to-js'
      ],
      /**
       * 被 exclude 的包不再参与启动扫描，它们的第三方依赖要靠这里补回来：
       * 指向源码 glob，让优化器在启动时就顺着包内 import 把依赖收全，
       * 避免进入懒加载路由时才触发 re-optimize + 整页 reload（以及中间那段裸 CJS 窗口）。
       */
      entries: [
        'index.html',
        '../../packages/design/src/**/*.{ts,tsx}',
        '../../packages/chat/src/**/*.{ts,tsx}'
      ],
      exclude: ['@i-thinking/design', '@i-thinking/chat']
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
