import { database } from '@/databases/database'
import { liveQuery } from 'dexie'
import {
	BehaviorSubject,
	Subject,
	combineLatest,
	from,
	type Observable,
	type Subscription
} from 'rxjs'
import { catchError, debounceTime, filter, map, shareReplay, switchMap, tap } from 'rxjs/operators'
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// ============================================================================
// 类型定义
// ============================================================================

/** Application 事件类型 */
type ApplicationEventType =
	| 'APPLICATION_INSERTED'
	| 'APPLICATION_UPDATED'
	| 'APPLICATION_REMOVED'
	| 'APPLICATION_SELECTED'
	| 'APPLICATIONS_SYNCED'
	| 'APPLICATIONS_REORDERED'

/** 事件载荷 */
interface ApplicationEvent<T = unknown> {
	type: ApplicationEventType
	payload: T
	timestamp: number
}

/** 排序选项 */
type SortField = 'index' | 'createdAt' | 'updatedAt' | 'title' | 'downloadCount'
type SortOrder = 'asc' | 'desc'

interface SortOptions {
	field: SortField
	order: SortOrder
}

/** Store 状态 */
interface ApplicationState {
	application: Application | null
	applications: Application[]
	loading: boolean
	error: string | null
	sortOptions: SortOptions
	filterMirrorId: string | null
}

/** Store Actions */
interface ApplicationActions {
	// 选择
	selectApplication: (id: string | null) => void

	// CRUD
	toInsert: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
	toUpdate: (id: string, data: Partial<Application>) => Promise<void>
	toRemove: (id: string) => Promise<void>

	// 批量操作
	toBulkInsert: (
		items: Array<Omit<Application, 'id' | 'createdAt' | 'updatedAt'>>
	) => Promise<string[]>
	toBulkUpdate: (updates: Array<{ id: string; changes: Partial<Application> }>) => Promise<void>
	toBulkRemove: (ids: string[]) => Promise<void>

	// 重排序
	toReorder: (fromIndex: number, toIndex: number) => Promise<void>
	toReorderByIds: (orderedIds: string[]) => Promise<void>

	// 过滤/排序
	setFilterMirrorId: (mirrorId: string | null) => void
	setSortOptions: (options: SortOptions) => void

	// 查询
	getByMirrorId: (mirrorId: string) => Application[]
	getByComponent: (component: Application.Component) => Application[]

	// 内部方法
	_setApplications: (applications: Application[]) => void
	_setLoading: (loading: boolean) => void
	_setError: (error: string | null) => void
}

type ApplicationStore = ApplicationState & ApplicationActions

// ============================================================================
// RxJS 响应式状态
// ============================================================================

/** 事件总线 */
export const applicationEvents$ = new Subject<ApplicationEvent>()

/** 当前选中的 Application */
export const selectedApplication$ = new BehaviorSubject<Application | null>(null)

/** 过滤条件 - mirrorId */
export const filterMirrorId$ = new BehaviorSubject<string | null>(null)

/** 排序条件 */
export const sortOptions$ = new BehaviorSubject<SortOptions>({
	field: 'index',
	order: 'asc'
})

/** 搜索关键词 */
export const applicationSearchTerm$ = new BehaviorSubject<string>('')

/**
 * 响应式查询 - 根据过滤和排序条件自动更新
 * 这个 Observable 会在数据库变化、过滤条件变化、排序条件变化时自动更新
 */
export const filteredApplications$: Observable<Application[]> = combineLatest([
	filterMirrorId$,
	sortOptions$,
	applicationSearchTerm$.pipe(debounceTime(300))
]).pipe(
	switchMap(function ([mirrorId, sort, searchTerm]) {
		return from(
			liveQuery(async function () {
				let query = database.application.orderBy(sort.field)

				if (sort.order === 'desc') {
					query = query.reverse()
				}

				let results = await query.toArray()

				// 应用 mirrorId 过滤
				if (mirrorId) {
					results = results.filter(function (app) {
						return app.mirrorID === mirrorId
					})
				}

				// 应用搜索过滤
				if (searchTerm.trim()) {
					const term = searchTerm.toLowerCase()
					results = results.filter(function (app) {
						return (
							app.title.toLowerCase().includes(term) || app.description.toLowerCase().includes(term)
						)
					})
				}

				return results
			})
		)
	}),
	catchError(function (err) {
		console.error('Application query error:', err)
		return from(Promise.resolve([] as Application[]))
	}),
	shareReplay(1)
)

/**
 * 按 mirrorId 分组的 Applications
 */
export const applicationsByMirror$: Observable<Map<string, Application[]>> = from(
	liveQuery(function () {
		return database.application.orderBy('index').toArray()
	})
).pipe(
	map(function (apps) {
		const grouped = new Map<string, Application[]>()
		apps.forEach(function (app) {
			const existing = grouped.get(app.mirrorID) ?? []
			existing.push(app)
			grouped.set(app.mirrorID, existing)
		})
		return grouped
	}),
	shareReplay(1)
)

/**
 * 按组件类型分组的 Applications
 */
export const applicationsByComponent$: Observable<Map<Application.Component, Application[]>> = from(
	liveQuery(function () {
		return database.application.toArray()
	})
).pipe(
	map(function (apps) {
		const grouped = new Map<Application.Component, Application[]>()
		apps.forEach(function (app) {
			const existing = grouped.get(app.component) ?? []
			existing.push(app)
			grouped.set(app.component, existing)
		})
		return grouped
	}),
	shareReplay(1)
)

// ============================================================================
// Zustand Store
// ============================================================================

export const useApplicationStore = create<ApplicationStore>()(
	devtools(
		subscribeWithSelector(
			immer(function (set, get) {
				return {
					// 初始状态
					application: null,
					applications: [],
					loading: false,
					error: null,
					sortOptions: { field: 'index', order: 'asc' },
					filterMirrorId: null,

					// 选择 Application
					selectApplication(id) {
						const apps = get().applications
						const app = id
							? (apps.find(function (a) {
									return a.id === id
								}) ?? null)
							: null
						set({ application: app }, false, 'selectApplication')
						selectedApplication$.next(app)
						applicationEvents$.next({
							type: 'APPLICATION_SELECTED',
							payload: app,
							timestamp: Date.now()
						})
					},

					// 插入 Application (乐观更新)
					async toInsert(data) {
						const id = crypto.randomUUID()
						const now = Date.now()
						const newApp: Application = {
							...data,
							id,
							createdAt: now,
							updatedAt: now
						} as Application

						// 乐观更新
						set(
							function (state) {
								state.applications.push(newApp)
							},
							false,
							'toInsert/optimistic'
						)

						try {
							await database.application.add(newApp)
							applicationEvents$.next({
								type: 'APPLICATION_INSERTED',
								payload: newApp,
								timestamp: now
							})
							return id
						} catch (err) {
							// 回滚
							set(
								function (state) {
									state.applications = state.applications.filter(function (a) {
										return a.id !== id
									})
									state.error = err instanceof Error ? err.message : 'Insert failed'
								},
								false,
								'toInsert/rollback'
							)
							throw err
						}
					},

					// 更新 Application (乐观更新)
					async toUpdate(id, data) {
						const apps = get().applications
						const oldApp = apps.find(function (a) {
							return a.id === id
						})
						if (!oldApp) {
							throw new Error(`Application with id ${id} not found`)
						}

						const now = Date.now()
						const updatedData = { ...data, updatedAt: now }

						// 乐观更新
						set(
							function (state) {
								const index = state.applications.findIndex(function (a) {
									return a.id === id
								})
								if (index !== -1) {
									Object.assign(state.applications[index], updatedData)
								}
								if (state.application?.id === id) {
									Object.assign(state.application, updatedData)
								}
							},
							false,
							'toUpdate/optimistic'
						)

						try {
							await database.application.update(id, updatedData)
							applicationEvents$.next({
								type: 'APPLICATION_UPDATED',
								payload: { id, changes: updatedData },
								timestamp: now
							})
						} catch (err) {
							// 回滚
							set(
								function (state) {
									const index = state.applications.findIndex(function (a) {
										return a.id === id
									})
									if (index !== -1) {
										state.applications[index] = oldApp
									}
									if (state.application?.id === id) {
										state.application = oldApp
									}
									state.error = err instanceof Error ? err.message : 'Update failed'
								},
								false,
								'toUpdate/rollback'
							)
							throw err
						}
					},

					// 删除 Application (乐观更新)
					async toRemove(id) {
						const apps = get().applications
						const oldApp = apps.find(function (a) {
							return a.id === id
						})
						if (!oldApp) return

						// 乐观更新
						set(
							function (state) {
								state.applications = state.applications.filter(function (a) {
									return a.id !== id
								})
								if (state.application?.id === id) {
									state.application = null
								}
							},
							false,
							'toRemove/optimistic'
						)

						try {
							await database.application.delete(id)
							applicationEvents$.next({
								type: 'APPLICATION_REMOVED',
								payload: { id },
								timestamp: Date.now()
							})
						} catch (err) {
							// 回滚
							set(
								function (state) {
									state.applications.push(oldApp)
									state.error = err instanceof Error ? err.message : 'Remove failed'
								},
								false,
								'toRemove/rollback'
							)
							throw err
						}
					},

					// 批量插入
					async toBulkInsert(items) {
						const now = Date.now()
						const newApps = items.map(function (item) {
							return {
								...item,
								id: crypto.randomUUID(),
								createdAt: now,
								updatedAt: now
							} as Application
						})

						// 乐观更新
						set(
							function (state) {
								state.applications.push(...newApps)
							},
							false,
							'toBulkInsert/optimistic'
						)

						try {
							await database.application.bulkAdd(newApps)
							return newApps.map(function (app) {
								return app.id
							})
						} catch (err) {
							// 回滚
							const newIds = new Set(
								newApps.map(function (a) {
									return a.id
								})
							)
							set(
								function (state) {
									state.applications = state.applications.filter(function (a) {
										return !newIds.has(a.id)
									})
								},
								false,
								'toBulkInsert/rollback'
							)
							throw err
						}
					},

					// 批量更新
					async toBulkUpdate(updates) {
						const now = Date.now()

						try {
							await database.transaction('rw', database.application, async function () {
								for (const { id, changes } of updates) {
									await database.application.update(id, { ...changes, updatedAt: now })
								}
							})
						} catch (err) {
							set({ error: err instanceof Error ? err.message : 'Bulk update failed' })
							throw err
						}
					},

					// 批量删除
					async toBulkRemove(ids) {
						const apps = get().applications
						const oldApps = apps.filter(function (a) {
							return ids.includes(a.id)
						})

						// 乐观更新
						set(
							function (state) {
								state.applications = state.applications.filter(function (a) {
									return !ids.includes(a.id)
								})
								if (state.application && ids.includes(state.application.id)) {
									state.application = null
								}
							},
							false,
							'toBulkRemove/optimistic'
						)

						try {
							await database.application.bulkDelete(ids)
						} catch (err) {
							// 回滚
							set(
								function (state) {
									state.applications.push(...oldApps)
								},
								false,
								'toBulkRemove/rollback'
							)
							throw err
						}
					},

					// 重排序 (通过索引位置)
					async toReorder(fromIndex, toIndex) {
						const apps = [...get().applications]
						const [removed] = apps.splice(fromIndex, 1)
						apps.splice(toIndex, 0, removed)

						// 更新所有项的 index
						const updates = apps.map(function (app, index) {
							return { id: app.id, changes: { index } }
						})

						await get().toBulkUpdate(updates)

						applicationEvents$.next({
							type: 'APPLICATIONS_REORDERED',
							payload: { fromIndex, toIndex },
							timestamp: Date.now()
						})
					},

					// 通过 ID 列表重排序
					async toReorderByIds(orderedIds) {
						const now = Date.now()
						const updates = orderedIds.map(function (id, index) {
							return { id, changes: { index, updatedAt: now } }
						})

						await get().toBulkUpdate(updates)

						applicationEvents$.next({
							type: 'APPLICATIONS_REORDERED',
							payload: { orderedIds },
							timestamp: Date.now()
						})
					},

					// 设置过滤 mirrorId
					setFilterMirrorId(mirrorId) {
						set({ filterMirrorId: mirrorId }, false, 'setFilterMirrorId')
						filterMirrorId$.next(mirrorId)
					},

					// 设置排序选项
					setSortOptions(options) {
						set({ sortOptions: options }, false, 'setSortOptions')
						sortOptions$.next(options)
					},

					// 按 mirrorId 获取
					getByMirrorId(mirrorId) {
						return get().applications.filter(function (a) {
							return a.mirrorID === mirrorId
						})
					},

					// 按组件类型获取
					getByComponent(component) {
						return get().applications.filter(function (a) {
							return a.component === component
						})
					},

					// 内部方法
					_setApplications(applications) {
						set({ applications, loading: false, error: null }, false, '_setApplications')
					},

					_setLoading(loading) {
						set({ loading }, false, '_setLoading')
					},

					_setError(error) {
						set({ error, loading: false }, false, '_setError')
					}
				}
			})
		),
		{
			name: 'ApplicationStore',
			enabled: import.meta.env.DEV
		}
	)
)

// ============================================================================
// Dexie 同步
// ============================================================================

let applicationsSubscription: Subscription | null = null

/** 初始化 Dexie 同步 */
export function initApplicationSync(): void {
	applicationsSubscription = from(
		liveQuery(function () {
			return database.application.orderBy('index').toArray()
		})
	)
		.pipe(
			tap(function (applications) {
				useApplicationStore.getState()._setApplications(applications)
				applicationEvents$.next({
					type: 'APPLICATIONS_SYNCED',
					payload: { count: applications.length },
					timestamp: Date.now()
				})
			}),
			catchError(function (err) {
				console.error('Application sync error:', err)
				useApplicationStore.getState()._setError(err.message)
				return from(Promise.resolve([]))
			})
		)
		.subscribe()
}

/** 销毁同步 */
export function destroyApplicationSync(): void {
	applicationsSubscription?.unsubscribe()
	applicationsSubscription = null
}

// ============================================================================
// 选择器 Hooks
// ============================================================================

/** 获取所有 applications */
export const useApplications = function () {
	return useApplicationStore(function (state) {
		return state.applications
	})
}

/** 获取当前选中的 application */
export const useSelectedApplication = function () {
	return useApplicationStore(function (state) {
		return state.application
	})
}

/** 获取加载状态 */
export const useApplicationLoading = function () {
	return useApplicationStore(function (state) {
		return state.loading
	})
}

/** 获取错误状态 */
export const useApplicationError = function () {
	return useApplicationStore(function (state) {
		return state.error
	})
}

/** 按 mirrorId 过滤 applications */
export const useApplicationsByMirrorId = function (mirrorId: string) {
	return useApplicationStore(function (state) {
		return state.applications.filter(function (a) {
			return a.mirrorID === mirrorId
		})
	})
}

/** 按组件类型过滤 applications */
export const useApplicationsByComponent = function (component: Application.Component) {
	return useApplicationStore(function (state) {
		return state.applications.filter(function (a) {
			return a.component === component
		})
	})
}

/** 获取统计信息 */
export const useApplicationStats = function () {
	return useApplicationStore(function (state) {
		const componentCounts = new Map<Application.Component, number>()
		state.applications.forEach(function (app) {
			componentCounts.set(app.component, (componentCounts.get(app.component) ?? 0) + 1)
		})

		return {
			total: state.applications.length,
			byComponent: Object.fromEntries(componentCounts),
			selected: state.application?.title ?? null
		}
	})
}

// ============================================================================
// 订阅工具
// ============================================================================

/** 订阅 applications 变化 */
export function subscribeApplicationsChange(
	callback: (apps: Application[], prevApps: Application[]) => void
): () => void {
	return useApplicationStore.subscribe(
		function (state) {
			return state.applications
		},
		callback,
		{
			equalityFn: function (a, b) {
				return (
					a.length === b.length &&
					a.every(function (app, i) {
						return app.id === b[i]?.id && app.updatedAt === b[i]?.updatedAt
					})
				)
			}
		}
	)
}

/** 监听特定事件 */
export function onApplicationEvent<T = unknown>(
	eventType: ApplicationEventType
): Observable<ApplicationEvent<T>> {
	return applicationEvents$.pipe(
		filter(function (event) {
			return event.type === eventType
		}),
		map(function (event) {
			return event as ApplicationEvent<T>
		})
	)
}

// ============================================================================
// 自动初始化
// ============================================================================

if (typeof window !== 'undefined') {
	initApplicationSync()
	window.addEventListener('beforeunload', destroyApplicationSync)
}
