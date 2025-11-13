/**
 * 性能优化类型定义
 */
declare namespace Performance {
	/**
	 * 缓存策略
	 */
	export enum CacheStrategy {
		/** 最近最少使用 */
		LRU = 'LRU',
		/** 最不经常使用 */
		LFU = 'LFU',
		/** 先进先出 */
		FIFO = 'FIFO',
		/** 时间过期 */
		TTL = 'TTL'
	}

	/**
	 * 缓存条目
	 */
	export interface CacheEntry<T = any> {
		/** 键 */
		key: string
		/** 值 */
		value: T
		/** 创建时间 */
		createdAt: number
		/** 最后访问时间 */
		lastAccessed: number
		/** 访问次数 */
		accessCount: number
		/** 过期时间 */
		expiresAt?: number
		/** 大小（字节） */
		size?: number
	}

	/**
	 * 缓存接口
	 */
	export interface Cache<K = any, V = any> {
		/**
		 * 获取值
		 */
		get: (key: K) => V | undefined

		/**
		 * 设置值
		 */
		set: (key: K, value: V, ttl?: number) => void

		/**
		 * 检查是否存在
		 */
		has: (key: K) => boolean

		/**
		 * 删除
		 */
		delete: (key: K) => boolean

		/**
		 * 清空
		 */
		clear: () => void

		/**
		 * 获取大小
		 */
		size: () => number

		/**
		 * 获取统计
		 */
		stats: () => CacheStats
	}

	/**
	 * 缓存统计
	 */
	export interface CacheStats {
		/** 总请求数 */
		requests: number
		/** 命中数 */
		hits: number
		/** 未命中数 */
		misses: number
		/** 命中率 */
		hitRate: number
		/** 淘汰数 */
		evictions: number
		/** 当前大小 */
		size: number
	}

	/**
	 * 批处理配置
	 */
	export interface BatchConfig {
		/** 最大批次大小 */
		maxSize: number
		/** 最大等待时间（毫秒） */
		maxWait: number
		/** 是否使用空闲回调 */
		useIdleCallback?: boolean
	}

	/**
	 * 节流选项
	 */
	export interface ThrottleOptions {
		/** 等待时间（毫秒） */
		wait: number
		/** 是否在开始时执行 */
		leading?: boolean
		/** 是否在结束时执行 */
		trailing?: boolean
	}

	/**
	 * 防抖选项
	 */
	export interface DebounceOptions {
		/** 等待时间（毫秒） */
		wait: number
		/** 是否立即执行 */
		immediate?: boolean
		/** 最大等待时间 */
		maxWait?: number
	}

	/**
	 * 惰性加载配置
	 */
	export interface LazyLoadConfig {
		/** 是否启用 */
		enabled: boolean
		/** 预加载策略 */
		preload?: 'eager' | 'lazy' | 'none'
		/** 预加载令牌 */
		preloadTokens?: any[]
	}

	/**
	 * 性能指标
	 */
	export interface PerformanceMetrics {
		/** 依赖解析总耗时 */
		totalResolveTime: number
		/** 平均解析耗时 */
		avgResolveTime: number
		/** 最大解析耗时 */
		maxResolveTime: number
		/** 消息延迟 */
		messageLatency: number
		/** 缓存命中率 */
		cacheHitRate: number
		/** 内存占用（字节） */
		memoryUsage?: number
		/** 详细指标 */
		details: Map<string, number>
	}

	/**
	 * 性能监控器接口
	 */
	export interface PerformanceMonitor {
		/**
		 * 开始测量
		 */
		mark: (name: string) => void

		/**
		 * 结束测量
		 */
		measure: (name: string, startMark?: string) => number

		/**
		 * 获取指标
		 */
		getMetrics: () => PerformanceMetrics

		/**
		 * 导出报告
		 */
		exportReport: () => string

		/**
		 * 清空
		 */
		clear: () => void
	}
}

export { Performance }
