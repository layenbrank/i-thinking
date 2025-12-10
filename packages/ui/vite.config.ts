import { findUpSync } from 'find-up'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, type UserConfig } from 'vite'
import dts from 'vite-plugin-dts'
import vueDevTools from 'vite-plugin-vue-devtools'

// 查找 turbo.json 或 pnpm-workspace.yaml 等 monorepo 根目录特有的文件

const __dirname = dirname(fileURLToPath(import.meta.url))

const rootMarkerPath: Readonly<string | undefined> = findUpSync([
	'turbo.json',
	'pnpm-workspace.yaml'
])
const rootDir: Readonly<string> = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

export default defineConfig(function (): UserConfig {
	console.log('fileURLToPath', fileURLToPath(new URL('./src', import.meta.url)))
	return {
		plugins: [
			vue(),
			vueJsx(),
			vueDevTools(),
			dts({
				outDir: './dist/types',
				include: ['src'],
				tsconfigPath: './tsconfig.app.json'
			}),
			Icons({
				compiler: 'vue3',
				autoInstall: true,
				scale: 1,
				defaultStyle: '',
				defaultClass: '',
				jsx: 'react',
				customCollections: {
					// 'local' 是自定义集合名称，可以改为任何你喜欢的名称
					// 本地 SVG 图标文件夹路径
					local: FileSystemIconLoader(
						resolve(rootDir, 'packages/shared/src/assets/icons'),
						function (svg) {
							return svg.replace(/^<svg /, '<svg fill="currentColor" ')
						}
					)
				}
			}),
			Components({
				resolvers: [
					IconsResolver({
						prefix: 'Icon',
						customCollections: ['local']
					})
				],
				dts: 'src/types/components.d.ts'
			})
		],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url))
			}
		},
		build: {
			minify: 'terser',
			cssCodeSplit: false,
			terserOptions: {
				format: {
					comments: false
				}
			},
			lib: {
				entry: resolve(__dirname, 'src/index.ts'),
				name: '@i-thinking/ui',
				fileName: (format) => `index.${format}.js`,
				formats: ['es']
			},
			outDir: 'dist',
			emptyOutDir: true,
			rollupOptions: {
				external: [
					'vue',
					'clsx',
					'dayjs',
					'lodash-es',
					'@i-thinking/core',
					'@i-thinking/shared',
					'swiper',
					/^swiper\/.+/,
					/^swiper\/vue\/.+/,
					/^swiper\/scss\/.+/,
					/^swiper\/css\/.+/,
					/^swiper\/modules\/.+/,
					'ant-design-vue',
					'ant-design-vue/es',
					/^ant-design-vue\/.+/,
					'ant-design-vue/dist/antd.css'
				],
				output: {
					// entryFileNames: '[name]-[hash].js',
					// assetFileNames: '[name]-[hash][extname]',
					entryFileNames: '[name].js',
					assetFileNames: 'index.[ext]',

					exports: 'named',
					globals: {
						vue: 'vue',
						clsx: 'clsx',
						dayjs: 'dayjs',
						swiper: 'swiper',
						'lodash-es': 'lodash-es',
						'@i-thinking/core': '@i-thinking/core',
						'@i-thinking/shared': '@i-thinking/shared',
						'ant-design-vue': 'ant-design-vue'
					}
				}
			},
			assetsInlineLimit: 0
		},
		css: {
			modules: {
				generateScopedName: '[name]__[local]__[hash:base64:5]',
				localsConvention: 'camelCase',
				scopeBehaviour: 'local',
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
			proxy: {
				'/api-weather': {
					target: 'https://weather.qymaster.com/prod-api',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api-weather/, '')
				}
			}
		}
	}
})
