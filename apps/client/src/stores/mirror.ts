import { type InsertType, type UpdateSpec } from 'dexie'
import { BehaviorSubject, Subject, filter, type Observable } from 'rxjs'
import { map, take, tap } from 'rxjs/operators'
import type { StateCreator } from 'zustand'
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { database } from '@/databases/database.ts'

type ToInsertMirror = InsertType<Mirror, 'id'>

interface ToUpdateMirror {
	key: string
	changes: UpdateSpec<Mirror>
}

interface ToUpdateApplication {
	key: string
	changes: UpdateSpec<Application>
}

export type { ToInsertMirror, ToUpdateApplication, ToUpdateMirror }

type MirrorEventType =
	| 'MIRROR:INSERTED'
	| 'MIRROR:UPDATED'
	| 'MIRROR:REMOVED'
	| 'MIRROR:TOREAD'
	| 'MIRROR:SYNCED'
	| 'APPLICATION:SYNCED'
	| 'APPLICATION:TOREAD'
	| 'APPLICATION:INSERTED'
	| 'APPLICATION:UPDATED'
	| 'APPLICATION:REMOVED'

interface MirrorEvent<T = unknown> {
	type: MirrorEventType
	payload: T
	timestamp: number
}

interface MirrorSlice {
	mirrors: Mirror[]

	// 选择器
	toReadMirror: (ID: string) => Promise<Mirror | null>
	// CRUD 操作
	toInsertMirror: (values: Mirror[]) => Promise<void>
	toUpdateMirror: (values: UpdateSpec<Mirror>[]) => Promise<void>
	toRemoveMirror: (keys: string[]) => Promise<void>

	// 内部方法
	toUpdateMirrors: (mirrors: Mirror[]) => void
}

interface ApplicationSlice {
	applications: Application[]

	toReadApplication: (ID: string) => Promise<Application | null>
	toInsertApplication: (values: Application[]) => Promise<void>
	toUpdateApplication: (values: UpdateSpec<Application>[]) => Promise<void>
	toRemoveApplication: (keys: string[]) => Promise<void>

	toUpdateApplications: (applications: Application[]) => void
}

/** 完整 Store 类型 */
type MirrorStore = MirrorSlice & ApplicationSlice

/** 切片创建器类型 */
type SliceCreator<T> = StateCreator<
	MirrorStore,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
	[],
	T
>

/** 事件总线 - 用于发布/订阅 Mirror 相关事件 */
const event$ = new Subject<MirrorEvent>()

/** 当前选中的 Mirror - 响应式状态 */
const mirror$ = new BehaviorSubject<Mirror | null>(null)

/** 当前选中的 Application - 响应式状态 */
const application$ = new BehaviorSubject<Application | null>(null)

const mirrorSlice: SliceCreator<MirrorSlice> = function (setters, getters) {
	return {
		mirrors: [],

		async toReadMirror(ID: string) {
			const now = Date.now()
			const mirrors = getters().mirrors
			const mirror = mirrors.find(function (m) {
				return m.id === ID
			})

			mirror$.next(mirror ?? null)

			event$.next({
				type: 'MIRROR:TOREAD',
				payload: mirror ?? null,
				timestamp: now
			})

			return mirror ?? null
		},

		async toInsertMirror(values: Mirror[]) {
			const former = structuredClone(getters().mirrors)

			setters(
				function (state) {
					state.mirrors.push(...values)
				},
				false,
				'toInsertMirror/optimistic'
			)

			try {
				const now = Date.now()
				await database.mirror.bulkAdd(values)
				event$.next({
					type: 'MIRROR:INSERTED',
					payload: values,
					timestamp: now
				})
			} catch (error) {
				setters(
					{
						mirrors: former
					},
					false,
					'toInsertMirror/rollback'
				)
				throw error
			}
		},

		async toUpdateMirror(values: UpdateSpec<Mirror>[]) {
			// const former = structuredClone(getters().mirrors)

			const dearthID = values.every(function (v) {
				if (!v.id) return false
				return true
			})
			if (!dearthID) throw new Error('ID is required')
			const mirrors = structuredClone(getters().mirrors)

			const former = mirrors.filter(function (m) {
				return values.some(function (v) {
					return v.id === m.id
				})
			})
			const updates: ToUpdateMirror[] = former.map(function (m) {
				return {
					key: m.id as string,
					changes: {
						...m,
						...values.find(function (v) {
							return v.id === m.id
						})
					}
				}
			})

			setters(
				function (state) {
					state.mirrors = mirrors.map(function (u) {
						const update = values.find(function (v) {
							return v.id === u.id
						})
						if (!update) return u
						return Object.assign({}, u, update)
					})
				},
				false,
				'toUpdateMirror/optimistic'
			)

			try {
				const now = Date.now()
				await database.mirror.bulkUpdate(updates)

				event$.next({
					type: 'MIRROR:UPDATED',
					payload: values,
					timestamp: now
				})
			} catch (error) {
				setters(
					{
						mirrors: mirrors
					},
					false,
					'toUpdateMirror/rollback'
				)
				throw error
			}
		},

		async toRemoveMirror(keys: string[]) {
			const now = Date.now()
			await database.mirror.bulkDelete(keys)

			event$.next({
				type: 'MIRROR:REMOVED',
				payload: keys,
				timestamp: now
			})
		},

		toUpdateMirrors(mirrors) {
			setters(
				{
					mirrors
				},
				false,
				'toUpdateMirrors/SYNCED'
			)

			event$.next({
				type: 'MIRROR:SYNCED',
				payload: {
					mirrors,
					count: mirrors.length
				},
				timestamp: Date.now()
			})
		}
	}
}

const applicationSlice: SliceCreator<ApplicationSlice> = function (setters, getters) {
	return {
		applications: [],

		async toReadApplication(ID: string) {
			const now = Date.now()

			const applications = getters().applications
			const application = applications.find(function (v) {
				return v.id === ID
			})

			application$.next(application ?? null)

			// const response = await database.application.bulkGet(keys)
			// const applications = response.filter(Boolean) as Application[]

			event$.next({
				type: 'APPLICATION:TOREAD',
				payload: application ?? null,
				timestamp: now
			})

			return application ?? null
		},

		async toInsertApplication(values: Application[]) {
			const former = structuredClone(getters().applications)
			setters(
				function (state) {
					state.applications.push(...values)
				},
				false,
				'toInsertApplication/optimistic'
			)
			try {
				const now = Date.now()
				await database.application.bulkAdd(values)
				event$.next({
					type: 'APPLICATION:INSERTED',
					payload: values,
					timestamp: now
				})
			} catch (error) {
				setters(
					function (state) {
						state.applications = former
					},
					false,
					'toInsertApplication/rollback'
				)
				throw error
			}
		},

		async toUpdateApplication(values: UpdateSpec<Application>[]) {
			// 数组方法查找所有项 是否有 ID 没有则抛出错
			const dearthID = values.every(function (v) {
				if (!v.id) return false
				return true
			})

			if (!dearthID) throw new Error('ID is required')

			const applications = structuredClone(getters().applications)
			const former = applications.filter(function (a) {
				return values.some(function (v) {
					return v.id === a.id
				})
			})
			const updates: ToUpdateApplication[] = former.map(function (a) {
				return {
					key: a.id as string,
					changes: {
						...a,
						...values.find(function (v) {
							return v.id === a.id
						})
					}
				}
			})
			setters(
				function (state) {
					state.applications = applications.map(function (u) {
						const update = values.find(function (v) {
							return v.id === u.id
						})
						if (!update) return u
						return Object.assign({}, u, update)
					})
				},
				false,
				'toUpdateApplication/optimistic'
			)
			try {
				const now = Date.now()
				await database.application.bulkUpdate(updates)
				event$.next({
					type: 'APPLICATION:UPDATED',
					payload: values,
					timestamp: now
				})
			} catch (error) {
				setters(
					{
						applications: former
					},
					false,
					'toUpdateApplication/rollback'
				)
				throw error
			}
		},

		async toRemoveApplication(keys: string[]) {
			const applications = structuredClone(getters().applications)
			const former = applications.filter(function (a) {
				return keys.some(function (k) {
					return a.id === k
				})
			})
			setters(
				{
					applications: applications.filter(function (a) {
						return !keys.some(function (k) {
							return a.id !== k
						})
					})
				},
				false,
				'toRemoveApplication/optimistic'
			)
			try {
				const now = Date.now()
				await database.application.bulkDelete(keys)
				event$.next({
					type: 'APPLICATION:REMOVED',
					payload: keys,
					timestamp: now
				})
			} catch (error) {
				setters(
					{
						applications: applications.concat(former)
					},
					false,
					'toRemoveApplication/rollback'
				)
				throw error
			}
		},

		toUpdateApplications(applications) {
			setters(
				{
					applications
				},
				false,
				'toUpdateApplications/optimistic'
			)

			event$.next({
				type: 'APPLICATION:SYNCED',
				payload: {
					applications,
					count: applications.length
				},
				timestamp: Date.now()
			})
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

/** 获取所有 mirrors */
function useMirrors() {
	return useMirrorStore(function (state) {
		return state.mirrors
	})
}

/** 获取所有 applications */
function useApplications() {
	return useMirrorStore(function (state) {
		return state.applications
	})
}

/** 根据 mirrorId 获取 applications */
const useApplicationsByMirrorId = function (mirrorId: string) {
	return useMirrorStore(function (state) {
		return state.applications.filter(function (a) {
			return a.mirrorID === mirrorId
		})
	})
}

/** 获取 mirror 统计信息 */
function useMirrorStats() {
	return useMirrorStore(function (state) {
		return {
			totalMirrors: state.mirrors.length,
			totalApplications: state.applications.length,
			selectedMirror: mirror$?.value?.title ?? null
		}
	})
}

/** 订阅 mirrors 变化 */
function subscribeMirrorsChange(
	callback: (mirrors: Mirror[], prevMirrors: Mirror[]) => void
): () => void {
	return useMirrorStore.subscribe(
		function (state) {
			return state.mirrors
		},
		callback,
		{
			equalityFn(a, b) {
				return (
					a.length === b.length &&
					a.every(function (m, i) {
						return m.id === b[i]?.id
					})
				)
			}
		}
	)
}

/** 订阅选中的 mirror 变化 */
function subscribeMirrorChange(
	callback: (mirror: Mirror | null, prevMirror: Mirror | null) => void
): () => void {
	return useMirrorStore.subscribe(function (state) {
		return mirror$?.value
	}, callback)
}

/** 监听特定类型的事件 */
function onMirrorEvent<T = unknown>(eventType: MirrorEventType): Observable<MirrorEvent<T>> {
	return event$.pipe(
		filter(function (event) {
			return event.type === eventType
		}),
		map(function (event) {
			return event as MirrorEvent<T>
		})
	)
}

/** 获取事件流中的最新 N 条事件 */
function findRecentEvents(count: number): Observable<MirrorEvent[]> {
	const events: MirrorEvent[] = []
	return event$.pipe(
		tap(function (event) {
			events.push(event)
			if (events.length > count) events.shift()
		}),
		map(function () {
			return events
		})
	)
}

/** 等待下一个特定事件 */
function waitForEvent(eventType: MirrorEventType): Promise<MirrorEvent> {
	return new Promise(function (resolve) {
		event$
			.pipe(
				filter(function (e) {
					return e.type === eventType
				}),
				take(1)
			)
			.subscribe(resolve)
	})
}

export {
	application$,
	event$,
	findRecentEvents,
	mirror$,
	onMirrorEvent,
	subscribeMirrorChange,
	subscribeMirrorsChange,
	useApplications,
	useApplicationsByMirrorId,
	useMirrorStats,
	useMirrorStore,
	useMirrors,
	waitForEvent
}
