import { database } from '@/databases/database'
import { liveQuery, type UpdateSpec } from 'dexie'
import { BehaviorSubject, Subject, from, type Observable, type Subscription } from 'rxjs'
import {
	catchError,
	debounceTime,
	distinctUntilChanged,
	filter,
	map,
	switchMap,
	take,
	tap
} from 'rxjs/operators'
import type { StateCreator } from 'zustand'
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

type MirrorEventType =
	| 'MIRROR:INSERTED'
	| 'MIRROR:UPDATED'
	| 'MIRROR:REMOVED'
	| 'MIRROR:TOREAD'
	| 'MIRRORS:SYNCED'
	| 'APPLICATION:INSERTED'
	| 'APPLICATION:UPDATED'
	| 'APPLICATION:REMOVED'

interface MirrorEvent<T = unknown> {
	type: MirrorEventType
	payload: T
	timestamp: number
}

interface AsyncState {
	loading: boolean
	error: string | null
}

interface MirrorSlice extends AsyncState {
	mirror: Mirror | null
	mirrors: Mirror[]
}

interface MirrorActions {
	// 选择器
	toReadMirror: (key: string | null) => void
	// CRUD 操作
	toInsertMirror: (value: Omit<Mirror, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
	toUpdateMirror: (key: string, changes: UpdateSpec<Mirror>) => Promise<void>
	toRemoveMirror: (key: string) => Promise<void>
	// 同步
	syncMirror: () => void
	// 内部方法
	_setMirrors: (mirrors: Mirror[]) => void
	_setLoading: (loading: boolean) => void
	_setError: (error: string | null) => void
}

interface ApplicationSlice extends AsyncState {
	application: Application | null
	applications: Application[]
}

interface ApplicationActions {
	toReadApplication: (key: string | null) => void
	toInsertApplication: (
		value: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>
	) => Promise<string>
	toUpdateApplication: (key: string, changes: UpdateSpec<Application>) => Promise<void>
	toRemoveApplication: (key: string) => Promise<void>
	getApplicationsByMirrorId: (mirrorID: string) => Application[]
	syncApplications: () => void
	_setApplications: (applications: Application[]) => void
}

/** 完整 Store 类型 */
type MirrorStore = MirrorSlice & MirrorActions & ApplicationSlice & ApplicationActions

/** 切片创建器类型 */
type SliceCreator<T> = StateCreator<
	MirrorStore,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
	[],
	T
>

/** 事件总线 - 用于发布/订阅 Mirror 相关事件 */
const mirrorEvents$ = new Subject<MirrorEvent>()

/** 当前选中的 Mirror - 响应式状态 */
const mirror$ = new BehaviorSubject<Mirror | null>(null)

/** 当前选中的 Application - 响应式状态 */
const application$ = new BehaviorSubject<Application | null>(null)

const mirrorSlice: SliceCreator<MirrorSlice & MirrorActions> = function (set, get) {
	return {
		mirror: null,
		mirrors: [],
		loading: false,
		error: null,

		toReadMirror(id) {
			const mirrors = get().mirrors

			const mirror = mirrors.find((v) => v.id === id) ?? null

			set({ mirror: mirror }, false, 'toReadMirror')

			mirrorEvents$.next({
				type: 'MIRROR:TOREAD',
				payload: mirror,
				timestamp: Date.now()
			})
		},
		async toInsertMirror(value) {
			const id = crypto.randomUUID()
			const now = Date.now()
			const mirror: Mirror = {
				...value,
				id,
				createdAt: now,
				updatedAt: now
			}

			set(
				function (state) {
					state.mirrors.push(mirror)
				},
				false,
				'toInsertMirror/optimistic'
			)

			try {
				await database.mirror.add(mirror)
				mirrorEvents$.next({
					type: 'MIRROR:INSERTED',
					payload: mirror,
					timestamp: now
				})
				return id
			} catch (error) {
				set(
					function (state) {
						state.mirrors = state.mirrors.filter(function (v) {
							return v.id !== id
						})
						const failed = error instanceof Error
						const message = 'Insert failed'
						state.error = failed ? error.message : message
					},
					false,
					'toInsertMirror/rollback'
				)
				throw error
			}
		},

		async toUpdateMirror(key, changes) {
			const mirrors = get().mirrors
			const mirror = mirrors.find(function (v) {
				return v.id === key
			})

			const msg = `Mirror with id ${key} not found`
			if (!mirror) throw new Error(msg)

			const now = Date.now()
			const updated: UpdateSpec<Mirror> = {
				...changes,
				updatedAt: now
			}

			set(
				function (state) {
					const index = state.mirrors.findIndex(function (v) {
						return v.id === key
					})

					if (index > 0) Object.assign(state.mirrors[index], updated)
					if (state.mirror?.id === key) Object.assign(state.mirror, updated)
				},
				false,
				'toUpdateMirror/optimistic'
			)

			try {
				await database.mirror.update(key, updated)
				mirrorEvents$.next({
					type: 'MIRROR:UPDATED',
					payload: { key, changes: updated },
					timestamp: now
				})
			} catch (error) {
				set(
					function (state) {
						const index = state.mirrors.findIndex(function (v) {
							return v.id === key
						})
						if (index > 0) state.mirrors[index] = mirror
						if (state.mirror?.id === key) state.mirror = mirror

						const failed = error instanceof Error
						const message = 'Update failed'
						state.error = failed ? error.message : message
					},
					false,
					'toUpdateMirror/rollback'
				)

				throw error
			}
		},

		async toRemoveMirror(key) {
			const mirrors = get().mirrors
			const mirror = mirrors.find(function (v) {
				return v.id === key
			})

			if (!mirror) return

			set(
				function (state) {
					state.mirrors = state.mirrors.filter(function (v) {
						return v.id !== key
					})

					if (state.mirror?.id === key) state.mirror = null
				},
				false,
				'toRemoveMirror/optimistic'
			)

			try {
				await database.transaction(
					'rw',
					[database.mirror, database.application],
					async function () {
						await database.mirror.delete(key)
						await database.application.where('mirrorID').equals(key).delete()
					}
				)

				mirrorEvents$.next({
					type: 'MIRROR:REMOVED',
					payload: { id: key },
					timestamp: Date.now()
				})
				get().syncApplications()
			} catch (error) {
				set(
					function (value) {
						value.mirrors.push(mirror)
						const failed = error instanceof Error
						const message = 'Remove failed'
						value.error = failed ? error.message : message
					},
					false,
					'toRemoveMirror/rollback'
				)
			}
		},

		syncMirror() {
			set({ loading: true }, false, 'syncMirror/start')
		},

		_setMirrors(mirrors) {
			set(
				{
					mirrors,
					loading: false,
					error: null
				},
				false,
				'_setMirrors'
			)
		},

		_setLoading(loading) {
			set(
				{
					loading
				},
				false,
				'_setLoading'
			)
		},

		_setError(error) {
			set(
				{
					error,
					loading: false
				},
				false,
				'_setError'
			)
		}
	}
}

const applicationSlice: SliceCreator<ApplicationSlice & ApplicationActions> = function (set, get) {
	return {
		application: null,
		applications: [],
		loading: false,
		error: null,

		toReadApplication(key) {
			const applications = get().applications
			const application = applications.find(function (v) {
				return v.id === key
			})

			set(
				{
					application: application ?? null
				},
				false,
				'toReadApplication'
			)

			application$.next(application ?? null)
		},

		async toInsertApplication(value) {
			const ID = crypto.randomUUID()
			const now = Date.now()
			const application: Application = {
				...value,
				id: ID,
				createdAt: now,
				updatedAt: now
			}

			set(
				function (state) {
					state.applications.push(application)
				},
				false,
				'toInsertApplication/optimistic'
			)

			try {
				await database.application.add(application)
				mirrorEvents$.next({
					type: 'APPLICATION:INSERTED',
					payload: application ?? null,
					timestamp: now
				})
				return ID
			} catch (error) {
				// 回滚
				set(
					function (state) {
						state.applications = state.applications.filter(function (v) {
							return v.id !== ID
						})
					},
					false,
					'toInsertApplication/rollback'
				)
				throw error
			}
		},

		async toUpdateApplication(key, changes) {
			const applications = get().applications
			const application = applications.find(function (v) {
				return v.id === key
			})

			const msg = `Application with id ${key} not found`
			if (!application) throw new Error(msg)

			const now = Date.now()
			const updated: UpdateSpec<Application> = {
				...changes,
				updatedAt: now
			}

			set(
				function (state) {
					const index = state.applications.findIndex(function (a) {
						return a.id === key
					})
					if (index > 0) {
						Object.assign(state.applications[index], updated)
					}
					if (state.application?.id === key) {
						Object.assign(state.application, updated)
					}
				},
				false,
				'toUpdateApplication/optimistic'
			)

			try {
				await database.application.update(key, updated)
				mirrorEvents$.next({
					type: 'APPLICATION:UPDATED',
					payload: { id: key, changes: updated },
					timestamp: now
				})
			} catch (error) {
				// 回滚
				set(
					function (state) {
						const index = state.applications.findIndex(function (v) {
							return v.id === key
						})
						if (index > 0) state.applications[index] = application

						if (state.application?.id === key) state.application = application
					},
					false,
					'toUpdateApplication/rollback'
				)
				throw error
			}
		},

		async toRemoveApplication(key) {
			const applications = get().applications
			const application = applications.find(function (v) {
				return v.id === key
			})
			if (!application) return

			// 乐观更新
			set(
				function (state) {
					state.applications = state.applications.filter(function (v) {
						return v.id !== key
					})
					if (state.application?.id === key) state.application = null
				},
				false,
				'toRemoveApplication/optimistic'
			)

			try {
				await database.application.delete(key)
				mirrorEvents$.next({
					type: 'APPLICATION:REMOVED',
					payload: { id: key },
					timestamp: Date.now()
				})
			} catch (error) {
				// 回滚
				set(
					function (state) {
						state.applications.push(application)
					},
					false,
					'toRemoveApplication/rollback'
				)
				throw error
			}
		},

		// 获取指定 Mirror 下的所有 Applications
		getApplicationsByMirrorId(mirrorId) {
			return get().applications.filter(function (a) {
				return a.mirrorID === mirrorId
			})
		},

		// 从数据库同步
		syncApplications() {
			// 由 liveQuery 订阅处理
		},

		_setApplications(applications) {
			set({ applications }, false, '_setApplications')
		}
	}
}

const useMirrorStore = create<MirrorStore>()(
	devtools(
		subscribeWithSelector(
			immer(function (...args) {
				return {
					...mirrorSlice(...args),
					...applicationSlice(...args)
				}
			})
		),
		{
			name: 'MirrorStore',
			enabled: import.meta.env.DEV
		}
	)
)

interface SubscriptionOptions {
	mirrors: Subscription | null
	applications: Subscription | null
}

const subscription: SubscriptionOptions = {
	mirrors: null,
	applications: null
}

function MirrorsEffect(): void {
	subscription.mirrors = from(liveQuery(() => database.mirror.orderBy('index').toArray()))
		.pipe(
			tap(function (mirrors) {
				useMirrorStore.getState()._setMirrors(mirrors)
				mirrorEvents$.next({
					type: 'MIRRORS:SYNCED',
					payload: { count: mirrors.length },
					timestamp: Date.now()
				})
			}),
			catchError(function (error) {
				console.error('Failed to sync mirrors:', error)
				useMirrorStore.getState()._setError(error.message)
				return from(Promise.resolve([]))
			})
		)
		.subscribe()

	subscription.applications = from(
		liveQuery(function () {
			return database.application.orderBy('index').toArray()
		})
	)
		.pipe(
			tap(function (applications) {
				useMirrorStore.getState()._setApplications(applications)
			}),
			catchError(function (error) {
				console.error('Failed to sync applications:', error)
				useMirrorStore.getState()._setError(error.message)
				return from(Promise.resolve([]))
			})
		)
		.subscribe()
}

/** 销毁 Dexie 同步 */
function DestroyMirrorsEffect(): void {
	subscription.mirrors?.unsubscribe()
	subscription.applications?.unsubscribe()
	subscription.mirrors = null
	subscription.applications = null
}

export { mirrorEvents$, mirror$, application$, useMirrorStore }
