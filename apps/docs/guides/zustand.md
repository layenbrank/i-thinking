# Zustand 在 React 中的正确用法

## 基础 Store 定义

```ts
// store/useCounterStore.ts
import { create } from 'zustand'

interface CounterState {
	count: number
	increment: () => void
	reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
	count: 0,
	increment: () => set((state) => ({ count: state.count + 1 })),
	reset: () => set({ count: 0 })
}))
```

## 精确订阅（避免不必要重渲染）

用 selector 只订阅需要的字段，而不是整个 store：

```tsx
function Counter() {
	// ✅ 精确订阅，只在 count 变化时重渲染
	const count = useCounterStore((state) => state.count)
	// ✅ actions 是稳定引用，不会触发重渲染
	const increment = useCounterStore((state) => state.increment)

	// ❌ 订阅全量 store，任何字段变化都触发重渲染
	// const store = useCounterStore()

	return <button onClick={increment}>{count}</button>
}
```

## Actions 内聚在 Store 内部

业务逻辑应封装在 store 中，组件只负责调用：

```ts
// ✅ 正确：逻辑封装在 store
export const useUserStore = create<UserState>((set, get) => ({
	user: null,
	loading: false,
	fetchUser: async (id: string) => {
		set({ loading: true })
		const user = await api.getUser(id)
		set({ user, loading: false })
	}
}))
```

```tsx
// ✅ 组件只调用，不处理业务逻辑
function Profile({ id }: { id: string }) {
	const fetchUser = useUserStore((state) => state.fetchUser)

	useEffect(() => {
		fetchUser(id)
	}, [id, fetchUser])
}
```

## 订阅多字段使用 `useShallow`

同时订阅多个字段时，使用 `useShallow` 进行浅比较，避免因对象引用变化导致不必要重渲染：

```tsx
import { useShallow } from 'zustand/react/shallow'

function UserCard() {
	// ✅ 浅比较：name 和 avatar 都未变化时不重渲染
	const { name, avatar } = useUserStore(
		useShallow((state) => ({ name: state.name, avatar: state.avatar }))
	)

	return <div>{name}</div>
}
```

## Store 外访问（非 React 环境）

在拦截器、工具函数等非 React 环境中，直接使用 `.getState()` / `.setState()`：

```ts
// ✅ 在 axios 拦截器中获取 token
const token = useAuthStore.getState().token

// ✅ 在非组件中更新状态
useAuthStore.setState({ token: newToken })
```

## 配合 `immer` 处理嵌套状态

使用 `immer` 中间件可以直接 mutation 嵌套对象，无需手动展开：

```ts
import { immer } from 'zustand/middleware/immer'

interface State {
	nested: { count: number }
	increment: () => void
}

const useStore = create(
	immer<State>((set) => ({
		nested: { count: 0 },
		increment: () =>
			set((state) => {
				// ✅ 直接 mutation，immer 处理不可变性
				state.nested.count += 1
			})
	}))
)
```

## 持久化状态（`persist` 中间件）

```ts
import { persist, createJSONStorage } from 'zustand/middleware'

const useSettingsStore = create(
	persist<SettingsState>(
		(set) => ({
			theme: 'light',
			setTheme: (theme) => set({ theme })
		}),
		{
			name: 'settings-storage', // localStorage key
			storage: createJSONStorage(() => localStorage)
		}
	)
)
```

## 核心原则

| 原则                      | 说明                             |
| ------------------------- | -------------------------------- |
| **精确订阅**              | 用 selector 只取需要的字段       |
| **Actions 内聚**          | 业务逻辑放 store，组件只调用     |
| **避免全量订阅**          | 不直接 `useStore()` 取整个 store |
| **多字段用 `useShallow`** | 避免浅比较失效导致多余重渲染     |
| **非 React 环境**         | 用 `.getState()` 代替 hook       |
