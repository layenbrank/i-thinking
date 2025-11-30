// import React from '@vitejs/plugin-react'
// import { findUpSync } from 'find-up'
// import { dirname, resolve } from 'node:path'
// import { fileURLToPath, URL } from 'node:url'
// import { type ConfigEnv, defineConfig, loadEnv, type UserConfig } from 'rolldown-vite'
// import AutoImport from 'unplugin-auto-import/vite'
// import { FileSystemIconLoader } from 'unplugin-icons/loaders'
// import IconsResolver from 'unplugin-icons/resolver'
// import Icons from 'unplugin-icons/vite'
// import Compression from 'vite-plugin-compression'
// import pkg from './package.json' with { type: 'json' }

// const host = process.env.TAURI_DEV_HOST

// const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
// const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

// const cssRegex: Readonly<RegExp> = /\.css$/i
// const imageRegex: Readonly<RegExp> = /\.(png|jpe?g|gif|svg|webp|ico)$/i
// const fontRegex: Readonly<RegExp> = /\.(woff2?|ttf|eot|otf)$/i
// const videoRegex: Readonly<RegExp> = /\.(mp4|webm|ogg)$/i
// const audioRegex: Readonly<RegExp> = /\.(mp3|wav|ogg)$/i
// const wasmRegex: Readonly<RegExp> = /\.wasm$/i
// const jsonRegex: Readonly<RegExp> = /\.json$/i
// const svgRegex: Readonly<RegExp> = /\.svg$/i
// const gifRegex: Readonly<RegExp> = /\.gif$/i

// // 使用正则数组表示需要内联的文件类型
// const inlineRegexes: readonly RegExp[] = [gifRegex]

// // 使用正则数组表示不需要内联的文件类型
// const noInlineRegexes: readonly RegExp[] = [
// 	/icon.*\.(png|jpe?g)$/i, // 图标文件
// 	/background.*\.(png|jpe?g)$/i // 背景图片
// ].concat(svgRegex, jsonRegex, videoRegex, audioRegex, fontRegex)

// export default defineConfig(function ({ mode }: ConfigEnv): UserConfig {
// 	const env = loadEnv(mode || 'development', '')

// 	console.log('env ===>', env)

// 	return {
// 		plugins: [
// 			React({
// 				babel: {
// 					plugins: [['babel-plugin-react-compiler']]
// 				}
// 			}),
// 			Icons({
// 				compiler: 'jsx',
// 				autoInstall: true,
// 				scale: 1,
// 				defaultStyle: '',
// 				defaultClass: '',
// 				jsx: 'react',
// 				iconCustomizer(collection, icon, props) {
// 					props['aria-hidden'] = 'true'
// 				},
// 				customCollections: {
// 					local: FileSystemIconLoader(
// 						resolve(rootDir, 'packages/shared/src/assets/icons'),
// 						function (svg) {
// 							return svg.replace(/^<svg /, '<svg fill="currentColor" ')
// 						}
// 					)
// 				}
// 			}),
// 			AutoImport({
// 				include: [/\.(?:ts|tsx|js|jsx)$/i],
// 				imports: ['react', 'react-router-dom'],
// 				dts: 'src/types/auto-imports.d.ts'
// 			}),
// 			Compression({
// 				verbose: true,
// 				disable: false,
// 				filter: /\.(js|mjs|json|css|less|scss|html)$/i,
// 				threshold: 10240,
// 				deleteOriginFile: false, // 压缩完之后删除原文件
// 				algorithm: 'gzip',
// 				ext: '.gz'
// 			})
// 		],
// 		resolve: {
// 			alias: {
// 				'@': fileURLToPath(new URL('./src', import.meta.url))
// 			}
// 		},
// 		optimizeDeps: {
// 			include: ['react', 'react-dom', 'react-router-dom'],
// 			exclude: [
// 				'@i-thinking/wasm',
// 				'@ffmpeg/ffmpeg',
// 				'@ffmpeg/util',
// 				'ffmpeg-core.js',
// 				'ffmpeg-core.wasm',
// 				'ffmpeg-core.worker.js'
// 			],

// 			rollupOptions: {}
// 		},
// 		build: {
// 			target: 'esnext',
// 			cssTarget: 'chrome128',
// 			minify: 'oxc',
// 			cssCodeSplit: true,
// 			cssMinify: 'esbuild',
// 			emptyOutDir: true,
// 			sourcemap: mode === 'development' ? true : false,
// 			outDir: resolve(rootDir, `dist/${pkg.name.replace(/^@i-thinking\//, '')}`),
// 			assetsInlineLimit(filePath, content) {
// 				const isInline = inlineRegexes.some((regex) => regex.test(filePath))
// 				// return content.length < 10 * 1024 // 小于10kb则内联
// 				if (isInline) return true

// 				const isNoInline = noInlineRegexes.some((regex) => regex.test(filePath))
// 				if (isNoInline) return false

// 				// 默认情况下，不内联
// 				return false
// 			},
// 			rolldownOptions: {
// 				input: {
// 					index: 'index.html'
// 				},
// 				output: {
// 					entryFileNames: 'js/[name]-[hash].js',
// 					chunkFileNames: 'js/[name]-[hash].js',
// 					assetFileNames(chunkInfo) {
// 						if (!chunkInfo.names) return 'assets/[name].[ext]'

// 						for (const name of chunkInfo.names) {
// 							if (cssRegex.test(name)) return `css/${name}`
// 							if (imageRegex.test(name)) return `images/${name}`
// 							if (fontRegex.test(name)) return `fonts/${name}`
// 							if (videoRegex.test(name)) return `videos/${name}`
// 							if (audioRegex.test(name)) return `audios/${name}`
// 							if (wasmRegex.test(name)) return `wasm/${name}`
// 						}

// 						return 'assets/[name].[ext]'
// 					},
// 					advancedChunks: {
// 						groups: [
// 							{
// 								name: 'workspace-deps',
// 								test(id) {
// 									const patterns = [/[\\/]packages[\\/](core|wasm)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-apis',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]apis[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-utils',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]utils[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-hooks',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]hooks[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-stores',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]stores[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-assets',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]assets[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-locales',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]locales[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-plugins',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]plugins[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-database',
// 								test(id) {
// 									const patterns = [/[\\/]src[\\/]database[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'core-framework',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](react|react-dom|use-sync-external-store)[\\/]/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'ui-antd',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/]antd[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'ui-antd-deps',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](@ant-design|@ctrl\/tinycolor|@emotion|stylis)[\\/]/,
// 										/[\\/]node_modules[\\/](@simonwep\/pickr|throttle-debounce|vue-types|warning)[\\/]/,
// 										/[\\/]node_modules[\\/](array-tree-filter|async-validator|dom-align|dom-scroll-into-view)[\\/]/,
// 										/[\\/]node_modules[\\/](resize-observer-polyfill|scroll-into-view-if-needed|shallow-equal)[\\/]/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'ui-icons',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](@iconify\/json)[\\/]/, /~icons/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-media',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](mp4box)[\\/]/,
// 										/[\\/]node_modules[\\/](@ffmpeg)[\\/]/,
// 										/[\\/]node_modules[\\/]ffmpeg-core\.(js|wasm|worker\.js)$/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-core',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](lodash-es|rxjs|uuid|clsx)[\\/]/,
// 										/[\\/]node_modules[\\/](reflect-metadata)[\\/]/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-datetime',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](dayjs|lunisolar|tyme4ts)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-crypto',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](crypto-js)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-matches',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](fuse\.js)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-math',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](mathjs)[\\/]/,
// 										/[\\/]node_modules[\\/](mathjs|complex\.js|decimal\.js|escape-latex|fraction\.js)[\\/]/,
// 										/[\\/]node_modules[\\/](javascript-natural-sort|seedrandom|tiny-emitter|typed-function)[\\/]/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-enhance',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](qrcode|d3)[\\/]/,
// 										/[\\/]node_modules[\\/]d3-/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-network',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](@ngify)[\\/]/,
// 										/[\\/]node_modules[\\/](axios|follow-redirects|form-data|proxy-from-env)[\\/]/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-storage',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](dexie)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-validation',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](zod)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'ui-animation',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](gsap|swiper)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'ui-interaction',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](sortablejs)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'utils-polyfill',
// 								test(id) {
// 									const patterns = [/[\\/]node_modules[\\/](@babel)[\\/]/]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							},
// 							{
// 								name: 'unknown-deps',
// 								test(id) {
// 									const patterns = [
// 										/[\\/]node_modules[\\/](rope-sequence|w3c-keyname)[\\/]/,
// 										/[\\/]node_modules[\\/](linkifyjs|devlop|orderedmap)[\\/]/,
// 										/[\\/]node_modules[\\/](compute-scroll-into-view|tslib)[\\/]/,
// 										/[\\/]node_modules[\\/](perfect-debounce|hookable|birpc)[\\/]/
// 									]
// 									return patterns.some((pattern) => pattern.test(id))
// 								}
// 							}
// 						]
// 					}
// 				}
// 			}
// 		},
// 		css: {
// 			modules: {
// 				// generateScopedName: '[name]-[local]-[hash:base64:6]',
// 				generateScopedName: '[local]-[hash:base64:6]',
// 				// generateScopedName: '[name]-[hash:base64:6]',
// 				localsConvention: 'camelCase',
// 				scopeBehaviour: 'local',
// 				hashPrefix: 'prefix'
// 			},
// 			preprocessorOptions: {
// 				scss: {
// 					// additionalData: '@import "@/styles/variables.scss";',
// 				}
// 			}
// 		},
// 		clearScreen: false,
// 		server: {
// 			port: 1420,
// 			strictPort: true,
// 			host: host || false,
// 			hmr: host
// 				? {
// 						protocol: 'ws',
// 						host,
// 						port: 1421
// 					}
// 				: undefined,
// 			watch: {
// 				ignored: ['**/src-tauri/**']
// 			},
// 			headers: {
// 				'Cross-Origin-Opener-Policy': 'same-origin',
// 				'Cross-Origin-Embedder-Policy': 'require-corp'
// 			},
// 			proxy: {
// 				'/api': {
// 					target: 'https://api.example.com',
// 					changeOrigin: true,
// 					rewrite: (path) => path.replace(/^\/api/, '')
// 				}
// 			}
// 		}
// 	}
// })
