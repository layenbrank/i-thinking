import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { findUpSync } from 'find-up'
import { dirname, resolve } from 'node:path'
import AutoImport from 'unplugin-auto-import/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'
import pkg from './package.json'

// 查找 turbo.json 或 pnpm-workspace.yaml 等 monorepo 根目录特有的文件
const rootMarkerPath = findUpSync(['turbo.json', 'pnpm-workspace.yaml'])
const rootDir = rootMarkerPath ? dirname(rootMarkerPath) : process.cwd()

export default defineConfig(function ({ mode, command }: ConfigEnv): UserConfig {
	const env = loadEnv(mode || 'development', '')

	return {
		base: `/${pkg.name.replace(/^@desktop-app\//, '')}/`,
		plugins: [
			vue(),
			vueJsx(),
			vueDevTools(),
			AutoImport({
				resolvers: [NaiveUiResolver()],
				dts: 'src/types/auto-imports.d.ts',
				imports: [
					'vue',
					'vue-router',
					{
						'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
					}
				]
			}),
			Components({
				resolvers: [NaiveUiResolver()],
				dts: 'src/types/components.d.ts'
			})
		],
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url))
			}
		},
		build: {
			// 方案1: 输出到根目录的 dist 文件夹下（需要修改 turbo.json）
			outDir: resolve(rootDir, `dist/${pkg.name}`),
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
					api: 'modern-compiler'
					// additionalData: '@import "@/styles/variables.scss";',
				}
			}
		},
		server: {
			port: 1024
		}
	}
})
