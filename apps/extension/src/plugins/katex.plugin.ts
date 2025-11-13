/**
 * KaTeX 数学公式插件
 */

export interface KatexConfig {
	/** 主题 */
	theme?: 'light' | 'dark'
	/** 是否抛出错误 */
	throwOnError?: boolean
	/** 输出格式 */
	output?: 'html' | 'mathml' | 'htmlAndMathml'
	/** 宏定义 */
	macros?: Record<string, string>
}

/**
 * 创建 KaTeX 插件
 */
export function createKatexPlugin() {
	let katex: any = null

	return {
		meta: {
			name: 'katex',
			version: '1.0.0',
			provides: ['math-formula']
		},
		defaultConfig: {
			theme: 'light',
			throwOnError: false,
			output: 'html',
			macros: {}
		},
		hooks: {
			async afterInit(config: KatexConfig, context: any) {
				try {
					// 动态导入 KaTeX
					const module = await import('katex')
					katex = module.default

					// 加载样式
					const katexStyle = document.createElement('link')
					katexStyle.rel = 'stylesheet'
					katexStyle.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css'
					document.head.appendChild(katexStyle)
					context.state.set('katexStyle', katexStyle)

					context.logger.info('KaTeX initialized')
				} catch (error) {
					context.logger.error('Failed to initialize KaTeX:', error)
					throw error
				}
			},

			afterRender(html: string, context: any) {
				if (!katex) return html

				const config = context.state.get('config') as KatexConfig

				// 处理行内公式 $...$
				html = html.replace(/\$([^$]+)\$/g, (_match: string, formula: string) => {
					try {
						return katex.renderToString(formula, {
							throwOnError: config?.throwOnError ?? false,
							output: config?.output ?? 'html',
							macros: config?.macros ?? {},
							displayMode: false
						})
					} catch (error) {
						context.logger.warn('Failed to render inline math:', error)
						return `<span class="math-error">${formula}</span>`
					}
				})

				// 处理块级公式 $$...$$
				html = html.replace(/\$\$([^$]+)\$\$/g, (_match: string, formula: string) => {
					try {
						return katex.renderToString(formula, {
							throwOnError: config?.throwOnError ?? false,
							output: config?.output ?? 'html',
							macros: config?.macros ?? {},
							displayMode: true
						})
					} catch (error) {
						context.logger.warn('Failed to render block math:', error)
						return `<div class="math-error">${formula}</div>`
					}
				})

				return html
			},

			onDestroy(context: any) {
				const katexStyle = context.state.get('katexStyle')
				if (katexStyle && katexStyle instanceof HTMLLinkElement) {
					katexStyle.remove()
				}
			}
		}
	}
}
