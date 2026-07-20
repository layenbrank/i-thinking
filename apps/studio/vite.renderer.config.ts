import { createWriteStream } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import React from '@vitejs/plugin-react-swc'
import { findUpSync } from 'find-up'
import AutoImport from 'unplugin-auto-import/vite'
import Compression from 'vite-plugin-compression'
import Icons from 'unplugin-icons/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'

import { chunks } from './vite.chunk'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ws = createWriteStream(resolve(__dirname, 'chunks.log'), {
  flush: true,
  autoClose: true,
  encoding: 'utf-8'
})

const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

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

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
  const env = loadEnv(mode || 'development', '')
  const interfaces = networkInterfaces()
  const LOOPBACK = '0.0.0.0'
  let IP = 'localhost'
  const PORT = 9523

  for (const inter of Object.keys(interfaces)) {
    const collection = interfaces[inter]
    if (!collection) continue
    for (const single of collection) {
      if (inter !== 'WLAN') continue
      if (single.family !== 'IPv4') continue
      if (single.internal) continue
      IP = single.address
    }
  }

  console.log('env ===>', env)
  console.log('IP ===>', `http://${IP}:${PORT}`)

  return {
    envDir: resolve(fileURLToPath(new URL('.', import.meta.url))),
    plugins: [
      React({
        devTarget: 'esnext',
        jsxImportSource: 'react',
        tsDecorators: true,
        plugins: []
      }),
      Icons({
        compiler: 'jsx',
        autoInstall: true,
        scale: 1,
        defaultStyle: '',
        defaultClass: '',
        jsx: 'react',
        iconCustomizer(collection, icon, props) {
          props['aria-hidden'] = 'true'
        },
        collectionsNodeResolvePath: [
          '@iconify/icons-*',
          '@iconify-json/*',
          'packages/shared/src/assets/iconify.json'
        ],
        customCollections: {
          // 'local' 是自定义集合名称，可以改为任何你喜欢的名称
          // custom: FileSystemIconLoader(resolve(rootDir, 'packages/shared/src/assets/iconify.json'))
          // local: FileSystemIconLoader(
          // 	resolve(rootDir, 'packages/shared/src/assets/icons'),
          // 	function (svg) {
          // 		return svg.replace(/^<svg /, '<svg fill="currentColor" ')
          // 	}
          // )
        }
      }),
      AutoImport({
        dts: 'src/renderer/types/auto-imports.d.ts',
        include: [/\.(?:ts|tsx|js|jsx)$/i],
        imports: ['react', 'react-router-dom']
      }),
      Compression({
        verbose: true,
        disable: false,
        filter: /\.(js|mjs|json|css|less|scss|html)$/i,
        threshold: 10240,
        deleteOriginFile: false, // 压缩完之后删除原文件
        algorithm: 'gzip',
        ext: '.gz'
      })
    ],
    resolve: {
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
    css: {
      // modules: {
      //   localsConvention: 'camelCase',
      //   scopeBehaviour: 'local',
      //   hashPrefix: 'prefix'
      // },
      modules: {
        generateScopedName(name, filename, css) {
          const fileBaseName = basename(filename, '.module.scss')
          const hash = Buffer.from(css).toString('base64').slice(0, 6)
          const scoped = `${fileBaseName}-${name}-${hash}`

          return scoped
        },
        localsConvention: 'camelCase',
        scopeBehaviour: 'local',
        hashPrefix: 'prefix'
      },
      preprocessorOptions: {
        scss: {
          additionalData: `
                          @use "@/styles/placeholder.scss" as *;
                          `
        }
      }
    },
    clearScreen: false,
    server: {
      port: PORT,
      strictPort: false,
      host: LOOPBACK || false,
      watch: {
        ignored: ['**/dist-electron/**']
      }
    }
  }
})
