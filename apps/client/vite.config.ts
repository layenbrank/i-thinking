import react from '@vitejs/plugin-react'
import { findUpSync } from 'find-up'
import { dirname } from 'node:path'
import { fileURLToPath, resolve, URL } from 'node:url'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import Icons from 'unplugin-icons/vite'
import { defineConfig, type ConfigEnv, type UserConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

// 使用正则数组表示需要内联的文件类型
const inlineRegexes = [/\.gif$/i]

// 使用正则数组表示不需要内联的文件类型
const noInlineRegexes = [
	/\.svg$/i,
	/icon.*\.(png|jpe?g)$/i,
	/\.json$/i,
	/\.(mp4|webm|ogg)$/i,
	/\.(mp3|wav|ogg)$/i,
	/\.(woff2?|ttf|eot|otf)$/i,
	/background.*\.(png|jpe?g)$/i
]

const chunkMap: Readonly<Record<string, RegExp[]>> = {
	framework: [/[\\/]node_modules[\\/](react|react-dom|use-sync-external-store)[\\/]/],

	scheduler: [/[\\/]node_modules[\\/]scheduler[\\/]/],

	router: [
		/[\\/]node_modules[\\/]@remix-run[\\/]router[\\/]/,
		/[\\/]node_modules[\\/]react-router[\\/]/,
		/[\\/]node_modules[\\/]react-router-dom[\\/]/
	],

	// store: [
	// 	/[\\/]node_modules[\\/](redux|react-redux|@reduxjs\/toolkit|redux-thunk)[\\/]/,
	// 	/[\\/]node_modules[\\/](immer|@standard-schema\/spec|@standard-schema\/utils|reselect)[\\/]/
	// ],

	antdv: [],

	antdvDeps: [],

	utils: [/[\\/]node_modules[\\/](clsx|uuid)[\\/]/],

	network: [/[\\/]node_modules[\\/](axios)[\\/]/],

	views: [/[\\/]src[\\/]views[\\/]/],

	components: [/[\\/]src[\\/]components[\\/]/]
}

const cssRegex = /\.css$/i
const imageRegex = /.(png|jpe?g|gif|svg|webp|ico)$/i
const fontRegex = /.(woff|woff2|ttf|eot)$/i

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
	// const env = loadEnv(mode || 'development', '')

	return {
		plugins: [
			react(),
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
						resolve(rootDir, 'apps/client-react/src/assets/icons'),
						function (svg) {
							return svg.replace(/^<svg /, '<svg fill="currentColor" ')
						}
					)
				}
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
			target: 'es2023',
			cssTarget: 'chrome128',
			emptyOutDir: true,
			minify: 'esbuild',
			cssMinify: 'esbuild',
			sourcemap: mode === 'development' ? true : false,
			assetsInlineLimit(filePath) {
				// 检查是否匹配内联规则
				if (inlineRegexes.some((regex) => regex.test(filePath))) {
					// return content.length < 10 * 1024 // 小于10kb则内联
					return true
				}

				// 检查是否匹配不内联规则 不内联
				if (noInlineRegexes.some((regex) => regex.test(filePath))) {
					return false
				}

				// 默认情况下，不内联
				return false
			},
			rollupOptions: {
				output: {
					entryFileNames: 'assets/[name]-[hash].js',
					chunkFileNames: 'assets/[name]-[hash].js',
					assetFileNames(chunkInfo) {
						if (!chunkInfo.names) return 'assets/[name].[ext]'

						for (const name of chunkInfo.names) {
							if (cssRegex.test(name)) return `css/${name}`
							if (imageRegex.test(name)) return `images/${name}`
							if (fontRegex.test(name)) return `fonts/${name}`
						}

						return 'assets/[name].[ext]'
					},
					manualChunks(id) {
						for (const [chunkName, patterns] of Object.entries(chunkMap)) {
							const hasMatch = patterns.some((pattern) => pattern.test(id))
							if (hasMatch) return chunkName
						}

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
