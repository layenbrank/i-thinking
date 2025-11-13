import type { MarkdownPlugin } from './markdown-plugin'

/**
 * Markdown 渲染器类型定义
 */
declare namespace MarkdownRenderer {
	/**
	 * 功能特性枚举
	 */
	export enum Feature {
		/** 语法高亮 */
		HIGHLIGHT = 'HIGHLIGHT',
		/** 数学公式 */
		KATEX = 'KATEX',
		/** Mermaid 图表 */
		MERMAID = 'MERMAID',
		/** 目录生成 */
		TOC = 'TOC',
		/** Emoji 支持 */
		EMOJI = 'EMOJI',
		/** 脚注 */
		FOOTNOTE = 'FOOTNOTE',
		/** 自定义容器 */
		CONTAINER = 'CONTAINER',
		/** 任务列表 */
		TASK_LIST = 'TASK_LIST'
	}

	/**
	 * 主题选项
	 */
	export interface ThemeOptions {
		/** 代码高亮主题 */
		codeTheme?: string
		/** KaTeX 主题 */
		mathTheme?: string
		/** Mermaid 主题 */
		mermaidTheme?: string
		/** 自定义 CSS */
		customCSS?: string
	}

	/**
	 * 渲染器选项
	 */
	export interface RendererOptions {
		/** 启用的特性 */
		features?: Feature[]
		/** 主题选项 */
		theme?: ThemeOptions
		/** 是否异步渲染 */
		async?: boolean
		/** 是否启用缓存 */
		cache?: boolean
		/** 缓存策略 */
		cacheStrategy?: 'LRU' | 'LFU' | 'FIFO' | 'TTL'
		/** 缓存大小 */
		cacheSize?: number
		/** 是否启用性能监控 */
		performance?: boolean
		/** 自定义插件 */
		plugins?: MarkdownPlugin.Plugin[]
		/** marked 配置 */
		markedOptions?: any
	}

	/**
	 * 渲染结果
	 */
	export interface RenderResult {
		/** 渲染后的 HTML */
		html: string
		/** 渲染耗时 */
		duration?: number
		/** 是否来自缓存 */
		cached?: boolean
		/** 元数据 */
		metadata?: {
			headings?: { level: number; text: string; id: string }[]
			toc?: string
			[key: string]: any
		}
	}

	/**
	 * 配置预设
	 */
	export type Preset = 'minimal' | 'full' | 'ai-chat' | 'documentation'

	/**
	 * 渲染器实例
	 */
	export interface Renderer {
		/**
		 * 渲染 Markdown
		 */
		render: (markdown: string, context?: MarkdownPlugin.RenderContext) => RenderResult

		/**
		 * 异步渲染
		 */
		renderAsync: (markdown: string, context?: MarkdownPlugin.RenderContext) => Promise<RenderResult>

		/**
		 * 重新配置
		 */
		reconfigure: (options: Partial<RendererOptions>) => void

		/**
		 * 启用特性
		 */
		enableFeature: (feature: Feature) => void

		/**
		 * 禁用特性
		 */
		disableFeature: (feature: Feature) => void

		/**
		 * 注册插件
		 */
		registerPlugin: (plugin: MarkdownPlugin.Plugin) => void

		/**
		 * 卸载插件
		 */
		unregisterPlugin: (name: string) => void

		/**
		 * 清空缓存
		 */
		clearCache: () => void

		/**
		 * 获取性能指标
		 */
		getMetrics: () => any

		/**
		 * 销毁渲染器
		 */
		dispose: () => void
	}
}

export { MarkdownRenderer }
