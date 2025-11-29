import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * 根目录共享的 Vitest 配置
 * 注意：各个子项目应该有自己独立的 vitest.config.ts
 * 此配置仅作为参考或共享配置使用
 */
export default defineConfig({
	plugins: [vue()],
	test: {
		// 测试环境
		environment: 'jsdom', // 或 'happy-dom' 用于 Vue 组件测试

		// 全局测试设置
		globals: true, // 启用全局 API (describe, it, expect 等)

		// 覆盖率配置
		coverage: {
			provider: 'v8', // 或 'istanbul'
			reporter: ['text', 'json', 'html'],
			exclude: ['node_modules/', 'dist/', '**/*.spec.ts', '**/*.test.ts', '**/*.config.ts']
		},

		// 包含的测试文件
		include: ['packages/**/*.{test,spec}.{js,ts,jsx,tsx}', 'apps/**/*.{test,spec}.{js,ts,jsx,tsx}'],

		// 排除的文件
		exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],

		// 设置超时时间
		testTimeout: 10000,
		hookTimeout: 10000,

		// 启用多线程
		threads: true,

		// 监听模式排除
		watchExclude: ['**/node_modules/**', '**/dist/**']
	},

	resolve: {
		alias: {
			'@': resolve(__dirname, './src')
		}
	}
})
