import LanguagePlugin from '@intlify/unplugin-vue-i18n/vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import { findUpSync } from 'find-up'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import Compression from 'vite-plugin-compression'
import DevTools from 'vite-plugin-vue-devtools'
// import wasm from 'vite-plugin-wasm'

// 查找 turbo.json 或 pnpm-workspace.yaml 等 monorepo 根目录特有的文件
const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

const entries: readonly RegExp[] = [
	/src[\\/]libs[\\/]service-worker/,
	/src[\\/]libs[\\/]content-scripts/
]

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

// Vue3 + TypeScript 项目分包配置
const chunkMap: Readonly<Record<string, RegExp[]>> = {
	// ========== 本地依赖 ==========
	'workspace-deps': [/[\\/]packages[\\/](core|wasm)[\\/]/],

	'core-apis': [/[\\/]src[\\/]apis[\\/]/],
	'core-utils': [/[\\/]src[\\/]utils[\\/]/],
	'core-hooks': [/[\\/]src[\\/]hooks[\\/]/],
	'core-stores': [/[\\/]src[\\/]stores[\\/]/],
	'core-assets': [/[\\/]src[\\/]assets[\\/]/],
	'core-locales': [/[\\/]src[\\/]locales[\\/]/],
	'core-plugins': [/[\\/]src[\\/]plugins[\\/]/],
	'core-database': [/[\\/]src[\\/]database[\\/]/],

	// ========== Vue 核心生态 ==========
	'core-framework': [/[\\/]node_modules[\\/](vue|vue-router|pinia|@vue)[\\/]/],

	'utils-framework': [/[\\/]node_modules[\\/](@vueuse)[\\/]/],

	// ========== UI 组件库 ==========
	'ui-antd': [/[\\/]node_modules[\\/](ant-design-vue)[\\/]/],

	'ui-antd-deps': [
		/[\\/]node_modules[\\/](@ant-design|@ctrl\/tinycolor|@emotion|stylis)[\\/]/,
		/[\\/]node_modules[\\/](@simonwep\/pickr|throttle-debounce|vue-types|warning)[\\/]/,
		/[\\/]node_modules[\\/](array-tree-filter|async-validator|dom-align|dom-scroll-into-view)[\\/]/,
		/[\\/]node_modules[\\/](resize-observer-polyfill|scroll-into-view-if-needed|shallow-equal)[\\/]/
	],

	// Iconify 相关：@iconify/iconify @iconify/vue @iconify/json 以及虚拟 ~icons
	'ui-markers': [/[\\/]node_modules[\\/]@iconify[\\/](?:json|vue|iconify)[\\/]/, /~icons/],

	// ========== 编辑器 ==========
	'utils-markdown': [
		/[\\/]node_modules[\\/]@tiptap[\\/]/,
		/[\\/]node_modules[\\/]marked[\\/]/,
		/[\\/]node_modules[\\/]prosemirror-/,
		/[\\/]node_modules[\\/]dompurify[\\/]/,
		/[\\/]node_modules[\\/]@floating-ui[\\/]/
	],

	'utils-code': [/[\\/]node_modules[\\/](monaco-editor|highlight\.js|lowlight)[\\/]/],

	'utils-languages': [/[\\/]node_modules[\\/](vue-i18n|@intlify)[\\/]/],

	// ========== 媒体处理 ==========
	'utils-media': [
		/[\\/]node_modules[\\/](mp4box)[\\/]/,
		/[\\/]node_modules[\\/](@ffmpeg)[\\/]/,
		/[\\/]node_modules[\\/](ffmpeg-core\.(js|wasm|worker\.js))$/
	],

	// ========== 工具库 ==========
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

	// ========== 网络与存储 ==========
	'utils-network': [
		/[\\/]node_modules[\\/](@ngify)[\\/]/,
		/[\\/]node_modules[\\/](axios|follow-redirects|form-data|proxy-from-env)[\\/]/
	],

	'utils-storage': [/[\\/]node_modules[\\/](dexie)[\\/]/],

	'utils-validation': [/[\\/]node_modules[\\/](zod)[\\/]/],

	// ========== UI 增强 ==========
	'ui-animation': [/[\\/]node_modules[\\/](gsap|swiper)[\\/]/],

	'ui-interaction': [/[\\/]node_modules[\\/](sortablejs)[\\/]/],

	// ========== polyfill ==========
	'utils-polyfill': [/[\\/]node_modules[\\/](@babel)[\\/]/],

	// ========== 其他第三方依赖 ==========
	'unknown-deps': [
		/[\\/]node_modules[\\/](rope-sequence|w3c-keyname)[\\/]/,
		/[\\/]node_modules[\\/](linkifyjs|devlop|orderedmap)[\\/]/,
		/[\\/]node_modules[\\/](compute-scroll-into-view|tslib)[\\/]/,
		/[\\/]node_modules[\\/](perfect-debounce|hookable|birpc)[\\/]/
	]
}

const chunkEntries = Object.entries(chunkMap)

export default defineConfig(function ({ mode, command: _command }: ConfigEnv): UserConfig {
	const env = loadEnv(mode || 'development', '')

	return {
		plugins: [
			Vue(),
			// wasm(),
			VueJsx(),
			DevTools(),
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
						resolve(rootDir, 'packages/shared/src/assets/icons'),
						function (svg) {
							return svg.replace(/^<svg /, '<svg fill="currentColor" ')
						}
					)
				}
			}),
			Compression({
				verbose: true,
				disable: false,
				filter: /\.(js|mjs|json|css|less|scss|html)$/i,
				threshold: 10240,
				deleteOriginFile: false, // 压缩完之后删除原文件
				algorithm: 'gzip',
				ext: '.gz'
			}),
			AutoImport({
				dts: 'src/types/auto-imports.d.ts',
				include: [/\.[tj]sx?$/, /\.vue$/],
				imports: ['vue', 'vue-router', 'pinia']
			}),
			Components({
				dts: 'src/types/components.d.ts',
				resolvers: [
					AntDesignVueResolver({
						importStyle: false
					}),
					IconsResolver({
						prefix: 'i',
						customCollections: ['local']
					})
				]
			}),
			LanguagePlugin({
				include: resolve(fileURLToPath(import.meta.url), './src/locales')
			})
		],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url))
			}
		},
		optimizeDeps: {
			include: ['vue', 'vue-router', 'pinia'],
			exclude: [
				'@i-thinking/wasm',
				'@ffmpeg/ffmpeg',
				'@ffmpeg/util',
				'ffmpeg-core.js',
				'ffmpeg-core.wasm',
				'ffmpeg-core.worker.js'
			]
		},
		build: {
			target: 'esnext',
			cssTarget: 'chrome128',
			minify: 'terser',
			cssMinify: 'esbuild',
			cssCodeSplit: true,
			emptyOutDir: true,
			sourcemap: mode === 'development' ? true : false,
			// 将产物输出到当前包目录的 dist，下游 Turbo outputs 可匹配到
			outDir: resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist'),
			assetsInlineLimit(filePath, _content) {
				const inlineRegexe = inlineRegexes.some((regex) => regex.test(filePath))

				// 检查是否匹配内联规则
				// return content.length < 10 * 1024 // 小于10kb则内联
				if (inlineRegexe) return true

				const noInlineRegexe = noInlineRegexes.some((regex) => regex.test(filePath))

				// 检查是否匹配不内联规则 不内联
				if (noInlineRegexe) return false

				// 默认情况下，不内联
				return false
			},
			rollupOptions: {
				input: {
					index: 'index.html',
					'service-worker': 'src/libs/service-worker.ts',
					'content-scripts': 'src/libs/content-scripts.ts'
				},
				output: {
					// entryFileNames: 'javascript/[name]-[hash].js',
					entryFileNames(chunk) {
						const pattern = entries.some((entry) => entry.test(chunk.facadeModuleId ?? ''))
						if (pattern) console.log('chunk.name ===>', chunk.name)
						if (pattern) return `${chunk.name}-[hash].js`
						return 'javascript/[name]-[hash].js'
					},
					chunkFileNames: 'javascript/[name]-[hash].js',
					// assetFileNames: 'assets/[name]-[hash].[ext]',
					assetFileNames(chunk) {
						if (!chunk.names) return 'assets/[name].[ext]'

						for (const name of chunk.names) {
							if (cssRegex.test(name)) return `css/${name}`
							if (imageRegex.test(name)) return `images/${name}`
							if (fontRegex.test(name)) return `fonts/${name}`
							if (videoRegex.test(name)) return `videos/${name}`
							if (audioRegex.test(name)) return `audios/${name}`
							if (wasmRegex.test(name)) return `webAssembly/${name}`
						}

						return 'assets/[name].[ext]'
					},
					manualChunks(id, _meta) {
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
					// api: 'modern-compiler',
					// importer: '',
					// importers:"",
					// functions: false,
					// additionalData: '@import "@/styles/variables.scss";',
					additionalData: `
														@use "@/styles/variables.scss";
														@use "@/styles/application.scss";
													`
				}
			}
		},
		server: {
			port: 1024,
			headers: {
				'Cross-Origin-Opener-Policy': 'same-origin',
				'Cross-Origin-Embedder-Policy': 'require-corp'
			},
			https: {
				key: readFileSync('key.pem'),
				cert: readFileSync('cert.pem')
			},
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
				},
				'/go': {
					target: 'http://172.16.1.231:9001',
					// target: 'http://172.16.0.8:9001',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/go/, '/go')
				}
			}
		}
	}
})
