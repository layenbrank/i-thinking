# Zustand + Dexie + RxJS 高级用法指南

本文档详细介绍了项目中 Zustand 状态管理的高级用法，以及如何与 Dexie (IndexedDB) 和 RxJS 集成。

## 目录

- [架构概览](#架构概览)
- [核心概念](#核心概念)
- [文件结构](#文件结构)
- [Mirror Store 详解](#mirror-store-详解)
- [Application Store 详解](#application-store-详解)
- [Dexie 同步工具](#dexie-同步工具)
- [RxJS 桥接工具](#rxjs-桥接工具)
- [使用示例](#使用示例)
- [最佳实践](#最佳实践)

---

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Layer                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React     │  │  Selectors  │  │   RxJS Subscriptions    │  │
│  │ Components  │  │   Hooks     │  │   (useEffect)           │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
└─────────┼────────────────┼──────────────────────┼────────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Zustand Store                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Middleware Chain                       │    │
│  │  ┌─────────┐  ┌──────────────────┐  ┌────────────────┐  │    │
│  │  │devtools │→ │subscribeWithSel  │→ │     immer      │  │    │
│  │  └─────────┘  └──────────────────┘  └────────────────┘  │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │    Mirror Slice    │  │  Application Slice │                 │
│  │  - state           │  │  - state           │                 │
│  │  - actions         │  │  - actions         │                 │
│  └─────────┬──────────┘  └──────────┬─────────┘                 │
│            │                        │                            │
└────────────┼────────────────────────┼────────────────────────────┘
             │                        │
             ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Dexie (IndexedDB)                     │    │
│  │  ┌─────────┐  ┌─────────────┐  ┌──────────────────┐     │    │
│  │  │ mirror  │  │ application │  │ other tables...  │     │    │
│  │  └─────────┘  └─────────────┘  └──────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 RxJS Event Streams                       │    │
│  │  mirrorEvents$  selectedMirror$  filteredMirrors$       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 核心概念

### 1. 中间件链 (Middleware Chain)

```typescript
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

const useStore = create<StoreType>()(
	devtools(
		// 1. DevTools 支持
		subscribeWithSelector(
			// 2. 精细化订阅
			immer((set, get) => ({
				// 3. 不可变更新
				// state & actions
			}))
		),
		{ name: 'StoreName' }
	)
)
```

| 中间件                  | 作用                       |
| ----------------------- | -------------------------- |
| `devtools`              | 支持 Redux DevTools 调试   |
| `subscribeWithSelector` | 允许订阅状态的特定部分     |
| `immer`                 | 使用可变语法编写不可变更新 |

### 2. 切片模式 (Slices Pattern)

将大型 Store 拆分为独立的切片，提高可维护性：

```typescript
// 定义切片类型
type SliceCreator<T> = StateCreator<
	FullStore,
	[['zustand/devtools', never], ['zustand/subscribeWithSelector', never], ['zustand/immer', never]],
	[],
	T
>

// Mirror 切片
const createMirrorSlice: SliceCreator<MirrorSlice> = (set, get) => ({
	mirror: null,
	mirrors: [],
	selectMirror: (id) => {
		/* ... */
	},
	toInsertMirror: async (data) => {
		/* ... */
	}
})

// Application 切片
const createApplicationSlice: SliceCreator<ApplicationSlice> = (set, get) => ({
	application: null,
	applications: [],
	selectApplication: (id) => {
		/* ... */
	}
})

// 合并切片
const useStore = create<FullStore>()(
	devtools(
		subscribeWithSelector(
			immer((...args) => ({
				...createMirrorSlice(...args),
				...createApplicationSlice(...args)
			}))
		)
	)
)
```

### 3. 乐观更新 (Optimistic Updates)

在等待服务器响应前先更新 UI，失败时回滚：

```typescript
async toInsertMirror(data) {
  const id = crypto.randomUUID()
  const newMirror = { ...data, id }

  // 1. 乐观更新 - 立即更新 UI
  set(
    (state) => { state.mirrors.push(newMirror) },
    false,
    'toInsertMirror/optimistic'
  )

  try {
    // 2. 持久化到数据库
    await database.mirror.add(newMirror)
    return id
  } catch (err) {
    // 3. 失败时回滚
    set(
      (state) => {
        state.mirrors = state.mirrors.filter(m => m.id !== id)
        state.error = err.message
      },
      false,
      'toInsertMirror/rollback'
    )
    throw err
  }
}
```

---

## 文件结构

```
apps/client/src/stores/
├── index.ts              # 统一导出入口
├── mirror.ts             # Mirror Store (主 Store)
├── application.ts        # Application Store
├── counter.ts            # Counter Store (示例)
└── utils/
    ├── dexie-sync.ts     # Dexie 同步工具
    └── rx-bridge.ts      # RxJS 桥接工具
```

---

## Mirror Store 详解

### 状态定义

```typescript
interface MirrorSliceState {
	mirror: Mirror | null // 当前选中的 Mirror
	mirrors: Mirror[] // 所有 Mirrors
	loading: boolean // 加载状态
	error: string | null // 错误信息
}

interface ApplicationSliceState {
	application: Application | null
	applications: Application[]
	loading: boolean
	error: string | null
}
```

### Actions

| Action                         | 描述          | 乐观更新 |
| ------------------------------ | ------------- | -------- |
| `selectMirror(id)`             | 选择 Mirror   | -        |
| `toInsertMirror(data)`         | 插入新 Mirror | ✅       |
| `toUpdateMirror(id, data)`     | 更新 Mirror   | ✅       |
| `toRemoveMirror(id)`           | 删除 Mirror   | ✅       |
| `toBulkUpdateMirrors(updates)` | 批量更新      | -        |

### RxJS 集成

```typescript
// 事件总线 - 发布/订阅模式
export const mirrorEvents$ = new Subject<MirrorEvent>()

// 响应式状态
export const selectedMirror$ = new BehaviorSubject<Mirror | null>(null)

// 响应式搜索
export const mirrorSearchTerm$ = new BehaviorSubject<string>('')

// 过滤后的 Mirrors (自动响应搜索词变化)
export const filteredMirrors$: Observable<Mirror[]> = mirrorSearchTerm$.pipe(
	debounceTime(300),
	distinctUntilChanged(),
	switchMap((term) =>
		from(
			liveQuery(() => {
				if (!term.trim()) {
					return database.mirror.orderBy('index').toArray()
				}
				return database.mirror
					.filter((m) => m.title.toLowerCase().includes(term.toLowerCase()))
					.toArray()
			})
		)
	),
	catchError(() => of([]))
)
```

### Selectors (选择器)

```typescript
// 基础选择器
export const useMirrors = () => useMirrorStore((state) => state.mirrors)
export const useSelectedMirror = () => useMirrorStore((state) => state.mirror)
export const useLoading = () => useMirrorStore((state) => state.loading)

// 派生选择器
export const useApplicationsByMirrorId = (mirrorId: string) =>
	useMirrorStore((state) => state.applications.filter((a) => a.mirrorID === mirrorId))

// 统计选择器
export const useMirrorStats = () =>
	useMirrorStore((state) => ({
		totalMirrors: state.mirrors.length,
		totalApplications: state.applications.length,
		selectedMirror: state.mirror?.title ?? null
	}))
```

### 订阅工具

```typescript
// 订阅 mirrors 变化 (带自定义相等性比较)
const unsubscribe = subscribeMirrorsChange((mirrors, prevMirrors) => {
	console.log('Mirrors changed:', mirrors)
})

// 订阅选中的 mirror 变化
const unsubscribe = subscribeSelectedMirrorChange((mirror, prevMirror) => {
	console.log('Selected mirror changed:', mirror)
})
```

---

## Application Store 详解

### 特殊功能

#### 响应式过滤和排序

```typescript
// 过滤条件
export const filterMirrorId$ = new BehaviorSubject<string | null>(null)
export const sortOptions$ = new BehaviorSubject<SortOptions>({
	field: 'index',
	order: 'asc'
})

// 组合查询 - 自动响应过滤/排序/搜索变化
export const filteredApplications$: Observable<Application[]> = combineLatest([
	filterMirrorId$,
	sortOptions$,
	applicationSearchTerm$.pipe(debounceTime(300))
]).pipe(
	switchMap(([mirrorId, sort, searchTerm]) =>
		from(
			liveQuery(async () => {
				let query = database.application.orderBy(sort.field)
				if (sort.order === 'desc') query = query.reverse()

				let results = await query.toArray()

				if (mirrorId) {
					results = results.filter((app) => app.mirrorID === mirrorId)
				}

				if (searchTerm.trim()) {
					results = results.filter((app) =>
						app.title.toLowerCase().includes(searchTerm.toLowerCase())
					)
				}

				return results
			})
		)
	)
)
```

#### 分组查询

```typescript
// 按 mirrorId 分组
export const applicationsByMirror$: Observable<Map<string, Application[]>>

// 按组件类型分组
export const applicationsByComponent$: Observable<Map<Application.Component, Application[]>>
```

#### 重排序

```typescript
// 通过索引位置重排序
await store.toReorder(fromIndex, toIndex)

// 通过 ID 列表重排序 (适用于拖拽排序)
await store.toReorderByIds(['id1', 'id2', 'id3'])
```

---

## Dexie 同步工具

### DexieSync 类

封装单表同步逻辑：

```typescript
import { DexieSync } from '@/stores/utils/dexie-sync'

const mirrorSync = new DexieSync(database.mirror, {
	debug: true,
	retryCount: 3,
	onChange: (data) => console.log('Data changed:', data),
	onError: (error) => console.error('Sync error:', error)
})

// 启动同步
mirrorSync.start()

// 获取数据流
mirrorSync.data$.subscribe((mirrors) => {
	console.log('Mirrors:', mirrors)
})

// 获取当前快照
const currentData = mirrorSync.snapshot

// 停止同步
mirrorSync.stop()

// 销毁
mirrorSync.destroy()
```

### 高级查询

```typescript
import {
	createReactiveQuery,
	createPaginatedQuery,
	createFilteredQuery
} from '@/stores/utils/dexie-sync'

// 响应式查询
const deps$ = new BehaviorSubject({ status: 'active' })
const results$ = createReactiveQuery(
	(deps) => database.mirror.where('status').equals(deps.status).toArray(),
	deps$
)

// 分页查询
const pageOptions$ = new BehaviorSubject({ page: 1, pageSize: 10 })
const paginatedResults$ = createPaginatedQuery(database.mirror, pageOptions$)

paginatedResults$.subscribe((result) => {
	console.log('Data:', result.data)
	console.log('Total:', result.total)
	console.log('Has more:', result.hasMore)
})

// 条件查询
const filters$ = new BehaviorSubject([{ field: 'status', operator: 'equals', value: 'active' }])
const filteredResults$ = createFilteredQuery(database.mirror, filters$)
```

### 乐观更新 CRUD

```typescript
import { createOptimisticCRUD } from '@/stores/utils/dexie-sync'

const crud = createOptimisticCRUD(
  database.mirror,
  (data) => store.setState({ mirrors: data }),
  () => store.getState().mirrors
)

// 添加 (乐观更新)
const id = await crud.add({ title: 'New Mirror', ... })

// 更新 (乐观更新)
await crud.update(id, { title: 'Updated Title' })

// 删除 (乐观更新)
await crud.remove(id)

// 批量操作
await crud.bulkAdd([...items])
await crud.bulkUpdate([{ id: '1', changes: {...} }])
await crud.bulkRemove(['id1', 'id2'])
```

### SyncManager

管理多个表的同步：

```typescript
import { syncManager } from '@/stores/utils/dexie-sync'

// 注册表同步
const mirrorSync = syncManager.register('mirror', database.mirror)
const appSync = syncManager.register('application', database.application)

// 启动所有同步
syncManager.startAll()

// 停止所有同步
syncManager.stopAll()

// 销毁
syncManager.destroy()
```

---

## RxJS 桥接工具

### EventBus (事件总线)

类型安全的发布/订阅模式：

```typescript
import { EventBus } from '@/stores/utils/rx-bridge'

// 定义事件类型
interface MyEventMap {
	'user:login': { userId: string }
	'user:logout': { reason: string }
}

const eventBus = new EventBus<MyEventMap>({ debug: true })

// 发布事件
eventBus.emit('user:login', { userId: '123' })

// 订阅事件
eventBus.on('user:login').subscribe((payload) => {
	console.log('User logged in:', payload.userId)
})

// 订阅多个事件
eventBus.onMany(['user:login', 'user:logout']).subscribe((payload) => {
	console.log('Event:', payload)
})

// 等待单次事件
const payload = await eventBus.once('user:login')
```

### CommandBus (命令模式)

支持撤销/重做：

```typescript
import { CommandBus } from '@/stores/utils/rx-bridge'

interface MyCommandMap {
  'mirror:create': { title: string }
  'mirror:delete': { id: string }
}

const commandBus = new CommandBus<MyCommandMap>()

// 执行命令 (支持撤销)
await commandBus.execute('mirror:create', { title: 'New' }, {
  execute: async () => {
    await database.mirror.add({ title: 'New', ... })
  },
  undo: async () => {
    await database.mirror.delete(id)
  }
})

// 撤销
await commandBus.undo()

// 重做
await commandBus.redo()

// 检查状态
console.log('Can undo:', commandBus.canUndo)
console.log('Can redo:', commandBus.canRedo)
```

### Store 桥接

```typescript
import { storeToObservable, observableToStore, createTwoWayBinding } from '@/stores/utils/rx-bridge'

// Store -> Observable
const mirrors$ = storeToObservable(useMirrorStore, {
	selector: (state) => state.mirrors,
	debounce: 100,
	skipInitial: false
})

// Observable -> Store
const subscription = observableToStore(someObservable$, useMirrorStore, (state, value) => ({
	mirrors: value
}))

// 双向绑定
const { value$, destroy } = createTwoWayBinding(
	useMirrorStore,
	(state) => state.searchTerm,
	(state, value) => ({ searchTerm: value }),
	{ debounce: 300 }
)
```

### 状态变化追踪器

```typescript
import { createStateTracker } from '@/stores/utils/rx-bridge'

const { changes$, history$, undo, redo, canUndo$, canRedo$, destroy } = createStateTracker(
	useMirrorStore,
	{
		maxHistory: 50,
		trackFields: ['mirrors', 'applications']
	}
)

// 监听变化
changes$.subscribe((change) => {
	console.log('Changed from:', change.previous)
	console.log('Changed to:', change.current)
	console.log('Diff:', change.diff)
})

// 撤销/重做
undo()
redo()

// 响应式状态
canUndo$.subscribe((canUndo) => {
	console.log('Can undo:', canUndo)
})
```

### 数据流操作符

```typescript
import {
	batchProcess,
	retryWithBackoff,
	concurrentLimit,
	debounceDistinct
} from '@/stores/utils/rx-bridge'

// 批量处理
source$.pipe(batchProcess(1000, (items) => console.log('Batch:', items)))

// 指数退避重试
source$.pipe(
	retryWithBackoff(3, 1000) // 最多重试3次，初始延迟1秒
)

// 并发控制
source$.pipe(
	concurrentLimit((item) => fetchData(item), 3) // 最多3个并发
)

// 防抖 + 去重
source$.pipe(debounceDistinct(300))
```

---

## 使用示例

### 基础使用

```tsx
import { useMirrors, useSelectedMirror, useMirrorStore } from '@/stores'

function MirrorList() {
	const mirrors = useMirrors()
	const selectedMirror = useSelectedMirror()
	const { selectMirror, toInsertMirror, toRemoveMirror } = useMirrorStore()

	const handleAdd = async () => {
		const id = await toInsertMirror({
			title: 'New Mirror',
			description: '',
			index: mirrors.length
			// ... other fields
		})
		selectMirror(id)
	}

	const handleDelete = async (id: string) => {
		await toRemoveMirror(id)
	}

	return (
		<div>
			{mirrors.map((mirror) => (
				<div
					key={mirror.id}
					className={mirror.id === selectedMirror?.id ? 'selected' : ''}
					onClick={() => selectMirror(mirror.id)}
				>
					{mirror.title}
					<button onClick={() => handleDelete(mirror.id)}>Delete</button>
				</div>
			))}
			<button onClick={handleAdd}>Add Mirror</button>
		</div>
	)
}
```

### RxJS 订阅

```tsx
import { useEffect } from 'react'
import { mirrorEvents$, filteredMirrors$, mirrorSearchTerm$ } from '@/stores'

function MirrorSearch() {
	const [results, setResults] = useState<Mirror[]>([])

	useEffect(() => {
		// 订阅过滤结果
		const subscription = filteredMirrors$.subscribe(setResults)
		return () => subscription.unsubscribe()
	}, [])

	useEffect(() => {
		// 监听事件
		const subscription = mirrorEvents$
			.pipe(filter((e) => e.type === 'MIRROR_INSERTED'))
			.subscribe((event) => {
				console.log('New mirror created:', event.payload)
			})
		return () => subscription.unsubscribe()
	}, [])

	return (
		<div>
			<input placeholder="Search..." onChange={(e) => mirrorSearchTerm$.next(e.target.value)} />
			{results.map((mirror) => (
				<div key={mirror.id}>{mirror.title}</div>
			))}
		</div>
	)
}
```

### 全局事件总线

```typescript
import { appEventBus, appCommandBus } from '@/stores'

// 发布事件
appEventBus.emit('mirror:created', { id: '123', mirror })

// 订阅事件
appEventBus.on('system:notification').subscribe(({ type, message }) => {
	showNotification(type, message)
})

// 执行可撤销命令
await appCommandBus.execute('mirror:create', mirrorData, {
	execute: () => database.mirror.add(mirrorData),
	undo: () => database.mirror.delete(mirrorData.id)
})
```

---

## 最佳实践

### 1. 选择器性能优化

```typescript
// ❌ 避免：每次渲染都创建新对象
const data = useMirrorStore((state) => ({
	mirrors: state.mirrors,
	count: state.mirrors.length
}))

// ✅ 推荐：使用 shallow 比较或拆分选择器
import { shallow } from 'zustand/shallow'

const { mirrors, count } = useMirrorStore(
	(state) => ({ mirrors: state.mirrors, count: state.mirrors.length }),
	shallow
)

// 或者拆分
const mirrors = useMirrors()
const count = useMirrorStore((state) => state.mirrors.length)
```

### 2. 避免不必要的订阅

```typescript
// ❌ 避免：订阅整个状态
useMirrorStore.subscribe((state) => {
	console.log('Any change:', state)
})

// ✅ 推荐：使用 subscribeWithSelector
useMirrorStore.subscribe(
	(state) => state.mirrors,
	(mirrors, prevMirrors) => {
		console.log('Mirrors changed:', mirrors)
	}
)
```

### 3. 组件外部访问 Store

```typescript
// 在 React 组件外部获取状态
const mirrors = useMirrorStore.getState().mirrors

// 在 React 组件外部更新状态
useMirrorStore.getState().toInsertMirror(data)
```

### 4. 清理订阅

```tsx
useEffect(() => {
	const subscription = someObservable$.subscribe(handler)
	return () => subscription.unsubscribe()
}, [])
```

### 5. 类型安全

```typescript
// 定义严格的事件类型
interface AppEventMap {
	'mirror:created': { id: string; mirror: Mirror }
	'mirror:updated': { id: string; changes: Partial<Mirror> }
}

// 类型会自动推断
appEventBus.on('mirror:created').subscribe(({ id, mirror }) => {
	// id: string, mirror: Mirror - 类型安全
})
```

---

## API 参考

### useMirrorStore

| 方法                  | 参数                                                     | 返回值            | 描述        |
| --------------------- | -------------------------------------------------------- | ----------------- | ----------- |
| `selectMirror`        | `id: string \| null`                                     | `void`            | 选择 Mirror |
| `toInsertMirror`      | `data: Omit<Mirror, 'id' \| 'createdAt' \| 'updatedAt'>` | `Promise<string>` | 插入 Mirror |
| `toUpdateMirror`      | `id: string, data: Partial<Mirror>`                      | `Promise<void>`   | 更新 Mirror |
| `toRemoveMirror`      | `id: string`                                             | `Promise<void>`   | 删除 Mirror |
| `toBulkUpdateMirrors` | `updates: Array<{id, changes}>`                          | `Promise<void>`   | 批量更新    |

### useApplicationStore

| 方法                | 参数                                     | 返回值            | 描述             |
| ------------------- | ---------------------------------------- | ----------------- | ---------------- |
| `selectApplication` | `id: string \| null`                     | `void`            | 选择 Application |
| `toInsert`          | `data: Omit<Application, ...>`           | `Promise<string>` | 插入             |
| `toUpdate`          | `id: string, data: Partial<Application>` | `Promise<void>`   | 更新             |
| `toRemove`          | `id: string`                             | `Promise<void>`   | 删除             |
| `toReorder`         | `fromIndex: number, toIndex: number`     | `Promise<void>`   | 重排序           |
| `toReorderByIds`    | `orderedIds: string[]`                   | `Promise<void>`   | 按 ID 排序       |
| `setFilterMirrorId` | `mirrorId: string \| null`               | `void`            | 设置过滤         |
| `setSortOptions`    | `options: SortOptions`                   | `void`            | 设置排序         |

### RxJS Observables

| Observable              | 类型                                     | 描述               |
| ----------------------- | ---------------------------------------- | ------------------ |
| `mirrorEvents$`         | `Subject<MirrorEvent>`                   | Mirror 事件流      |
| `selectedMirror$`       | `BehaviorSubject<Mirror \| null>`        | 当前选中           |
| `mirrorSearchTerm$`     | `BehaviorSubject<string>`                | 搜索词             |
| `filteredMirrors$`      | `Observable<Mirror[]>`                   | 过滤结果           |
| `applicationEvents$`    | `Subject<ApplicationEvent>`              | Application 事件流 |
| `filteredApplications$` | `Observable<Application[]>`              | 过滤结果           |
| `applicationsByMirror$` | `Observable<Map<string, Application[]>>` | 按 Mirror 分组     |

---

## 版本历史

| 版本  | 日期       | 变更     |
| ----- | ---------- | -------- |
| 1.0.0 | 2024-12-17 | 初始版本 |

---

## 相关链接

- [Zustand 官方文档](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Dexie.js 官方文档](https://dexie.org/)
- [RxJS 官方文档](https://rxjs.dev/)
- [Immer 官方文档](https://immerjs.github.io/immer/)
