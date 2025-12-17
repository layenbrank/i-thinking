import type { EntityTable } from 'dexie'
import { liveQuery } from 'dexie'
import { BehaviorSubject, from, Subject, type Observable, type Subscription } from 'rxjs'
import {
	catchError,
	debounceTime,
	distinctUntilChanged,
	map,
	retry,
	shareReplay,
	switchMap,
	tap
} from 'rxjs/operators'

// ============================================================================
// 类型定义
// ============================================================================

/** 同步状态 */
interface SyncState<T> {
	data: T
	loading: boolean
	error: Error | null
	lastSyncAt: number | null
}

/** 同步选项 */
interface SyncOptions<T> {
	/** 初始值 */
	initialValue: T
	/** 错误回调 */
	onError?: (error: Error) => void
	/** 数据变化回调 */
	onChange?: (data: T) => void
	/** 是否开启调试日志 */
	debug?: boolean
	/** 重试次数 */
	retryCount?: number
	/** 去重比较函数 */
	equalityFn?: (a: T, b: T) => boolean
}

/** 查询条件 */
interface QueryFilter<T> {
	field: keyof T
	operator: 'equals' | 'above' | 'below' | 'between' | 'startsWith' | 'anyOf'
	value: unknown
	value2?: unknown // 用于 between
}

/** 分页选项 */
interface PaginationOptions {
	page: number
	pageSize: number
	orderBy?: string
	reverse?: boolean
}

/** 分页结果 */
interface PaginatedResult<T> {
	data: T[]
	total: number
	page: number
	pageSize: number
	totalPages: number
	hasMore: boolean
}

// ============================================================================
// DexieSync 类 - 封装单表同步逻辑
// ============================================================================

export class DexieSync<T extends { id: string }> {
	private table: EntityTable<T, 'id'>
	private subscription: Subscription | null = null
	private state$ = new BehaviorSubject<SyncState<T[]>>({
		data: [],
		loading: true,
		error: null,
		lastSyncAt: null
	})
	private options: SyncOptions<T[]>
	private refreshTrigger$ = new Subject<void>()

	constructor(table: EntityTable<T, 'id'>, options: Partial<SyncOptions<T[]>> = {}) {
		this.table = table
		this.options = {
			initialValue: [],
			debug: import.meta.env.DEV,
			retryCount: 3,
			...options
		}
	}

	/** 获取当前状态 Observable */
	get state(): Observable<SyncState<T[]>> {
		return this.state$.asObservable()
	}

	/** 获取数据 Observable */
	get data$(): Observable<T[]> {
		return this.state$.pipe(
			map(function (s) {
				return s.data
			}),
			distinctUntilChanged(this.options.equalityFn)
		)
	}

	/** 获取加载状态 */
	get loading$(): Observable<boolean> {
		return this.state$.pipe(
			map(function (s) {
				return s.loading
			}),
			distinctUntilChanged()
		)
	}

	/** 获取错误状态 */
	get error$(): Observable<Error | null> {
		return this.state$.pipe(
			map(function (s) {
				return s.error
			}),
			distinctUntilChanged()
		)
	}

	/** 获取当前数据快照 */
	get snapshot(): T[] {
		return this.state$.getValue().data
	}

	/** 启动同步 */
	start(queryFn?: () => Promise<T[]>): this {
		if (this.subscription) {
			this.log('Sync already started')
			return this
		}

		const self = this
		const defaultQuery = function () {
			return self.table.toArray()
		}

		this.subscription = from(liveQuery(queryFn ?? defaultQuery))
			.pipe(
				retry(this.options.retryCount),
				tap(function (data) {
					self.state$.next({
						data,
						loading: false,
						error: null,
						lastSyncAt: Date.now()
					})
					self.options.onChange?.(data)
					self.log(`Synced ${data.length} records`)
				}),
				catchError(function (error) {
					self.log('Sync error:', error)
					self.state$.next({
						...self.state$.getValue(),
						loading: false,
						error
					})
					self.options.onError?.(error)
					return from(Promise.resolve([]))
				})
			)
			.subscribe()

		this.log('Sync started')
		return this
	}

	/** 停止同步 */
	stop(): void {
		this.subscription?.unsubscribe()
		this.subscription = null
		this.log('Sync stopped')
	}

	/** 手动刷新 */
	refresh(): void {
		this.refreshTrigger$.next()
	}

	/** 销毁 */
	destroy(): void {
		this.stop()
		this.state$.complete()
		this.refreshTrigger$.complete()
	}

	private log(...args: unknown[]): void {
		if (this.options.debug) {
			console.log(`[DexieSync:${this.table.name}]`, ...args)
		}
	}
}

// ============================================================================
// 高级查询工具
// ============================================================================

/**
 * 创建响应式查询
 * @param queryFn - 查询函数
 * @param deps$ - 依赖的 Observable，变化时重新查询
 */
export function createReactiveQuery<T, D>(
	queryFn: (deps: D) => Promise<T>,
	deps$: Observable<D>
): Observable<T> {
	return deps$.pipe(
		debounceTime(100),
		distinctUntilChanged(),
		switchMap(function (deps) {
			return from(
				liveQuery(function () {
					return queryFn(deps)
				})
			)
		}),
		shareReplay(1)
	)
}

/**
 * 创建分页查询
 */
export function createPaginatedQuery<T extends { id: string }>(
	table: EntityTable<T, 'id'>,
	options$: Observable<PaginationOptions>
): Observable<PaginatedResult<T>> {
	return options$.pipe(
		debounceTime(100),
		switchMap(function (opts) {
			return from(
				liveQuery(async function () {
					const { page, pageSize, orderBy, reverse } = opts
					const offset = (page - 1) * pageSize

					let collection = orderBy ? table.orderBy(orderBy) : table.toCollection()

					if (reverse) {
						collection = collection.reverse()
					}

					const [data, total] = await Promise.all([
						collection.offset(offset).limit(pageSize).toArray(),
						table.count()
					])

					const totalPages = Math.ceil(total / pageSize)

					return {
						data,
						total,
						page,
						pageSize,
						totalPages,
						hasMore: page < totalPages
					}
				})
			)
		}),
		shareReplay(1)
	)
}

/**
 * 创建条件查询
 */
export function createFilteredQuery<T extends { id: string }>(
	table: EntityTable<T, 'id'>,
	filters$: Observable<QueryFilter<T>[]>
): Observable<T[]> {
	return filters$.pipe(
		debounceTime(150),
		switchMap(function (filters) {
			return from(
				liveQuery(async function () {
					if (filters.length === 0) {
						return table.toArray()
					}

					// 使用第一个过滤条件作为主查询
					const primaryFilter = filters[0]
					let collection = applyFilter(table, primaryFilter)

					// 应用额外的过滤条件
					if (filters.length > 1) {
						const restFilters = filters.slice(1)
						const result = await collection.toArray()
						return result.filter(function (item) {
							return restFilters.every(function (f) {
								return matchFilter(item, f)
							})
						})
					}

					return collection.toArray()
				})
			)
		}),
		shareReplay(1)
	)
}

function applyFilter<T extends { id: string }>(
	table: EntityTable<T, 'id'>,
	filter: QueryFilter<T>
) {
	const { field, operator, value, value2 } = filter
	const fieldStr = String(field)

	switch (operator) {
		case 'equals':
			return table.where(fieldStr).equals(value)
		case 'above':
			return table.where(fieldStr).above(value)
		case 'below':
			return table.where(fieldStr).below(value)
		case 'between':
			return table.where(fieldStr).between(value, value2)
		case 'startsWith':
			return table.where(fieldStr).startsWith(String(value))
		case 'anyOf':
			return table.where(fieldStr).anyOf(value as unknown[])
		default:
			return table.toCollection()
	}
}

function matchFilter<T>(item: T, filter: QueryFilter<T>): boolean {
	const value = item[filter.field]

	switch (filter.operator) {
		case 'equals':
			return value === filter.value
		case 'above':
			return (value as number) > (filter.value as number)
		case 'below':
			return (value as number) < (filter.value as number)
		case 'between':
			return (
				(value as number) >= (filter.value as number) &&
				(value as number) <= (filter.value2 as number)
			)
		case 'startsWith':
			return String(value).startsWith(String(filter.value))
		case 'anyOf':
			return (filter.value as unknown[]).includes(value)
		default:
			return true
	}
}

// ============================================================================
// CRUD 工具函数
// ============================================================================

/**
 * 创建乐观更新的 CRUD 操作
 */
export function createOptimisticCRUD<
	T extends { id: string; updatedAt?: number; createdAt?: number }
>(table: EntityTable<T, 'id'>, onUpdate: (data: T[]) => void, getCurrentData: () => T[]) {
	return {
		/** 添加记录 (乐观更新) */
		async add(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
			const id = crypto.randomUUID()
			const now = Date.now()
			const newItem = {
				...data,
				id,
				createdAt: now,
				updatedAt: now
			} as T

			// 乐观更新
			const currentData = getCurrentData()
			onUpdate([...currentData, newItem])

			try {
				await table.add(newItem)
				return id
			} catch (error) {
				// 回滚
				onUpdate(currentData)
				throw error
			}
		},

		/** 更新记录 (乐观更新) */
		async update(id: string, changes: Partial<T>): Promise<void> {
			const currentData = getCurrentData()
			const index = currentData.findIndex(function (item) {
				return item.id === id
			})
			if (index === -1) {
				throw new Error(`Record with id ${id} not found`)
			}

			const oldItem = currentData[index]
			const updatedItem = {
				...oldItem,
				...changes,
				updatedAt: Date.now()
			} as T

			// 乐观更新
			const newData = [...currentData]
			newData[index] = updatedItem
			onUpdate(newData)

			try {
				await table.update(id, { ...changes, updatedAt: Date.now() })
			} catch (error) {
				// 回滚
				onUpdate(currentData)
				throw error
			}
		},

		/** 删除记录 (乐观更新) */
		async remove(id: string): Promise<void> {
			const currentData = getCurrentData()
			const index = currentData.findIndex(function (item) {
				return item.id === id
			})
			if (index === -1) return

			// 乐观更新
			const newData = currentData.filter(function (item) {
				return item.id !== id
			})
			onUpdate(newData)

			try {
				await table.delete(id)
			} catch (error) {
				// 回滚
				onUpdate(currentData)
				throw error
			}
		},

		/** 批量添加 */
		async bulkAdd(items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<string[]> {
			const now = Date.now()
			const newItems = items.map(function (item) {
				return {
					...item,
					id: crypto.randomUUID(),
					createdAt: now,
					updatedAt: now
				} as T
			})

			await table.bulkAdd(newItems)
			return newItems.map(function (item) {
				return item.id
			})
		},

		/** 批量更新 */
		async bulkUpdate(updates: Array<{ id: string; changes: Partial<T> }>): Promise<void> {
			const now = Date.now()
			await Promise.all(
				updates.map(function ({ id, changes }) {
					return table.update(id, { ...changes, updatedAt: now })
				})
			)
		},

		/** 批量删除 */
		async bulkRemove(ids: string[]): Promise<void> {
			await table.bulkDelete(ids)
		}
	}
}

// ============================================================================
// 缓存管理
// ============================================================================

interface CacheEntry<T> {
	data: T
	timestamp: number
	ttl: number
}

/**
 * 创建带缓存的查询
 */
export function createCachedQuery<T>(
	queryFn: () => Promise<T>,
	options: { ttl: number; key: string }
): () => Promise<T> {
	const cache = new Map<string, CacheEntry<T>>()

	return async function () {
		const cached = cache.get(options.key)
		const now = Date.now()

		if (cached && now - cached.timestamp < cached.ttl) {
			return cached.data
		}

		const data = await queryFn()
		cache.set(options.key, {
			data,
			timestamp: now,
			ttl: options.ttl
		})

		return data
	}
}

/**
 * 创建带缓存失效的响应式查询
 */
export function createInvalidatableQuery<T>(queryFn: () => Promise<T>): {
	query$: Observable<T>
	invalidate: () => void
} {
	const invalidate$ = new Subject<void>()
	const query$ = invalidate$.pipe(
		switchMap(function () {
			return from(liveQuery(queryFn))
		}),
		shareReplay(1)
	)

	// 初始触发
	setTimeout(function () {
		invalidate$.next()
	}, 0)

	return {
		query$,
		invalidate: function () {
			invalidate$.next()
		}
	}
}

// ============================================================================
// 同步管理器 - 管理多个表的同步
// ============================================================================

export class SyncManager {
	private syncs = new Map<string, DexieSync<any>>()
	private initialized = false

	/** 注册表同步 */
	register<T extends { id: string }>(
		name: string,
		table: EntityTable<T, 'id'>,
		options?: Partial<SyncOptions<T[]>>
	): DexieSync<T> {
		if (this.syncs.has(name)) {
			return this.syncs.get(name)!
		}

		const sync = new DexieSync(table, options)
		this.syncs.set(name, sync)

		if (this.initialized) {
			sync.start()
		}

		return sync
	}

	/** 获取同步实例 */
	get<T extends { id: string }>(name: string): DexieSync<T> | undefined {
		return this.syncs.get(name)
	}

	/** 启动所有同步 */
	startAll(): void {
		this.initialized = true
		this.syncs.forEach(function (sync) {
			sync.start()
		})
	}

	/** 停止所有同步 */
	stopAll(): void {
		this.syncs.forEach(function (sync) {
			sync.stop()
		})
	}

	/** 销毁所有同步 */
	destroy(): void {
		this.syncs.forEach(function (sync) {
			sync.destroy()
		})
		this.syncs.clear()
		this.initialized = false
	}
}

// 导出全局同步管理器实例
export const syncManager = new SyncManager()
