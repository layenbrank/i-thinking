/**
 * 依赖注入类型定义
 */
declare namespace DI {
	/**
	 * 注入令牌
	 */
	export type InjectionToken = symbol | string | (() => void)

	/**
	 * 作用域
	 */
	export enum Scope {
		/** 全局单例 */
		SINGLETON = 'SINGLETON',
		/** 每次创建新实例 */
		TRANSIENT = 'TRANSIENT',
		/** 每次请求创建 */
		REQUEST = 'REQUEST'
	}

	/**
	 * 类提供者
	 */
	export interface ClassProvider<T = any> {
		type: 'class'
		useClass: new (...args: any[]) => T
		scope?: Scope
	}

	/**
	 * 值提供者
	 */
	export interface ValueProvider<T = any> {
		type: 'value'
		useValue: T
	}

	/**
	 * 工厂提供者
	 */
	export interface FactoryProvider<T = any> {
		type: 'factory'
		useFactory: (...args: any[]) => T | Promise<T>
		inject?: InjectionToken[]
		scope?: Scope
	}

	/**
	 * 已存在提供者
	 */
	export interface ExistingProvider {
		type: 'existing'
		useExisting: InjectionToken
	}

	/**
	 * 提供者联合类型
	 */
	export type Provider<T = any> =
		| ClassProvider<T>
		| ValueProvider<T>
		| FactoryProvider<T>
		| ExistingProvider

	/**
	 * 依赖元数据
	 */
	export interface DependencyMetadata {
		token: InjectionToken
		optional?: boolean
		self?: boolean
		skipSelf?: boolean
	}

	/**
	 * 容器接口
	 */
	export interface Container {
		/**
		 * 注册提供者
		 */
		register: <T>(token: InjectionToken, provider: Provider<T>) => void

		/**
		 * 解析依赖
		 */
		resolve: <T>(token: InjectionToken) => T

		/**
		 * 异步解析依赖
		 */
		resolveAsync: <T>(token: InjectionToken) => Promise<T>

		/**
		 * 检查是否存在
		 */
		has: (token: InjectionToken) => boolean

		/**
		 * 清空依赖
		 */
		clear: (token?: InjectionToken) => void

		/**
		 * 创建子容器
		 */
		createChild: () => Container

		/**
		 * 销毁容器
		 */
		dispose: () => void
	}

	/**
	 * 依赖图
	 */
	export interface DependencyGraph {
		/**
		 * 添加边
		 */
		addEdge: (from: InjectionToken, to: InjectionToken) => void

		/**
		 * 检测循环依赖
		 */
		detectCycle: () => InjectionToken[] | null

		/**
		 * 拓扑排序
		 */
		topologicalSort: () => InjectionToken[]

		/**
		 * 获取依赖路径
		 */
		getPath: (from: InjectionToken, to: InjectionToken) => InjectionToken[] | null
	}
}

export { DI }
