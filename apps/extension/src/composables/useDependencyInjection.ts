import 'reflect-metadata'

/**
 * 依赖注入容器（DI）
 *
 * 目标
 * - 提供 Class/Value/Factory/Existing 四类 Provider
 * - 支持作用域：Singleton/Transient/Request
 * - 构建依赖图并进行循环依赖检测（DFS）
 *
 * 关键点
 * - addEdge 构图，detectCycle 使用 DFS 标记 gray/black 检测回边
 * - topologicalSort 用于批量初始化顺序保障
 */

/**
 * 依赖注入容器实现
 */

// 本地类型定义以避免导入冲突
type InjectionToken<T = any> = symbol | string | (new (...args: any[]) => T)

enum Scope {
	SINGLETON = 'singleton',
	TRANSIENT = 'transient',
	REQUEST = 'request'
}

interface ClassProvider<T = any> {
	provide: InjectionToken<T>
	useClass: new (...args: any[]) => T
	scope?: Scope
}

interface ValueProvider<T = any> {
	provide: InjectionToken<T>
	useValue: T
	scope?: Scope
}

interface FactoryProvider<T = any> {
	provide: InjectionToken<T>
	useFactory: (...deps: any[]) => T
	deps?: InjectionToken[]
	scope?: Scope
}

interface ExistingProvider<T = any> {
	provide: InjectionToken<T>
	useExisting: InjectionToken
	scope?: Scope
}

type Provider<T = any> =
	| ClassProvider<T>
	| ValueProvider<T>
	| FactoryProvider<T>
	| ExistingProvider<T>

/**
 * 依赖图用于循环依赖检测
 */
class DependencyGraph {
	private adjacencyList = new Map<InjectionToken, Set<InjectionToken>>()
	private visitState = new Map<InjectionToken, 'white' | 'gray' | 'black'>()

	addEdge(from: InjectionToken, to: InjectionToken) {
		if (!this.adjacencyList.has(from)) {
			this.adjacencyList.set(from, new Set())
		}
		const adjacentSet = this.adjacencyList.get(from)
		if (adjacentSet) {
			adjacentSet.add(to)
		}
	}

	/**
	 * DFS 检测循环依赖
	 * - white: 未访问
	 * - gray: 访问中（发现回到 gray 表示有环）
	 * - black: 已完成
	 */
	detectCycle(): InjectionToken[] | null {
		// 初始化所有节点为白色（未访问）
		this.visitState.clear()
		for (const node of this.adjacencyList.keys()) {
			this.visitState.set(node, 'white')
		}

		// 对每个未访问的节点进行DFS
		for (const node of this.adjacencyList.keys()) {
			if (this.visitState.get(node) === 'white') {
				const cycle = this.dfs(node, [])
				if (cycle) return cycle
			}
		}

		return null
	}

	private dfs(node: InjectionToken, path: InjectionToken[]): InjectionToken[] | null {
		// 标记为灰色（访问中）
		this.visitState.set(node, 'gray')
		path.push(node)

		const neighbors = this.adjacencyList.get(node) ?? new Set()
		for (const neighbor of neighbors) {
			const state = this.visitState.get(neighbor)

			// 发现循环
			if (state === 'gray') {
				const cycleStart = path.indexOf(neighbor)
				return path.slice(cycleStart)
			}

			// 继续DFS
			if (state === 'white') {
				const cycle = this.dfs(neighbor, [...path])
				if (cycle) return cycle
			}
		}

		// 标记为黑色（已完成）
		this.visitState.set(node, 'black')
		return null
	}

	/**
	 * 拓扑排序获取依赖加载顺序
	 */
	topologicalSort(): InjectionToken[] {
		const inDegree = new Map<InjectionToken, number>()
		const result: InjectionToken[] = []
		const queue: InjectionToken[] = []

		// 计算入度
		for (const node of this.adjacencyList.keys()) {
			inDegree.set(node, 0)
		}
		for (const neighbors of this.adjacencyList.values()) {
			for (const neighbor of neighbors) {
				inDegree.set(neighbor, (inDegree.get(neighbor) ?? 0) + 1)
			}
		}

		// 入度为0的节点入队
		for (const [node, degree] of inDegree.entries()) {
			if (degree === 0) queue.push(node)
		}

		// Kahn算法
		while (queue.length > 0) {
			const node = queue.shift()
			if (!node) break
			result.push(node)

			const neighbors = this.adjacencyList.get(node) ?? new Set()
			for (const neighbor of neighbors) {
				const currentDegree = inDegree.get(neighbor) ?? 0
				const degree = currentDegree - 1
				inDegree.set(neighbor, degree)
				if (degree === 0) queue.push(neighbor)
			}
		}

		return result
	}

	clear() {
		this.adjacencyList.clear()
		this.visitState.clear()
	}
}

/**
 * 依赖注入容器
 */
export function useDependencyInjection() {
	const providers = new Map<InjectionToken, Provider>()
	const singletonCache = new Map<InjectionToken, any>()
	const requestCache = ref(new Map<InjectionToken, any>())
	const dependencyGraph = new DependencyGraph()
	const resolutionStack = ref<InjectionToken[]>([])

	/**
	 * 注册提供者
	 */
	function register<T>(provider: Provider<T>): void {
		providers.set(provider.provide, provider)

		// 构建依赖图
		if ('useFactory' in provider && provider.deps) {
			for (const dep of provider.deps) {
				dependencyGraph.addEdge(provider.provide, dep)
			}
		} else if ('useClass' in provider) {
			const deps = Reflect.getMetadata('design:paramtypes', provider.useClass) ?? []
			for (const dep of deps) {
				dependencyGraph.addEdge(provider.provide, dep)
			}
		}
	}

	/**
	 * 批量注册
	 */
	function registerMany(providerList: Provider[]): void {
		for (const provider of providerList) {
			register(provider)
		}
	}

	/**
	 * 解析依赖
	 */
	function resolve<T>(token: InjectionToken<T>): T {
		// 检测循环依赖
		if (resolutionStack.value.includes(token)) {
			const cycle = [...resolutionStack.value, token]
			throw new Error(
				`Circular dependency detected: ${cycle.map((t) => tokenToString(t)).join(' -> ')}`
			)
		}

		resolutionStack.value.push(token)

		try {
			const provider = providers.get(token)
			if (!provider) {
				throw new Error(`No provider found for ${tokenToString(token)}`)
			}

			const scope = provider.scope ?? Scope.SINGLETON

			// 检查缓存
			if (scope === Scope.SINGLETON && singletonCache.has(token)) {
				return singletonCache.get(token)
			}
			if (scope === Scope.REQUEST && requestCache.value.has(token)) {
				return requestCache.value.get(token)
			}

			// 创建实例
			let instance: T

			if ('useValue' in provider) {
				instance = provider.useValue
			} else if ('useClass' in provider) {
				const deps = Reflect.getMetadata('design:paramtypes', provider.useClass) ?? []
				const resolvedDeps = deps.map((dep: InjectionToken) => resolve(dep))
				instance = new provider.useClass(...resolvedDeps)
			} else if ('useFactory' in provider) {
				const deps = provider.deps ?? []
				const resolvedDeps = deps.map((dep) => resolve(dep))
				instance = provider.useFactory(...resolvedDeps)
			} else if ('useExisting' in provider) {
				instance = resolve(provider.useExisting)
			} else {
				throw new Error(`Invalid provider for ${tokenToString(token)}`)
			}

			// 缓存实例
			if (scope === Scope.SINGLETON) {
				singletonCache.set(token, instance)
			} else if (scope === Scope.REQUEST) {
				requestCache.value.set(token, instance)
			}

			return instance
		} finally {
			resolutionStack.value.pop()
		}
	}

	/**
	 * 可选解析（返回null而非抛出异常）
	 */
	function resolveOptional<T>(token: InjectionToken<T>): T | null {
		try {
			return resolve(token)
		} catch {
			return null
		}
	}

	/**
	 * 检测循环依赖
	 */
	function checkCircularDependencies(): InjectionToken[] | null {
		return dependencyGraph.detectCycle()
	}

	/**
	 * 获取依赖加载顺序
	 */
	function getLoadOrder(): InjectionToken[] {
		return dependencyGraph.topologicalSort()
	}

	/**
	 * 清空请求作用域缓存
	 */
	function clearRequestScope(): void {
		requestCache.value.clear()
	}

	/**
	 * 清空所有缓存
	 */
	function clearAll(): void {
		singletonCache.clear()
		requestCache.value.clear()
		resolutionStack.value = []
	}

	/**
	 * Token转字符串
	 */
	function tokenToString(token: InjectionToken): string {
		if (typeof token === 'symbol') {
			return token.toString()
		}
		if (typeof token === 'string') {
			return token
		}
		return token.name || 'Anonymous'
	}

	/**
	 * 检查是否已注册
	 */
	function has(token: InjectionToken): boolean {
		return providers.has(token)
	}

	/**
	 * 移除提供者
	 */
	function unregister(token: InjectionToken): void {
		providers.delete(token)
		singletonCache.delete(token)
		requestCache.value.delete(token)
	}

	return {
		register,
		registerMany,
		resolve,
		resolveOptional,
		has,
		unregister,
		checkCircularDependencies,
		getLoadOrder,
		clearRequestScope,
		clearAll
	}
}

export type DependencyInjection = ReturnType<typeof useDependencyInjection>
