import { findUpSync } from 'find-up'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import AutoImport from 'unplugin-auto-import/vite'
import { FileSystemIconLoader } from 'unplugin-icons/loaders'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import pkg from './package.json'

import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

const rootMarkerPath: Readonly<string | undefined> = findUpSync([
	'turbo.json',
	'pnpm-workspace.yaml'
])
const rootDir: Readonly<string> = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()
// const [lang, platform, project] = pkg.name.split('-')
// const outputDir: Readonly<string> = `dist/${lang}/${platform}/${project}`
const outputDir: Readonly<string> = pkg.name.replace(/^@turborepo-\//, '')

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
	const env = loadEnv(mode || 'development', '')

	return {
		base: `/${pkg.name.replace(/^@turborepo-\//, '')}/`,
		plugins: [
			vue(),
			vueJsx(),
			vueDevTools(),
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
					local: FileSystemIconLoader('./src/assets/icons', function (svg) {
						return svg.replace(/^<svg /, '<svg fill="currentColor" ')
					})
				}
			}),
			AutoImport({
				resolvers: [NaiveUiResolver()],
				dts: 'src/types/auto-imports.d.ts',
				include: [/\.[tj]sx?$/, /\.vue$/, /\.vue\?vue/, /\.md$/],
				imports: [
					'vue',
					'vue-router',
					{
						'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
					}
				]
			}),
			Components({
				resolvers: [
					NaiveUiResolver(),
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
			outDir: resolve(rootDir, outputDir),
			emptyOutDir: true,
			rollupOptions: {
				output: {
					entryFileNames: '[name].js',
					manualChunks: {
						vue: ['vue', 'vue-router', 'pinia']
					}
				}
			}
		},
		css: {
			modules: {
				// 生成的类名格式
				generateScopedName: '[name]__[local]__[hash:base64:5]',
				// 是否驼峰化 CSS 类名
				localsConvention: 'camelCase',
				// 哪些文件需要使用 CSS Modules（默认：/\.module\./）
				scopeBehaviour: 'local',
				// 自定义哈希函数
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
			port: 1024,
			proxy: {
				'/bing': {
					target: 'https://cn.bing.com',
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/bing/, '')
				}
			}
		}
	}
})
