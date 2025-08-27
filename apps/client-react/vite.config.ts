import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type ConfigEnv, type UserConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async function ({ mode, command }: ConfigEnv): Promise<UserConfig> {
	const env = loadEnv(mode || 'development', '')

	return {
		plugins: [react()],

		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url))
			}
		},

		build: {
			target: 'es2023',
			cssTarget: 'chrome128',
			emptyOutDir: true,
			minify: 'esbuild',
			cssMinify: 'esbuild',
			sourcemap: mode === 'development' ? true : false
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
					api: 'modern-compiler'
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
