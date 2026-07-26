// import { database } from '@/databases/database'
// import { liveQuery } from 'dexie'
// import {
//   BehaviorSubject,
//   Subject,
//   combineLatest,
//   from,
//   type Observable,
//   type Subscription
// } from 'rxjs'
// import { catchError, debounceTime, filter, map, shareReplay, switchMap, tap } from 'rxjs/operators'
// import { create } from 'zustand'
// import { devtools, subscribeWithSelector } from 'zustand/middleware'
// import { immer } from 'zustand/middleware/immer'

// // ============================================================================
// // 类型定义
// // ============================================================================

// /** MagneticTile 事件类型 */
// type MagneticTileEventType =
//   | 'MAGNETIC_TILE_INSERTED'
//   | 'MAGNETIC_TILE_UPDATED'
//   | 'MAGNETIC_TILE_REMOVED'
//   | 'MAGNETIC_TILE_SELECTED'
//   | 'MAGNETIC_TILES_SYNCED'
//   | 'MAGNETIC_TILES_REORDERED'

// /** 事件载荷 */
// interface MagneticTileEvent<T = unknown> {
//   type: MagneticTileEventType
//   payload: T
//   timestamp: number
// }

// /** 排序选项 */
// type SortField = 'index' | 'createdAt' | 'updatedAt' | 'title' | 'downloadCount'
// type SortOrder = 'asc' | 'desc'

// interface SortOptions {
//   field: SortField
//   order: SortOrder
// }

// /** Store 状态 */
// interface MagneticTileState {
//   magneticTile: MagneticTile | null
//   magneticTiles: MagneticTile[]
//   loading: boolean
//   error: string | null
//   sortOptions: SortOptions
//   filterMirrorID: string | null
// }

// /** Store Actions */
// interface MagneticTileActions {
//   // 选择
//   selectMagneticTile: (id: string | null) => void

//   // CRUD
//   toInsert: (data: Omit<MagneticTile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
//   toUpdate: (id: string, data: Partial<MagneticTile>) => Promise<void>
//   toRemove: (id: string) => Promise<void>

//   // 批量操作
//   toBulkInsert: (
//     items: Array<Omit<MagneticTile, 'id' | 'createdAt' | 'updatedAt'>>
//   ) => Promise<string[]>
//   toBulkUpdate: (updates: Array<{ id: string; changes: Partial<MagneticTile> }>) => Promise<void>
//   toBulkRemove: (ids: string[]) => Promise<void>

//   // 重排序
//   toReorder: (fromIndex: number, toIndex: number) => Promise<void>
//   toReorderByIds: (orderedIds: string[]) => Promise<void>

//   // 过滤/排序
//   updateFilterMirrorID: (mirrorID: string | null) => void
//   setSortOptions: (options: SortOptions) => void

//   // 查询
//   findByMirrorID: (mirrorID: string) => MagneticTile[]
//   getByComponent: (component: MagneticTile.Component) => MagneticTile[]

//   // 内部方法
//   _setMagneticTiles: (magneticTiles: MagneticTile[]) => void
//   _setLoading: (loading: boolean) => void
//   _setError: (error: string | null) => void
// }

// type MagneticTileStore = MagneticTileState & MagneticTileActions

// // ============================================================================
// // RxJS 响应式状态
// // ============================================================================

// /** 事件总线 */
// export const magneticTileEvents$ = new Subject<MagneticTileEvent>()

// /** 当前选中的 MagneticTile */
// export const selectedMagneticTile$ = new BehaviorSubject<MagneticTile | null>(null)

// /** 过滤条件 - mirrorID */
// export const filterMirrorID$ = new BehaviorSubject<string | null>(null)

// /** 排序条件 */
// export const sortOptions$ = new BehaviorSubject<SortOptions>({
//   field: 'index',
//   order: 'asc'
// })

// /** 搜索关键词 */
// export const magneticTileSearchTerm$ = new BehaviorSubject<string>('')

// /**
//  * 响应式查询 - 根据过滤和排序条件自动更新
//  * 这个 Observable 会在数据库变化、过滤条件变化、排序条件变化时自动更新
//  */
// export const filteredMagneticTiles$: Observable<MagneticTile[]> = combineLatest([
//   filterMirrorID$,
//   sortOptions$,
//   magneticTileSearchTerm$.pipe(debounceTime(300))
// ]).pipe(
//   switchMap(function ([mirrorID, sort, searchTerm]) {
//     return from(
//       liveQuery(async function () {
//         let query = database.magneticTile.orderBy(sort.field)

//         if (sort.order === 'desc') {
//           query = query.reverse()
//         }

//         let results = await query.toArray()

//         // 应用 mirrorID 过滤
//         if (mirrorID) {
//           results = results.filter(function (magneticTile) {
//             return magneticTile.mirrorID === mirrorID
//           })
//         }

//         // 应用搜索过滤
//         if (searchTerm.trim()) {
//           const term = searchTerm.toLowerCase()
//           results = results.filter(function (magneticTile) {
//             return (
//               magneticTile.title.toLowerCase().includes(term) || magneticTile.description.toLowerCase().includes(term)
//             )
//           })
//         }

//         return results
//       })
//     )
//   }),
//   catchError(function (err) {
//     console.error('MagneticTile query error:', err)
//     return from(Promise.resolve([] as MagneticTile[]))
//   }),
//   shareReplay(1)
// )

// /**
//  * 按 mirrorID 分组的 Magnetic Tiles
//  */
// export const magneticTilesByMirror$: Observable<Map<string, MagneticTile[]>> = from(
//   liveQuery(function () {
//     return database.magneticTile.orderBy('index').toArray()
//   })
// ).pipe(
//   map(function (magneticTiles) {
//     const grouped = new Map<string, MagneticTile[]>()
//     magneticTiles.forEach(function (magneticTile) {
//       const existing = grouped.get(magneticTile.mirrorID) ?? []
//       existing.push(magneticTile)
//       grouped.set(magneticTile.mirrorID, existing)
//     })
//     return grouped
//   }),
//   shareReplay(1)
// )

// /**
//  * 按组件类型分组的 Magnetic Tiles
//  */
// export const magneticTilesByComponent$: Observable<Map<MagneticTile.Component, MagneticTile[]>> = from(
//   liveQuery(function () {
//     return database.magneticTile.toArray()
//   })
// ).pipe(
//   map(function (magneticTiles) {
//     const grouped = new Map<MagneticTile.Component, MagneticTile[]>()
//     magneticTiles.forEach(function (magneticTile) {
//       const existing = grouped.get(magneticTile.component) ?? []
//       existing.push(magneticTile)
//       grouped.set(magneticTile.component, existing)
//     })
//     return grouped
//   }),
//   shareReplay(1)
// )

// // ============================================================================
// // Zustand Store
// // ============================================================================

// export const useMagneticTileStore = create<MagneticTileStore>()(
//   devtools(
//     subscribeWithSelector(
//       immer(function (set, get) {
//         return {
//           // 初始状态
//           magneticTile: null,
//           magneticTiles: [],
//           loading: false,
//           error: null,
//           sortOptions: { field: 'index', order: 'asc' },
//           filterMirrorID: null,

//           // 选择 MagneticTile
//           selectMagneticTile(id) {
//             const magneticTiles = get().magneticTiles
//             const magneticTile = id
//               ? (magneticTiles.find(function (a) {
//                   return a.id === id
//                 }) ?? null)
//               : null
//             set({ magneticTile: magneticTile }, false, 'selectMagneticTile')
//             selectedMagneticTile$.next(magneticTile)
//             magneticTileEvents$.next({
//               type: 'MAGNETIC_TILE_SELECTED',
//               payload: magneticTile,
//               timestamp: Date.now()
//             })
//           },

//           // 插入 MagneticTile (乐观更新)
//           async toInsert(data) {
//             const id = crypto.randomUUID()
//             const now = Date.now()
//             const newMagneticTile: MagneticTile = {
//               ...data,
//               id,
//               createdAt: now,
//               updatedAt: now
//             } as MagneticTile

//             // 乐观更新
//             set(
//               function (state) {
//                 state.magneticTiles.push(newMagneticTile)
//               },
//               false,
//               'toInsert/optimistic'
//             )

//             try {
//               await database.magneticTile.add(newMagneticTile)
//               magneticTileEvents$.next({
//                 type: 'MAGNETIC_TILE_INSERTED',
//                 payload: newMagneticTile,
//                 timestamp: now
//               })
//               return id
//             } catch (err) {
//               // 回滚
//               set(
//                 function (state) {
//                   state.magneticTiles = state.magneticTiles.filter(function (a) {
//                     return a.id !== id
//                   })
//                   state.error = err instanceof Error ? err.message : 'Insert failed'
//                 },
//                 false,
//                 'toInsert/rollback'
//               )
//               throw err
//             }
//           },

//           // 更新 MagneticTile (乐观更新)
//           async toUpdate(id, data) {
//             const magneticTiles = get().magneticTiles
//             const oldApp = magneticTiles.find(function (a) {
//               return a.id === id
//             })
//             if (!oldApp) {
//               throw new Error(`MagneticTile with id ${id} not found`)
//             }

//             const now = Date.now()
//             const updatedData = { ...data, updatedAt: now }

//             // 乐观更新
//             set(
//               function (state) {
//                 const index = state.magneticTiles.findIndex(function (a) {
//                   return a.id === id
//                 })
//                 if (index !== -1) {
//                   Object.assign(state.magneticTiles[index], updatedData)
//                 }
//                 if (state.magneticTile?.id === id) {
//                   Object.assign(state.magneticTile, updatedData)
//                 }
//               },
//               false,
//               'toUpdate/optimistic'
//             )

//             try {
//               await database.magneticTile.update(id, updatedData)
//               magneticTileEvents$.next({
//                 type: 'MAGNETIC_TILE_UPDATED',
//                 payload: { id, changes: updatedData },
//                 timestamp: now
//               })
//             } catch (err) {
//               // 回滚
//               set(
//                 function (state) {
//                   const index = state.magneticTiles.findIndex(function (a) {
//                     return a.id === id
//                   })
//                   if (index !== -1) {
//                     state.magneticTiles[index] = oldApp
//                   }
//                   if (state.magneticTile?.id === id) {
//                     state.magneticTile = oldApp
//                   }
//                   state.error = err instanceof Error ? err.message : 'Update failed'
//                 },
//                 false,
//                 'toUpdate/rollback'
//               )
//               throw err
//             }
//           },

//           // 删除 MagneticTile (乐观更新)
//           async toRemove(id) {
//             const magneticTiles = get().magneticTiles
//             const oldApp = magneticTiles.find(function (a) {
//               return a.id === id
//             })
//             if (!oldApp) return

//             // 乐观更新
//             set(
//               function (state) {
//                 state.magneticTiles = state.magneticTiles.filter(function (a) {
//                   return a.id !== id
//                 })
//                 if (state.magneticTile?.id === id) {
//                   state.magneticTile = null
//                 }
//               },
//               false,
//               'toRemove/optimistic'
//             )

//             try {
//               await database.magneticTile.delete(id)
//               magneticTileEvents$.next({
//                 type: 'MAGNETIC_TILE_REMOVED',
//                 payload: { id },
//                 timestamp: Date.now()
//               })
//             } catch (err) {
//               // 回滚
//               set(
//                 function (state) {
//                   state.magneticTiles.push(oldApp)
//                   state.error = err instanceof Error ? err.message : 'Remove failed'
//                 },
//                 false,
//                 'toRemove/rollback'
//               )
//               throw err
//             }
//           },

//           // 批量插入
//           async toBulkInsert(items) {
//             const now = Date.now()
//             const newMagneticTiles = items.map(function (item) {
//               return {
//                 ...item,
//                 id: crypto.randomUUID(),
//                 createdAt: now,
//                 updatedAt: now
//               } as MagneticTile
//             })

//             // 乐观更新
//             set(
//               function (state) {
//                 state.magneticTiles.push(...newMagneticTiles)
//               },
//               false,
//               'toBulkInsert/optimistic'
//             )

//             try {
//               await database.magneticTile.bulkAdd(newMagneticTiles)
//               return newMagneticTiles.map(function (magneticTile) {
//                 return magneticTile.id
//               })
//             } catch (err) {
//               // 回滚
//               const newIds = new Set(
//                 newMagneticTiles.map(function (a) {
//                   return a.id
//                 })
//               )
//               set(
//                 function (state) {
//                   state.magneticTiles = state.magneticTiles.filter(function (a) {
//                     return !newIds.has(a.id)
//                   })
//                 },
//                 false,
//                 'toBulkInsert/rollback'
//               )
//               throw err
//             }
//           },

//           // 批量更新
//           async toBulkUpdate(updates) {
//             const now = Date.now()

//             try {
//               await database.transaction('rw', database.magneticTile, async function () {
//                 for (const { id, changes } of updates) {
//                   await database.magneticTile.update(id, { ...changes, updatedAt: now })
//                 }
//               })
//             } catch (err) {
//               set({ error: err instanceof Error ? err.message : 'Bulk update failed' })
//               throw err
//             }
//           },

//           // 批量删除
//           async toBulkRemove(ids) {
//             const magneticTiles = get().magneticTiles
//             const oldApps = magneticTiles.filter(function (a) {
//               return ids.includes(a.id)
//             })

//             // 乐观更新
//             set(
//               function (state) {
//                 state.magneticTiles = state.magneticTiles.filter(function (a) {
//                   return !ids.includes(a.id)
//                 })
//                 if (state.magneticTile && ids.includes(state.magneticTile.id)) {
//                   state.magneticTile = null
//                 }
//               },
//               false,
//               'toBulkRemove/optimistic'
//             )

//             try {
//               await database.magneticTile.bulkDelete(ids)
//             } catch (err) {
//               // 回滚
//               set(
//                 function (state) {
//                   state.magneticTiles.push(...oldApps)
//                 },
//                 false,
//                 'toBulkRemove/rollback'
//               )
//               throw err
//             }
//           },

//           // 重排序 (通过索引位置)
//           async toReorder(fromIndex, toIndex) {
//             const tiles = [...get().magneticTiles]
//             const [removed] = tiles.splice(fromIndex, 1)
//             tiles.splice(toIndex, 0, removed)

//             // 更新所有项的 index
//             const updates = tiles.map(function (magneticTile, index) {
//               return { id: magneticTile.id, changes: { index } }
//             })

//             await get().toBulkUpdate(updates)

//             magneticTileEvents$.next({
//               type: 'MAGNETIC_TILES_REORDERED',
//               payload: { fromIndex, toIndex },
//               timestamp: Date.now()
//             })
//           },

//           // 通过 ID 列表重排序
//           async toReorderByIds(orderedIds) {
//             const now = Date.now()
//             const updates = orderedIds.map(function (id, index) {
//               return { id, changes: { index, updatedAt: now } }
//             })

//             await get().toBulkUpdate(updates)

//             magneticTileEvents$.next({
//               type: 'MAGNETIC_TILES_REORDERED',
//               payload: { orderedIds },
//               timestamp: Date.now()
//             })
//           },

//           // 设置过滤 mirrorID
//           updateFilterMirrorID(mirrorID) {
//             set({ filterMirrorID: mirrorID }, false, 'updateFilterMirrorID')
//             filterMirrorID$.next(mirrorID)
//           },

//           // 设置排序选项
//           setSortOptions(options) {
//             set({ sortOptions: options }, false, 'setSortOptions')
//             sortOptions$.next(options)
//           },

//           // 按 mirrorID 获取
//           findByMirrorID(mirrorID) {
//             return get().magneticTiles.filter(function (a) {
//               return a.mirrorID === mirrorID
//             })
//           },

//           // 按组件类型获取
//           getByComponent(component) {
//             return get().magneticTiles.filter(function (a) {
//               return a.component === component
//             })
//           },

//           // 内部方法
//           _setMagneticTiles(magneticTiles) {
//             set({ magneticTiles, loading: false, error: null }, false, '_setMagneticTiles')
//           },

//           _setLoading(loading) {
//             set({ loading }, false, '_setLoading')
//           },

//           _setError(error) {
//             set({ error, loading: false }, false, '_setError')
//           }
//         }
//       })
//     ),
//     {
//       name: 'MagneticTileStore',
//       enabled: import.meta.env.DEV
//     }
//   )
// )

// // ============================================================================
// // Dexie 同步
// // ============================================================================

// let magneticTilesSubscription: Subscription | null = null

// /** 初始化 Dexie 同步 */
// export function initMagneticTileSync(): void {
//   magneticTilesSubscription = from(
//     liveQuery(function () {
//       return database.magneticTile.orderBy('index').toArray()
//     })
//   )
//     .pipe(
//       tap(function (magneticTiles) {
//         useMagneticTileStore.getState()._setMagneticTiles(magneticTiles)
//         magneticTileEvents$.next({
//           type: 'MAGNETIC_TILES_SYNCED',
//           payload: { count: magneticTiles.length },
//           timestamp: Date.now()
//         })
//       }),
//       catchError(function (err) {
//         console.error('MagneticTile sync error:', err)
//         useMagneticTileStore.getState()._setError(err.message)
//         return from(Promise.resolve([]))
//       })
//     )
//     .subscribe()
// }

// /** 销毁同步 */
// export function destroyMagneticTileSync(): void {
//   magneticTilesSubscription?.unsubscribe()
//   magneticTilesSubscription = null
// }

// // ============================================================================
// // 选择器 Hooks
// // ============================================================================

// /** 获取所有 magneticTiles */
// export const useMagneticTiles = function () {
//   return useMagneticTileStore(function (state) {
//     return state.magneticTiles
//   })
// }

// /** 获取当前选中的 magneticTile */
// export const useSelectedMagneticTile = function () {
//   return useMagneticTileStore(function (state) {
//     return state.magneticTile
//   })
// }

// /** 获取加载状态 */
// export const useMagneticTileLoading = function () {
//   return useMagneticTileStore(function (state) {
//     return state.loading
//   })
// }

// /** 获取错误状态 */
// export const useMagneticTileError = function () {
//   return useMagneticTileStore(function (state) {
//     return state.error
//   })
// }

// /** 按 mirrorID 过滤 magneticTiles */
// export const useMagneticTilesByMirrorID = function (mirrorID: string) {
//   return useMagneticTileStore(function (state) {
//     return state.magneticTiles.filter(function (a) {
//       return a.mirrorID === mirrorID
//     })
//   })
// }

// /** 按组件类型过滤 magneticTiles */
// export const useMagneticTilesByComponent = function (component: MagneticTile.Component) {
//   return useMagneticTileStore(function (state) {
//     return state.magneticTiles.filter(function (a) {
//       return a.component === component
//     })
//   })
// }

// /** 获取统计信息 */
// export const useMagneticTileStats = function () {
//   return useMagneticTileStore(function (state) {
//     const componentCounts = new Map<MagneticTile.Component, number>()
//     state.magneticTiles.forEach(function (magneticTile) {
//       componentCounts.set(magneticTile.component, (componentCounts.get(magneticTile.component) ?? 0) + 1)
//     })

//     return {
//       total: state.magneticTiles.length,
//       byComponent: Object.fromEntries(componentCounts),
//       selected: state.magneticTile?.title ?? null
//     }
//   })
// }

// // ============================================================================
// // 订阅工具
// // ============================================================================

// /** 订阅 magneticTiles 变化 */
// export function subscribeMagneticTilesChange(
//   callback: (magneticTiles: MagneticTile[], prevMagneticTiles: MagneticTile[]) => void
// ): () => void {
//   return useMagneticTileStore.subscribe(
//     function (state) {
//       return state.magneticTiles
//     },
//     callback,
//     {
//       equalityFn: function (a, b) {
//         return (
//           a.length === b.length &&
//           a.every(function (magneticTile, i) {
//             return magneticTile.id === b[i]?.id && magneticTile.updatedAt === b[i]?.updatedAt
//           })
//         )
//       }
//     }
//   )
// }

// /** 监听特定事件 */
// export function onMagneticTileEvent<T = unknown>(
//   eventType: MagneticTileEventType
// ): Observable<MagneticTileEvent<T>> {
//   return magneticTileEvents$.pipe(
//     filter(function (event) {
//       return event.type === eventType
//     }),
//     map(function (event) {
//       return event as MagneticTileEvent<T>
//     })
//   )
// }

// // ============================================================================
// // 自动初始化
// // ============================================================================

// if (typeof window !== 'undefined') {
//   initMagneticTileSync()
//   window.addEventListener('beforeunload', destroyMagneticTileSync)
// }
