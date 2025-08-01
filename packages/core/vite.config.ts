import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(function () {
	console.log(resolve(__dirname, 'src/index.ts'))
	return {
		plugins: [
			vue(),
			vueJsx(),
			dts({
				tsconfigPath: './tsconfig.json',
				outDir: './dist/types',
				entryRoot: resolve(__dirname, 'src')
			})
		],
		build: {
			sourcemap: true,
			terserOptions: {
				compress: {
					dead_code: true,
					unused: true
				}
			},
			minify: 'terser',
			lib: {
				entry: resolve(__dirname, 'src/index.ts'),
				name: '@desktop-widgets/core',
				fileName: 'index',
				formats: ['es']
			},
			rollupOptions: {
				external: ['vue', 'pinia'],
				output: {
					compact: true,
					exports: 'named',
					globals: {
						vue: 'Vue',
						pinia: 'Pinia'
					}
				}
			}
		}
	}
})
