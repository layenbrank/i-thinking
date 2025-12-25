/**
 * Markdown 插件系统
 */

// 本地类型定义
enum PluginState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
  DESTROYED = 'destroyed'
}

interface PluginMeta {
  name: string
  version: string
  dependencies?: string[]
  provides?: string[]
  conflicts?: string[]
}

interface PluginContext {
  state: Map<string, any>
  emit: (event: string, ...args: any[]) => void
  on: (event: string, handler: (...args: any[]) => void) => () => void
  logger: {
    debug: (...args: any[]) => void
    info: (...args: any[]) => void
    warn: (...args: any[]) => void
    error: (...args: any[]) => void
  }
}

interface PluginHooks<TConfig = any> {
  beforeInit?: (config: TConfig, context: PluginContext) => void | Promise<void>
  afterInit?: (config: TConfig, context: PluginContext) => void | Promise<void>
  beforeRender?: (markdown: string, context: PluginContext) => string | Promise<string>
  afterRender?: (html: string, context: PluginContext) => string | Promise<string>
  onError?: (error: Error, context: PluginContext) => void
  onDestroy?: (context: PluginContext) => void | Promise<void>
}

interface Plugin<TConfig = any> {
  meta: PluginMeta
  defaultConfig?: TConfig
  hooks: PluginHooks<TConfig>
}

/**
 * 插件注册表
 */
interface RegisteredPlugin<TConfig = any> {
  plugin: Plugin<TConfig>
  config: TConfig
  state: PluginState
  context: PluginContext
  error?: Error
}

/**
 * 事件发射器
 */
class EventEmitter {
  private listeners = new Map<string, Set<(...args: any[]) => void>>()

  on(event: string, handler: (...args: any[]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.add(handler)
    }

    return () => {
      this.listeners.get(event)?.delete(handler)
    }
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(...args)
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error)
      }
    })
  }

  clear(): void {
    this.listeners.clear()
  }
}

/**
 * Markdown 插件管理器
 */
export function useMarkdownPlugin() {
  const registry = new Map<string, RegisteredPlugin>()
  const globalEmitter = new EventEmitter()

  /**
   * 创建插件上下文
   */
  function createContext(pluginName: string): PluginContext {
    const state = new Map<string, any>()
    const emitter = new EventEmitter()

    return {
      state,
      emit: (event, ...args) => {
        emitter.emit(event, ...args)
        globalEmitter.emit(`${pluginName}:${event}`, ...args)
      },
      on: (event, handler) => emitter.on(event, handler),
      logger: {
        debug: (...args) => console.debug(`[${pluginName}]`, ...args),
        info: (...args) => console.info(`[${pluginName}]`, ...args),
        warn: (...args) => console.warn(`[${pluginName}]`, ...args),
        error: (...args) => console.error(`[${pluginName}]`, ...args)
      }
    }
  }

  /**
   * 检查插件依赖
   */
  function checkDependencies(plugin: Plugin): string[] {
    const missing: string[] = []
    const dependencies = plugin.meta.dependencies ?? []

    for (const dep of dependencies) {
      if (!registry.has(dep)) {
        missing.push(dep)
      }
    }

    return missing
  }

  /**
   * 检查插件冲突
   */
  function checkConflicts(plugin: Plugin): string[] {
    const conflicts: string[] = []
    const conflictList = plugin.meta.conflicts ?? []

    for (const conflict of conflictList) {
      if (registry.has(conflict)) {
        conflicts.push(conflict)
      }
    }

    return conflicts
  }

  /**
   * 注册插件
   */
  async function register<TConfig = any>(
    plugin: Plugin<TConfig>,
    config?: Partial<TConfig>
  ): Promise<void> {
    const { name } = plugin.meta

    if (registry.has(name)) {
      throw new Error(`Plugin ${name} is already registered`)
    }

    // 检查依赖
    const missingDeps = checkDependencies(plugin)
    if (missingDeps.length > 0) {
      throw new Error(`Plugin ${name} is missing dependencies: ${missingDeps.join(', ')}`)
    }

    // 检查冲突
    const conflicts = checkConflicts(plugin)
    if (conflicts.length > 0) {
      throw new Error(`Plugin ${name} conflicts with: ${conflicts.join(', ')}`)
    }

    // 创建注册项
    const registered: RegisteredPlugin<TConfig> = {
      plugin,
      config: { ...plugin.defaultConfig, ...config } as TConfig,
      state: PluginState.UNINITIALIZED,
      context: createContext(name)
    }

    registry.set(name, registered)

    // 初始化插件
    await initialize(name)
  }

  /**
   * 初始化插件
   */
  async function initialize(name: string): Promise<void> {
    const registered = registry.get(name)
    if (!registered) {
      throw new Error(`Plugin ${name} not found`)
    }

    if (registered.state !== PluginState.UNINITIALIZED) {
      return
    }

    registered.state = PluginState.INITIALIZING

    try {
      // beforeInit hook
      if (registered.plugin.hooks.beforeInit) {
        await registered.plugin.hooks.beforeInit(registered.config, registered.context)
      }

      // afterInit hook
      if (registered.plugin.hooks.afterInit) {
        await registered.plugin.hooks.afterInit(registered.config, registered.context)
      }

      registered.state = PluginState.READY
      globalEmitter.emit('plugin:ready', name)
    } catch (error) {
      registered.state = PluginState.ERROR
      registered.error = error as Error
      globalEmitter.emit('plugin:error', name, error)

      if (registered.plugin.hooks.onError) {
        registered.plugin.hooks.onError(error as Error, registered.context)
      }

      throw error
    }
  }

  /**
   * 执行 beforeRender 钩子
   */
  async function executeBeforeRender(markdown: string): Promise<string> {
    let result = markdown

    // 按注册顺序执行
    for (const registered of registry.values()) {
      if (registered.state !== PluginState.READY) continue
      if (!registered.plugin.hooks.beforeRender) continue

      try {
        result = await registered.plugin.hooks.beforeRender(result, registered.context)
      } catch (error) {
        registered.context.logger.error('Error in beforeRender:', error)
        if (registered.plugin.hooks.onError) {
          registered.plugin.hooks.onError(error as Error, registered.context)
        }
      }
    }

    return result
  }

  /**
   * 执行 afterRender 钩子
   */
  async function executeAfterRender(html: string): Promise<string> {
    let result = html

    // 按注册顺序执行
    for (const registered of registry.values()) {
      if (registered.state !== PluginState.READY) continue
      if (!registered.plugin.hooks.afterRender) continue

      try {
        result = await registered.plugin.hooks.afterRender(result, registered.context)
      } catch (error) {
        registered.context.logger.error('Error in afterRender:', error)
        if (registered.plugin.hooks.onError) {
          registered.plugin.hooks.onError(error as Error, registered.context)
        }
      }
    }

    return result
  }

  /**
   * 卸载插件
   */
  async function unregister(name: string): Promise<void> {
    const registered = registry.get(name)
    if (!registered) return

    // 检查是否有其他插件依赖它
    for (const [pluginName, plugin] of registry.entries()) {
      if (pluginName === name) continue
      const deps = plugin.plugin.meta.dependencies ?? []
      if (deps.includes(name)) {
        throw new Error(`Cannot unregister ${name}: plugin ${pluginName} depends on it`)
      }
    }

    // onDestroy hook
    if (registered.plugin.hooks.onDestroy) {
      try {
        await registered.plugin.hooks.onDestroy(registered.context)
      } catch (error) {
        registered.context.logger.error('Error in onDestroy:', error)
      }
    }

    registered.state = PluginState.DESTROYED
    registry.delete(name)
    globalEmitter.emit('plugin:destroyed', name)
  }

  /**
   * 获取插件
   */
  function get(name: string): RegisteredPlugin | undefined {
    return registry.get(name)
  }

  /**
   * 获取所有插件
   */
  function getAll(): RegisteredPlugin[] {
    return Array.from(registry.values())
  }

  /**
   * 获取就绪的插件
   */
  function getReady(): RegisteredPlugin[] {
    return Array.from(registry.values()).filter((p) => p.state === PluginState.READY)
  }

  /**
   * 全局事件监听
   */
  function on(event: string, handler: (...args: any[]) => void): () => void {
    return globalEmitter.on(event, handler)
  }

  /**
   * 清理所有插件
   */
  async function dispose(): Promise<void> {
    const plugins = Array.from(registry.keys())
    for (const name of plugins) {
      await unregister(name)
    }
    globalEmitter.clear()
  }

  return {
    register,
    unregister,
    initialize,
    executeBeforeRender,
    executeAfterRender,
    get,
    getAll,
    getReady,
    on,
    dispose
  }
}

export type MarkdownPluginManager = ReturnType<typeof useMarkdownPlugin>
