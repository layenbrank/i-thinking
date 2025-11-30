import React from '@vitejs/plugin-react'
import { findUpSync } from 'find-up'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import Compression from 'vite-plugin-compression'
import pkg from './package.json'

const host = process.env.TAURI_DEV_HOST

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

// 使用正则数组表示需要内联的文件类型
const inlineRegexes: readonly RegExp[] = [gifRegex]

// 使用正则数组表示不需要内联的文件类型
const noInlineRegexes: readonly RegExp[] = [
	/icon.*\.(png|jpe?g)$/i, // 图标文件
	/background.*\.(png|jpe?g)$/i // 背景图片
].concat(svgRegex, jsonRegex, videoRegex, audioRegex, fontRegex)

const chunkMap: Readonly<Record<string, RegExp[]>> = {
	'workspace-deps': [/[\\/]packages[\\/](core|wasm)[\\/]/],

	'core-apis': [/[\\/]src[\\/]apis[\\/]/],
	'core-utils': [/[\\/]src[\\/]utils[\\/]/],
	'core-hooks': [/[\\/]src[\\/]hooks[\\/]/],
	'core-stores': [/[\\/]src[\\/]stores[\\/]/],
	'core-assets': [/[\\/]src[\\/]assets[\\/]/],
	'core-locales': [/[\\/]src[\\/]locales[\\/]/],
	'core-plugins': [/[\\/]src[\\/]plugins[\\/]/],
	'core-database': [/[\\/]src[\\/]database[\\/]/],

	'core-framework': [/[\\/]node_modules[\\/](react|react-dom|use-sync-external-store)[\\/]/],

	'ui-antd': [/[\\/]node_modules[\\/]antd[\\/]/],

	'ui-icons': [/[\\/]node_modules[\\/]@iconify[\\/](?:json|iconify)[\\/]/, /~icons/],

	'ui-animation': [/[\\/]node_modules[\\/](gsap|swiper)[\\/]/],

	'utils-media': [
		/[\\/]node_modules[\\/](mp4box)[\\/]/,
		/[\\/]node_modules[\\/](@ffmpeg)[\\/]/,
		/[\\/]node_modules[\\/]ffmpeg-core\.(js|wasm|worker\.js)$/
	],

	'utils-core': [
		/[\\/]node_modules[\\/](lodash-es|rxjs|uuid|clsx)[\\/]/,
		/[\\/]node_modules[\\/](reflect-metadata)[\\/]/
	],

	'utils-datetime': [/[\\/]node_modules[\\/](dayjs|lunisolar|tyme4ts)[\\/]/],

	'utils-crypto': [/[\\/]node_modules[\\/](crypto-js)[\\/]/],

	'utils-matches': [/[\\/]node_modules[\\/](fuse\.js)[\\/]/],

	'utils-math': [
		/[\\/]node_modules[\\/](mathjs)[\\/]/,
		/[\\/]node_modules[\\/](mathjs|complex\.js|decimal\.js|escape-latex|fraction\.js)[\\/]/,
		/[\\/]node_modules[\\/](javascript-natural-sort|seedrandom|tiny-emitter|typed-function)[\\/]/
	],

	'utils-enhance': [/[\\/]node_modules[\\/](qrcode|d3)[\\/]/, /[\\/]node_modules[\\/]d3-/],

	'utils-network': [
		/[\\/]node_modules[\\/](@ngify)[\\/]/,
		/[\\/]node_modules[\\/](axios|follow-redirects|form-data|proxy-from-env)[\\/]/
	],

	'utils-storage': [/[\\/]node_modules[\\/](dexie)[\\/]/],
	// 'utils-storage': [
	// 	/[\\/]node_modules[\\/](redux|react-redux|@reduxjs\/toolkit|redux-thunk)[\\/]/,
	// 	/[\\/]node_modules[\\/](immer|@standard-schema\/spec|@standard-schema\/utils|reselect)[\\/]/
	// ],

	'utils-validation': [/[\\/]node_modules[\\/](zod)[\\/]/],

	'utils-polyfill': [/[\\/]node_modules[\\/](@babel)[\\/]/],

	scheduler: [/[\\/]node_modules[\\/]scheduler[\\/]/],

	router: [
		/[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/,
		/[\\/]node_modules[\\/]react-router[\\/]/,
		/[\\/]node_modules[\\/]react-router-dom[\\/]/
	],

	'unknown-deps': [
		/[\\/]node_modules[\\/](rope-sequence|w3c-keyname)[\\/]/,
		/[\\/]node_modules[\\/](linkifyjs|devlop|orderedmap)[\\/]/,
		/[\\/]node_modules[\\/](compute-scroll-into-view|tslib)[\\/]/,
		/[\\/]node_modules[\\/](perfect-debounce|hookable|birpc)[\\/]/
	]
}

const chunkEntries = Object.entries(chunkMap)

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
	const env = loadEnv(mode || 'development', '')

	return {
		plugins: [
			React({
				babel: {
					plugins: [['babel-plugin-react-compiler']]
				}
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
				customCollections: {
					// 'local' 是自定义集合名称，可以改为任何你喜欢的名称

					local: FileSystemIconLoader(
						resolve(rootDir, 'packages/shared/src/assets/icons'),
						function (svg) {
							return svg.replace(/^<svg /, '<svg fill="currentColor" ')
						}
					)
				}
			}),
			AutoImport({
				dts: 'src/types/auto-imports.d.ts',
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
				'@': fileURLToPath(new URL('./src', import.meta.url))
			}
		},
		optimizeDeps: {
			include: ['react', 'react-dom', 'react-router-dom']
		},
		build: {
			target: 'esnext',
			cssTarget: 'chrome128',
			emptyOutDir: true,
			minify: 'esbuild',
			cssMinify: 'esbuild',
			sourcemap: mode === 'development' ? true : false,
			outDir: resolve(rootDir, `dist/${pkg.name.replace(/^@i-thinking\//, '')}`),
			assetsInlineLimit(filePath) {
				const isInline = inlineRegexes.some((regex) => regex.test(filePath))
				// return content.length < 10 * 1024 // 小于10kb则内联
				if (isInline) return true

				const isNoInline = noInlineRegexes.some((regex) => regex.test(filePath))
				if (isNoInline) return false

				// 默认情况下，不内联
				return false
			},
			rollupOptions: {
				output: {
					entryFileNames: 'assets/[name]-[hash].js',
					chunkFileNames: 'assets/[name]-[hash].js',
					assetFileNames(chunkInfo) {
						for (const name of chunkInfo.names) {
							if (cssRegex.test(name)) return `css/${name}`
							if (imageRegex.test(name)) return `images/${name}`
							if (fontRegex.test(name)) return `fonts/${name}`
							if (videoRegex.test(name)) return `videos/${name}`
							if (audioRegex.test(name)) return `audios/${name}`
							if (wasmRegex.test(name)) return `wasm/${name}`
						}

						return 'assets/[name].[ext]'
					},
					manualChunks(id) {
						// 遍历映射表，匹配当前模块路径
						for (const [chunkName, patterns] of chunkEntries) {
							const pattern = patterns.some((pattern) => pattern.test(id))
							if (pattern) return chunkName
						}

						// 其他第三方依赖
						if (/[\\/]node_modules[\\/]/.test(id)) return 'vendors'
					}
				}
			}
		},
		css: {
			modules: {
				generateScopedName: '[name]-[local]-[hash:base64:6]',
				localsConvention: 'camelCase',
				scopeBehaviour: 'local',
				hashPrefix: 'prefix'
			},
			preprocessorOptions: {
				scss: {
					// additionalData: '@import "@/styles/variables.scss";',
				}
			}
		},

		// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
		//
		// 1. prevent Vite from obscuring rust errors
		clearScreen: false,
		// 2. tauri expects a fixed port, fail if that port is not available
		server: {
			port: 1420,
			strictPort: true,
			host: host || false,
			hmr: host
				? {
						protocol: 'ws',
						host,
						port: 1421
					}
				: undefined,
			watch: {
				// 3. tell Vite to ignore watching `src-tauri`
				ignored: ['**/src-tauri/**']
			}
		}
	}
})
