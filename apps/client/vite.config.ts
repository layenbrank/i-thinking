import React from '@vitejs/plugin-react'
import { findUpSync } from 'find-up'
import { createWriteStream } from 'node:fs'
import { dirname, resolve, basename } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import Icons from 'unplugin-icons/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import Compression from 'vite-plugin-compression'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ws = createWriteStream(resolve(__dirname, 'vite-manual-chunks.log'), {
	flush: true,
	autoClose: true,
	encoding: 'utf-8'
})

const host = process.env.TAURI_DEV_HOST

console.log('host ===>', host)

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

	'core-framework': [/[\\/]node_modules[\\/](react|react-dom)[\\/]/],

	'ui-antd': [
		/[\\/]node_modules[\\/]antd[\\/]/,
		/[\\/]node_modules[\\/]@rc-component[\\/]/,
		/[\\/]node_modules[\\/]@ant-design[\\/]/,
		/[\\/]node_modules[\\/]antd-style[\\/]/,
		/[\\/]node_modules[\\/]throttle-debounce[\\/]/,

		/[\\/]node_modules[\\/]@emotion[\\/]/,
		/[\\/]node_modules[\\/]react-is[\\/]/,
		/[\\/]node_modules[\\/]json2mq[\\/]/,
		/[\\/]node_modules[\\/]string-convert[\\/]/,
		/[\\/]node_modules[\\/]stylis[\\/]/,
		/[\\/]node_modules[\\/]is-mobile[\\/]/,

		/[\\/]node_modules[\\/]scroll-into-view-if-needed[\\/]/,
		/[\\/]node_modules[\\/]compute-scroll-into-view[\\/]/
	],

	'ui-marks': [/[\\/]node_modules[\\/]@iconify[\\/](?:json|iconify)[\\/]/, /~icons/],

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

	// ========== 编辑器 ==========
	'utils-markdown': [
		/[\\/]node_modules[\\/]rehype-/,
		/[\\/]node_modules[\\/]hast-util-raw[\\/]/,
		/[\\/]node_modules[\\/]hastscript[\\/]/,
		/[\\/]node_modules[\\/]@ungap\/structured-clone[\\/]/,
		/[\\/]node_modules[\\/]hast-util-from-parse5[\\/]/,
		/[\\/]node_modules[\\/]vfile-location[\\/]/,
		/[\\/]node_modules[\\/]hast-util-to-parse5[\\/]/,
		/[\\/]node_modules[\\/]html-void-elements[\\/]/,
		/[\\/]node_modules[\\/]parse5[\\/]/,
		/[\\/]node_modules[\\/]entities[\\/]/,
		/[\\/]node_modules[\\/]unist-util-position[\\/]/,
		/[\\/]node_modules[\\/]unist-util-visit[\\/]/,
		/[\\/]node_modules[\\/]unist-util-is[\\/]/,
		/[\\/]node_modules[\\/]unist-util-visit-parents[\\/]/,
		/[\\/]node_modules[\\/]web-namespaces[\\/]/,
		/[\\/]node_modules[\\/]zwitch[\\/]/,
		/[\\/]node_modules[\\/]vfile[\\/]/,
		/[\\/]node_modules[\\/]hast-util-to-text[\\/]/,
		/[\\/]node_modules[\\/]hast-util-is-element[\\/]/,
		/[\\/]node_modules[\\/]hast-util-parse-selector[\\/]/,
		/[\\/]node_modules[\\/]unist-util-find-after[\\/]/,

		/[\\/]node_modules[\\/]remark-/,
		/[\\/]node_modules[\\/]unified[\\/]/,
		/[\\/]node_modules[\\/]bail[\\/]/,
		/[\\/]node_modules[\\/]trough[\\/]/,
		/[\\/]node_modules[\\/]is-plain-obj[\\/]/,
		/[\\/]node_modules[\\/]extend[\\/]/,
		/[\\/]node_modules[\\/]ccount[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-gfm[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-gfm-autolink-literal[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-find-and-replace[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-phrasing[\\/]/,
		/[\\/]node_modules[\\/]escape-string-regexp[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-gfm-footnote[\\/]/,
		/[\\/]node_modules[\\/]micromark-core-commonmark[\\/]/,
		/[\\/]node_modules[\\/]micromark-factory-space[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-character[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-normalize-identifier[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-sanitize-uri[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-symbol[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-types[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-gfm-strikethrough[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-gfm-table[\\/]/,
		/[\\/]node_modules[\\/]markdown-table[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-gfm-task-list-item[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-from-markdown[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-to-markdown[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-to-string[\\/]/,
		/[\\/]node_modules[\\/]longest-streak[\\/]/,
		/[\\/]node_modules[\\/]decode-named-character-reference[\\/]/,
		/[\\/]node_modules[\\/]micromark[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-decode-numeric-character-reference[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-decode-string[\\/]/,
		/[\\/]node_modules[\\/]unist-util-stringify-position[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-combine-extensions[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm-autolink-literal[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm-footnote[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm-strikethrough[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm-table[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm-tagfilter[\\/]/,
		/[\\/]node_modules[\\/]micromark-extension-gfm-task-list-item[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-chunked[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-classify-character[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-resolve-all[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-encode[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-subtokenize[\\/]/,
		/[\\/]node_modules[\\/]micromark-factory-destination[\\/]/,
		/[\\/]node_modules[\\/]micromark-factory-label[\\/]/,
		/[\\/]node_modules[\\/]micromark-factory-title[\\/]/,
		/[\\/]node_modules[\\/]micromark-factory-whitespace[\\/]/,
		/[\\/]node_modules[\\/]micromark-util-html-tag-name[\\/]/,

		/[\\/]node_modules[\\/]marked[\\/]/,

		/[\\/]node_modules[\\/]prosemirror-/,
		/[\\/]node_modules[\\/]rope-sequence[\\/]/,
		/[\\/]node_modules[\\/]orderedmap[\\/]/,
		/[\\/]node_modules[\\/]w3c-keyname[\\/]/,

		/[\\/]node_modules[\\/]dompurify[\\/]/,
		/[\\/]node_modules[\\/]@floating-ui[\\/]/,

		/[\\/]node_modules[\\/]react-markdown[\\/]/,
		/[\\/]node_modules[\\/]devlop[\\/]/,
		/[\\/]node_modules[\\/]html-url-attributes[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-to-hast[\\/]/,
		/[\\/]node_modules[\\/]trim-lines[\\/]/,
		/[\\/]node_modules[\\/]hast-util-to-jsx-runtime[\\/]/,
		/[\\/]node_modules[\\/]style-to-js[\\/]/,
		/[\\/]node_modules[\\/]style-to-object[\\/]/,
		/[\\/]node_modules[\\/]inline-style-parser[\\/]/,
		/[\\/]node_modules[\\/]vfile-message[\\/]/,
		/[\\/]node_modules[\\/]space-separated-tokens[\\/]/,
		/[\\/]node_modules[\\/]property-information[\\/]/,
		/[\\/]node_modules[\\/]comma-separated-tokens[\\/]/,
		/[\\/]node_modules[\\/]estree-util-is-identifier-name[\\/]/,
		/[\\/]node_modules[\\/]hast-util-whitespace[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-mdx-expression[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-mdx-jsx[\\/]/,
		/[\\/]node_modules[\\/]mdast-util-mdxjs-esm[\\/]/,

		/[\\/]node_modules[\\/]@tiptap[\\/]/,
		/[\\/]node_modules[\\/]fast-equals[\\/]/,
		/[\\/]node_modules[\\/]linkifyjs[\\/]/,
		/[\\/]node_modules[\\/]use-sync-external-store[\\/]/
	],

	'utils-code': [/[\\/]node_modules[\\/](monaco-editor|highlight\.js|lowlight)[\\/]/],

	'utils-datetime': [/[\\/]node_modules[\\/](dayjs|lunisolar|tyme4ts)[\\/]/],

	'utils-crypto': [/[\\/]node_modules[\\/](crypto-js)[\\/]/],

	'utils-matches': [/[\\/]node_modules[\\/](fuse\.js)[\\/]/],

	'utils-math': [
		/[\\/]node_modules[\\/](mathjs|complex\.js|decimal\.js|escape-latex|fraction\.js)[\\/]/,
		/[\\/]node_modules[\\/](javascript-natural-sort|seedrandom|tiny-emitter|typed-function)[\\/]/
	],

	'utils-enhance': [/[\\/]node_modules[\\/](qrcode|d3)[\\/]/, /[\\/]node_modules[\\/]d3-/],

	'utils-network': [
		/[\\/]node_modules[\\/](@ngify)[\\/]/,
		/[\\/]node_modules[\\/](axios|follow-redirects|form-data|proxy-from-env|cookie|set-cookie-parser)[\\/]/
	],

	'utils-store': [/[\\/]node_modules[\\/]zustand[\\/]/],

	'utils-storage': [/[\\/]node_modules[\\/]dexie[\\/]/],

	// 'utils-storage': [
	// 	/[\\/]node_modules[\\/](redux|react-redux|@reduxjs\/toolkit|redux-thunk)[\\/]/,
	// 	/[\\/]node_modules[\\/](immer|@standard-schema\/spec|@standard-schema\/utils|reselect)[\\/]/
	// ],

	'utils-validation': [/[\\/]node_modules[\\/](zod)[\\/]/],

	'utils-polyfill': [/[\\/]node_modules[\\/]@babel[\\/]/],

	'utils-interaction': [/[\\/]node_modules[\\/](sortablejs)[\\/]/],

	scheduler: [/[\\/]node_modules[\\/](scheduler)[\\/]/, /[\\/]node_modules[\\/]@tauri-apps[\\/]/],

	router: [
		/[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/,
		/[\\/]node_modules[\\/]react-router[\\/]/,
		/[\\/]node_modules[\\/]react-router-dom[\\/]/
	],

	'unknown-deps': []
}

const chunkEntries = Object.entries(chunkMap)

const filePath = 'C:/Users/MACHENIKE/Documents/Vue3/'

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
			// target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
			cssTarget: 'chrome142',
			emptyOutDir: true,
			minify: 'terser',
			// minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
			cssMinify: 'esbuild',
			sourcemap: mode === 'development' ? true : false,
			// sourcemap: !!process.env.TAURI_ENV_DEBUG,
			// 输出到包内 dist，便于 Turbo outputs 匹配
			outDir: resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist'),
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
					entryFileNames: 'javascript/[name]-[hash].js',
					chunkFileNames: 'javascript/[name]-[hash].js',
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

						// const pattern = /apps\/client\/src\//.test(id)

						// const replaced = id.replace(filePath, '')

						// if (!pattern) console.log('[manualChunks] ===>', replaced)
						// if (!pattern) ws.write(`[manualChunks] ===> ${replaced}\n`)

						// 其他第三方依赖
						if (/[\\/]node_modules[\\/]/.test(id)) return 'vendors'
					}
				}
			}
		},
		envPrefix: ['VITE_', 'TAURI_'],
		css: {
			modules: {
				generateScopedName: '[name]-[local]-[hash:base64:6]',
				// generateScopedName: '[name]-[hash:base64:6]',
				// generateScopedName(name, _filename, css) {
				// 	// const fileBaseName = basename(filename, '.module.scss')
				// 	const hash = Buffer.from(css).toString('base64').slice(0, 6)
				// 	// const scoped = `${fileBaseName}-${name}-${hash}`
				// 	const scoped = `${name}-${hash}`
				// 	return scoped
				// },
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
			port: 5173,
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
