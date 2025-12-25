import { database } from '@/databases/database'
import { liveQuery } from 'dexie'
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

// ============================================================================
// 类型定义
// ============================================================================

/** Mirror 事件类型 */
type MirrorEventType =
  | 'MIRROR_INSERTED'
  | 'MIRROR_UPDATED'
  | 'MIRROR_REMOVED'
  | 'MIRROR_SELECTED'
  | 'MIRRORS_SYNCED'
  | 'APPLICATION_INSERTED'
  | 'APPLICATION_UPDATED'
  | 'APPLICATION_REMOVED'

/** 事件载荷 */
interface MirrorEvent<T = unknown> {
  type: MirrorEventType
  payload: T
  timestamp: number
}

/** 异步操作状态 */
interface AsyncState {
  loading: boolean
  error: string | null
}

/** Mirror 切片状态 */
interface MirrorSliceState extends AsyncState {
  mirror: Mirror | null
  mirrors: Mirror[]
}

/** Mirror 切片 Actions */
interface MirrorSliceActions {
  // 选择器
  selectMirror: (id: string | null) => void
  // CRUD 操作
  toInsertMirror: (data: Omit<Mirror, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  toUpdateMirror: (id: string, data: Partial<Mirror>) => Promise<void>
  toRemoveMirror: (id: string) => Promise<void>
  toBulkUpdateMirrors: (updates: Array<{ id: string; changes: Partial<Mirror> }>) => Promise<void>
  // 同步
  syncMirrorsFromDatabase: () => void
  // 内部方法
  _setMirrors: (mirrors: Mirror[]) => void
  _setLoading: (loading: boolean) => void
  _setError: (error: string | null) => void
}

/** Application 切片状态 */
interface ApplicationSliceState extends AsyncState {
  application: Application | null
  applications: Application[]
}

/** Application 切片 Actions */
interface ApplicationSliceActions {
  selectApplication: (id: string | null) => void
  toInsertApplication: (
    data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>
  toUpdateApplication: (id: string, data: Partial<Application>) => Promise<void>
  toRemoveApplication: (id: string) => Promise<void>
  getApplicationsByMirrorId: (mirrorId: string) => Application[]
  syncApplicationsFromDatabase: () => void
  _setApplications: (applications: Application[]) => void
}

/** 完整 Store 类型 */
type MirrorStore = MirrorSliceState &
  MirrorSliceActions &
  ApplicationSliceState &
  ApplicationSliceActions

/** 切片创建器类型 */
type SliceCreator<T> = StateCreator<
  MirrorStore,
  [['zustand/devtools', never], ['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
  [],
  T
>

// ============================================================================
// RxJS 事件总线 - 跨组件通信
// ============================================================================

/** 事件总线 - 用于发布/订阅 Mirror 相关事件 */
export const mirrorEvents$ = new Subject<MirrorEvent>()

/** 当前选中的 Mirror - 响应式状态 */
export const selectedMirror$ = new BehaviorSubject<Mirror | null>(null)

/** 当前选中的 Application - 响应式状态 */
export const selectedApplication$ = new BehaviorSubject<Application | null>(null)

/** 搜索关键词 - 防抖处理 */
export const mirrorSearchTerm$ = new BehaviorSubject<string>('')

/** 过滤后的 Mirrors - 基于搜索词 */
export const filteredMirrors$: Observable<Mirror[]> = mirrorSearchTerm$.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(function (term) {
    return from(
      liveQuery(function () {
        if (!term.trim()) {
          return database.mirror.orderBy('index').toArray()
        }
        return database.mirror
          .filter(function (mirror) {
            return (
              mirror.title.toLowerCase().includes(term.toLowerCase()) ||
              mirror.description.toLowerCase().includes(term.toLowerCase())
            )
          })
          .toArray()
      })
    )
  }),
  catchError(function (err) {
    console.error('Mirror search error:', err)
    return from(Promise.resolve([] as Mirror[]))
  })
)

// ============================================================================
// Mirror 切片
// ============================================================================

const createMirrorSlice: SliceCreator<MirrorSliceState & MirrorSliceActions> = function (set, get) {
  return {
    // 状态
    mirror: null,
    mirrors: [],
    loading: false,
    error: null,

    // 选择 Mirror
    selectMirror(id) {
      const mirrors = get().mirrors
      const mirror = id
        ? (mirrors.find(function (m) {
            return m.id === id
          }) ?? null)
        : null
      set({ mirror }, false, 'selectMirror')
      selectedMirror$.next(mirror)
      mirrorEvents$.next({
        type: 'MIRROR_SELECTED',
        payload: mirror,
        timestamp: Date.now()
      })
    },

    // 插入 Mirror (乐观更新)
    async toInsertMirror(data) {
      const id = crypto.randomUUID()
      const now = Date.now()
      const newMirror: Mirror = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now
      } as Mirror

      // 乐观更新
      set(
        function (state) {
          state.mirrors.push(newMirror)
        },
        false,
        'toInsertMirror/optimistic'
      )

      try {
        await database.mirror.add(newMirror)
        mirrorEvents$.next({
          type: 'MIRROR_INSERTED',
          payload: newMirror,
          timestamp: now
        })
        return id
      } catch (err) {
        // 回滚
        set(
          function (state) {
            state.mirrors = state.mirrors.filter(function (m) {
              return m.id !== id
            })
            state.error = err instanceof Error ? err.message : 'Insert failed'
          },
          false,
          'toInsertMirror/rollback'
        )
        throw err
      }
    },

    // 更新 Mirror (乐观更新)
    async toUpdateMirror(id, data) {
      const mirrors = get().mirrors
      const oldMirror = mirrors.find(function (m) {
        return m.id === id
      })
      if (!oldMirror) {
        throw new Error(`Mirror with id ${id} not found`)
      }

      const now = Date.now()
      const updatedData = { ...data, updatedAt: now }

      // 乐观更新
      set(
        function (state) {
          const index = state.mirrors.findIndex(function (m) {
            return m.id === id
          })
          if (index !== -1) {
            Object.assign(state.mirrors[index], updatedData)
          }
          if (state.mirror?.id === id) {
            Object.assign(state.mirror, updatedData)
          }
        },
        false,
        'toUpdateMirror/optimistic'
      )

      try {
        await database.mirror.update(id, updatedData)
        mirrorEvents$.next({
          type: 'MIRROR_UPDATED',
          payload: { id, changes: updatedData },
          timestamp: now
        })
      } catch (err) {
        // 回滚
        set(
          function (state) {
            const index = state.mirrors.findIndex(function (m) {
              return m.id === id
            })
            if (index !== -1) {
              state.mirrors[index] = oldMirror
            }
            if (state.mirror?.id === id) {
              state.mirror = oldMirror
            }
            state.error = err instanceof Error ? err.message : 'Update failed'
          },
          false,
          'toUpdateMirror/rollback'
        )
        throw err
      }
    },

    // 删除 Mirror (乐观更新)
    async toRemoveMirror(id) {
      const mirrors = get().mirrors
      const oldMirror = mirrors.find(function (m) {
        return m.id === id
      })
      if (!oldMirror) return

      // 乐观更新
      set(
        function (state) {
          state.mirrors = state.mirrors.filter(function (m) {
            return m.id !== id
          })
          if (state.mirror?.id === id) {
            state.mirror = null
          }
        },
        false,
        'toRemoveMirror/optimistic'
      )

      try {
        // 使用事务同时删除相关的 Applications
        await database.transaction(
          'rw',
          [database.mirror, database.application],
          async function () {
            await database.mirror.delete(id)
            await database.application.where('mirrorID').equals(id).delete()
          }
        )

        mirrorEvents$.next({
          type: 'MIRROR_REMOVED',
          payload: { id },
          timestamp: Date.now()
        })

        // 同步删除 applications
        get().syncApplicationsFromDatabase()
      } catch (err) {
        // 回滚
        set(
          function (state) {
            state.mirrors.push(oldMirror)
            state.error = err instanceof Error ? err.message : 'Remove failed'
          },
          false,
          'toRemoveMirror/rollback'
        )
        throw err
      }
    },

    // 批量更新 Mirrors
    async toBulkUpdateMirrors(updates) {
      const now = Date.now()

      try {
        await database.transaction('rw', database.mirror, async function () {
          for (const { id, changes } of updates) {
            await database.mirror.update(id, { ...changes, updatedAt: now })
          }
        })
        // liveQuery 会自动同步
      } catch (err) {
        set({ error: err instanceof Error ? err.message : 'Bulk update failed' })
        throw err
      }
    },

    // 从数据库同步
    syncMirrorsFromDatabase() {
      set({ loading: true }, false, 'syncMirrorsFromDatabase/start')
    },

    // 内部方法
    _setMirrors(mirrors) {
      set({ mirrors, loading: false, error: null }, false, '_setMirrors')
    },

    _setLoading(loading) {
      set({ loading }, false, '_setLoading')
    },

    _setError(error) {
      set({ error, loading: false }, false, '_setError')
    }
  }
}

// ============================================================================
// Application 切片
// ============================================================================

const createApplicationSlice: SliceCreator<ApplicationSliceState & ApplicationSliceActions> =
  function (set, get) {
    return {
      // 状态
      application: null,
      applications: [],
      loading: false,
      error: null,

      // 选择 Application
      selectApplication(id) {
        const applications = get().applications
        const application = id
          ? (applications.find(function (a) {
              return a.id === id
            }) ?? null)
          : null
        set({ application }, false, 'selectApplication')
        selectedApplication$.next(application)
      },

      // 插入 Application
      async toInsertApplication(data) {
        const id = crypto.randomUUID()
        const now = Date.now()
        const newApplication: Application = {
          ...data,
          id,
          createdAt: now,
          updatedAt: now
        } as Application

        // 乐观更新
        set(
          function (state) {
            state.applications.push(newApplication)
          },
          false,
          'toInsertApplication/optimistic'
        )

        try {
          await database.application.add(newApplication)
          mirrorEvents$.next({
            type: 'APPLICATION_INSERTED',
            payload: newApplication,
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
            },
            false,
            'toInsertApplication/rollback'
          )
          throw err
        }
      },

      // 更新 Application
      async toUpdateApplication(id, data) {
        const applications = get().applications
        const oldApplication = applications.find(function (a) {
          return a.id === id
        })
        if (!oldApplication) {
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
          'toUpdateApplication/optimistic'
        )

        try {
          await database.application.update(id, updatedData)
          mirrorEvents$.next({
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
                state.applications[index] = oldApplication
              }
              if (state.application?.id === id) {
                state.application = oldApplication
              }
            },
            false,
            'toUpdateApplication/rollback'
          )
          throw err
        }
      },

      // 删除 Application
      async toRemoveApplication(id) {
        const applications = get().applications
        const oldApplication = applications.find(function (a) {
          return a.id === id
        })
        if (!oldApplication) return

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
          'toRemoveApplication/optimistic'
        )

        try {
          await database.application.delete(id)
          mirrorEvents$.next({
            type: 'APPLICATION_REMOVED',
            payload: { id },
            timestamp: Date.now()
          })
        } catch (err) {
          // 回滚
          set(
            function (state) {
              state.applications.push(oldApplication)
            },
            false,
            'toRemoveApplication/rollback'
          )
          throw err
        }
      },

      // 获取指定 Mirror 下的所有 Applications
      getApplicationsByMirrorId(mirrorId) {
        return get().applications.filter(function (a) {
          return a.mirrorID === mirrorId
        })
      },

      // 从数据库同步
      syncApplicationsFromDatabase() {
        // 由 liveQuery 订阅处理
      },

      // 内部方法
      _setApplications(applications) {
        set({ applications }, false, '_setApplications')
      }
    }
  }

// ============================================================================
// 创建 Store
// ============================================================================

export const useMirrorStore = create<MirrorStore>()(
  devtools(
    subscribeWithSelector(
      immer(function (...args) {
        return {
          ...createMirrorSlice(...args),
          ...createApplicationSlice(...args)
        }
      })
    ),
    {
      name: 'MirrorStore',
      enabled: import.meta.env.DEV
    }
  )
)

// ============================================================================
// Dexie LiveQuery 订阅 - 自动同步数据库变化到 Store
// ============================================================================

let mirrorsSubscription: Subscription | null = null
let applicationsSubscription: Subscription | null = null

/** 初始化 Dexie 同步 */
export function initDexieSync(): void {
  // 订阅 Mirrors 变化
  mirrorsSubscription = from(
    liveQuery(function () {
      return database.mirror.orderBy('index').toArray()
    })
  )
    .pipe(
      tap(function (mirrors) {
        useMirrorStore.getState()._setMirrors(mirrors)
        mirrorEvents$.next({
          type: 'MIRRORS_SYNCED',
          payload: { count: mirrors.length },
          timestamp: Date.now()
        })
      }),
      catchError(function (err) {
        console.error('Mirror sync error:', err)
        useMirrorStore.getState()._setError(err.message)
        return from(Promise.resolve([]))
      })
    )
    .subscribe()

  // 订阅 Applications 变化
  applicationsSubscription = from(
    liveQuery(function () {
      return database.application.orderBy('index').toArray()
    })
  )
    .pipe(
      tap(function (applications) {
        useMirrorStore.getState()._setApplications(applications)
      }),
      catchError(function (err) {
        console.error('Application sync error:', err)
        return from(Promise.resolve([]))
      })
    )
    .subscribe()
}

/** 销毁 Dexie 同步 */
export function destroyDexieSync(): void {
  mirrorsSubscription?.unsubscribe()
  applicationsSubscription?.unsubscribe()
  mirrorsSubscription = null
  applicationsSubscription = null
}

// ============================================================================
// 高级选择器 (Selectors) - 避免不必要的重渲染
// ============================================================================

/** 获取所有 mirrors */
export const useMirrors = function () {
  return useMirrorStore(function (state) {
    return state.mirrors
  })
}

/** 获取当前选中的 mirror */
export const useSelectedMirror = function () {
  return useMirrorStore(function (state) {
    return state.mirror
  })
}

/** 获取所有 applications */
export const useApplications = function () {
  return useMirrorStore(function (state) {
    return state.applications
  })
}

/** 获取当前选中的 application */
export const useSelectedApplication = function () {
  return useMirrorStore(function (state) {
    return state.application
  })
}

/** 获取加载状态 */
export const useLoading = function () {
  return useMirrorStore(function (state) {
    return state.loading
  })
}

/** 获取错误状态 */
export const useError = function () {
  return useMirrorStore(function (state) {
    return state.error
  })
}

/** 根据 mirrorId 获取 applications */
export const useApplicationsByMirrorId = function (mirrorId: string) {
  return useMirrorStore(function (state) {
    return state.applications.filter(function (a) {
      return a.mirrorID === mirrorId
    })
  })
}

/** 获取 mirror 统计信息 */
export const useMirrorStats = function () {
  return useMirrorStore(function (state) {
    return {
      totalMirrors: state.mirrors.length,
      totalApplications: state.applications.length,
      selectedMirror: state.mirror?.title ?? null
    }
  })
}

// ============================================================================
// Zustand subscribeWithSelector - 精细化订阅
// ============================================================================

/** 订阅 mirrors 变化 */
export function subscribeMirrorsChange(
  callback: (mirrors: Mirror[], prevMirrors: Mirror[]) => void
): () => void {
  return useMirrorStore.subscribe(
    function (state) {
      return state.mirrors
    },
    callback,
    {
      equalityFn: function (a, b) {
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
export function subscribeSelectedMirrorChange(
  callback: (mirror: Mirror | null, prevMirror: Mirror | null) => void
): () => void {
  return useMirrorStore.subscribe(function (state) {
    return state.mirror
  }, callback)
}

// ============================================================================
// RxJS 工具函数
// ============================================================================

/** 监听特定类型的事件 */
export function onMirrorEvent<T = unknown>(eventType: MirrorEventType): Observable<MirrorEvent<T>> {
  return mirrorEvents$.pipe(
    filter(function (event) {
      return event.type === eventType
    }),
    map(function (event) {
      return event as MirrorEvent<T>
    })
  )
}

/** 获取事件流中的最新 N 条事件 */
export function getRecentEvents(count: number): Observable<MirrorEvent[]> {
  const events: MirrorEvent[] = []
  return mirrorEvents$.pipe(
    tap(function (event) {
      events.push(event)
      if (events.length > count) {
        events.shift()
      }
    }),
    map(function () {
      return [...events]
    })
  )
}

/** 等待下一个特定事件 */
export function waitForEvent(eventType: MirrorEventType): Promise<MirrorEvent> {
  return new Promise(function (resolve) {
    mirrorEvents$
      .pipe(
        filter(function (e) {
          return e.type === eventType
        }),
        take(1)
      )
      .subscribe(resolve)
  })
}

// ============================================================================
// 自动初始化
// ============================================================================

// 在模块加载时自动初始化同步
if (typeof window !== 'undefined') {
  initDexieSync()

  // 页面卸载时清理
  window.addEventListener('beforeunload', destroyDexieSync)
}
