/**
 * Markdown 插件系统类型定义
 */
declare namespace MarkdownPlugin {
	/**
	 * 插件状态
	 */
	export enum PluginState {
		/** 未初始化 */
		UNINITIALIZED = 'UNINITIALIZED',
		/** 初始化中 */
		INITIALIZING = 'INITIALIZING',
		/** 就绪 */
		READY = 'READY',
		/** 错误 */
		ERROR = 'ERROR',
		/** 已销毁 */
		DESTROYED = 'DESTROYED'
	}

	/**
	 * 插件元数据
	 */
	export interface PluginMeta {
		/** 插件名称 */
		name: string
		/** 插件版本 */
		version: string
		/** 插件作者 */
		author?: string
		/** 插件描述 */
		description?: string
		/** 依赖的其他插件 */
		dependencies?: {
			name: string
			version: string
		}[]
		/** 提供的服务 */
		provides?: string[]
		/** 冲突的插件 */
		conflicts?: string[]
		/** 插件优先级 */
		priority?: number
	}

	/**
	 * 插件上下文
	 */
	export interface PluginContext {
		/** 插件名称 */
		name: string
		/** 渲染上下文 */
		renderContext?: RenderContext
		/** 共享状态 */
		shared: Map<string, any>
		/** 事件发射器 */
		emit: (event: string, data?: any) => void
		/** 事件监听器 */
		on: (event: string, handler: (...args: any[]) => void) => void
		/** 日志记录器 */
		logger: {
			info: (...args: any[]) => void
			warn: (...args: any[]) => void
			error: (...args: any[]) => void
			debug: (...args: any[]) => void
		}
	}

	/**
	 * 渲染上下文
	 */
	export interface RenderContext {
		/** 渲染ID */
		id: string
		/** 时间戳 */
		timestamp: number
		/** 源内容 */
		source: string
		/** 性能监控 */
		performance: {
			start: number
			marks: Map<string, number>
			measure: (name: string) => number
		}
	}

	/**
	 * 插件生命周期钩子
	 */
	export interface PluginHooks<_TConfig = any> {
		/**
		 * 初始化前
		 */
		beforeInit?: (context: PluginContext) => void | Promise<void>

		/**
		 * 初始化后
		 */
		afterInit?: (context: PluginContext) => void | Promise<void>

		/**
		 * 渲染前
		 */
		beforeRender?: (markdown: string, context: RenderContext) => string | Promise<string>

		/**
		 * 渲染后
		 */
		afterRender?: (html: string, context: RenderContext) => string | Promise<string>

		/**
		 * 错误处理
		 */
		onError?: (error: Error, context: PluginContext) => void | Promise<void>

		/**
		 * 销毁时
		 */
		onDestroy?: (context: PluginContext) => void | Promise<void>
	}

	/**
	 * 插件接口
	 */
	export interface Plugin<TConfig = any> {
		/** 插件元数据 */
		meta: PluginMeta

		/** 插件配置 */
		config?: TConfig

		/** 插件状态 */
		state?: PluginState

		/** 生命周期钩子 */
		hooks?: PluginHooks<TConfig>

		/**
		 * 安装插件
		 */
		install?: (context: PluginContext) => void | Promise<void>

		/**
		 * 卸载插件
		 */
		uninstall?: (context: PluginContext) => void | Promise<void>

		/**
		 * 提供的服务
		 */
		services?: Record<string, any>
	}

	/**
	 * 插件工厂函数
	 */
	export type PluginFactory<TConfig = any> = (config?: TConfig) => Plugin<TConfig>

	/**
	 * 插件注册表
	 */
	export type PluginRegistry = Map<string, Plugin>
}

export { MarkdownPlugin }
