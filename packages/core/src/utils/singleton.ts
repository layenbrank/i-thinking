/**
 * 单例模式工具
 * @description 提供企业级单例模式实现，支持装饰器和代理两种使用方式。
 *
 * @example
 * ```typescript
 * // 1. 基本使用
 * @Singleton()
 * class BasicService {
 *   doSomething() {}
 * }
 *
 * // 2. 带配置的使用
 * @Singleton({
 *   global: true,
 *   lazy: true,
 *   retryCount: 3,
 *   retryInterval: 1000
 * })
 * class AdvancedService {
 *   async init() {}
 * }
 *
 * // 3. 带生命周期钩子的使用
 * @Singleton({
 *   onCreate(instance) {
 *     // 同步初始化
 *     instance.init();
 *   },
 *   async onAsyncInit(instance) {
 *     // 异步初始化
 *     await instance.loadConfig();
 *   },
 *   async onDestroy(instance) {
 *     // 清理资源
 *     await instance.cleanup();
 *   }
 * })
 * class ServiceWithLifecycle {
 *   init() {}
 *   async loadConfig() {}
 *   async cleanup() {}
 * }
 *
 * // 4. 使用自定义错误处理
 * class CustomErrorStrategy implements ErrorHandlingStrategy {
 *   handleError(error: Error, context: ErrorContext): void {
 *     console.error(`Error in ${context.name}:`, error);
 *     if (context.retryCount < context.maxRetries) {
 *       console.log('Retrying...');
 *       return;
 *     }
 *     throw error;
 *   }
 * }
 *
 * @Singleton({
 *   errorStrategy: new CustomErrorStrategy()
 * })
 * class ServiceWithErrorHandling {}
 *
 * // 5. 使用自定义实例工厂
 * class CustomInstanceFactory<T> implements InstanceFactory<T> {
 *   createInstance(constructor: Constructor<T>, args: any[]): T {
 *     console.log('Creating instance...');
 *     return new constructor(...args);
 *   }
 * }
 *
 * @Singleton({
 *   instanceFactory: new CustomInstanceFactory()
 * })
 * class ServiceWithCustomFactory {}
 *
 * // 6. 使用生命周期监听器
 * class CustomLifecycleListener<T> implements LifecycleListener<T> {
 *   onEvent(event: LifecycleEvent, instance: T): void {
 *     console.log(`Lifecycle event: ${event}`);
 *   }
 * }
 *
 * @Singleton({
 *   lifecycleListener: new CustomLifecycleListener()
 * })
 * class ServiceWithLifecycleListener {}
 * ```
 *
 * @packageDocumentation
 */

/**
 * 构造函数类型
 * @typeParam T - 实例类型
 * @remarks
 * 用于表示可以被实例化的类构造函数。
 * 包含了类的原型和名称信息。
 */
export interface Constructor<T = any> {
  new (...args: any[]): T
  prototype: T
  name: string
}

/**
 * 错误处理上下文
 * @remarks
 * 提供错误处理过程中需要的上下文信息。
 */
export interface ErrorContext {
  /** 发生错误的类名 */
  name: string
  /** 当前重试次数 */
  retryCount: number
  /** 最大允许重试次数 */
  maxRetries: number
  /** 重试间隔时间(毫秒) */
  retryInterval: number
}

/**
 * 错误处理策略接口
 * @remarks
 * 定义了如何处理单例创建过程中的错误。
 * 可以实现自定义的错误处理逻辑。
 */
export interface ErrorHandlingStrategy {
  /**
   * 处理错误
   * @param error - 发生的错误
   * @param context - 错误处理上下文
   */
  handleError(error: Error, context: ErrorContext): void
}

/**
 * 默认错误处理策略
 * @remarks
 * 提供基本的重试机制。
 * 当重试次数超过限制时抛出错误。
 */
export class DefaultErrorStrategy implements ErrorHandlingStrategy {
  handleError(error: Error, context: ErrorContext): void {
    if (context.retryCount < context.maxRetries) {
      return
    }
    throw new SingletonError(`Failed after ${context.maxRetries} retries`, context.name, error)
  }
}

/**
 * 实例工厂接口
 * @typeParam T - 实例类型
 * @remarks
 * 定义了如何创建类的实例。
 * 可以实现自定义的实例创建逻辑。
 */
export interface InstanceFactory<T> {
  /**
   * 创建实例
   * @param constructor - 类构造函数
   * @param args - 构造函数参数
   * @returns 创建的实例
   */
  createInstance(constructor: Constructor<T>, args: any[]): T
}

/**
 * 默认实例工厂
 * @typeParam T - 实例类型
 * @remarks
 * 提供基本的实例创建逻辑。
 * 确保实例的方法被正确绑定。
 */
export class DefaultInstanceFactory<T> implements InstanceFactory<T> {
  createInstance(constructor: Constructor<T>, args: any[]): T {
    const instance = new constructor(...args)

    // 确保所有原型方法被正确绑定
    const prototype = constructor.prototype
    Object.getOwnPropertyNames(prototype).forEach(prop => {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, prop)
      if (descriptor && typeof descriptor.value === 'function') {
        Object.defineProperty(instance, prop, {
          ...descriptor,
          value: descriptor.value.bind(instance)
        })
      }
    })

    return instance
  }
}

/**
 * 生命周期事件类型
 * @remarks
 * 定义了单例实例的生命周期事件。
 */
export type LifecycleEvent = 'beforeCreate' | 'created' | 'beforeDestroy' | 'destroyed'

/**
 * 生命周期监听器接口
 * @typeParam T - 实例类型
 * @remarks
 * 定义了如何处理同步的生命周期事件。
 */
export interface LifecycleListener<T> {
  /**
   * 处理生命周期事件
   * @param event - 生命周期事件类型
   * @param instance - 实例对象
   */
  onEvent(event: LifecycleEvent, instance: T): void
}

/**
 * 异步生命周期监听器接口
 * @typeParam T - 实例类型
 * @remarks
 * 定义了如何处理异步的生命周期事件。
 */
export interface AsyncLifecycleListener<T> {
  /**
   * 处理异步生命周期事件
   * @param event - 生命周期事件类型
   * @param instance - 实例对象
   */
  onAsyncEvent(event: LifecycleEvent, instance: T): Promise<void>
}

/**
 * 生命周期管理器
 * @typeParam T - 实例类型
 * @remarks
 * 管理实例的生命周期事件和监听器。
 */
export class LifecycleManager<T> {
  private listeners: Set<LifecycleListener<T>> = new Set()
  private asyncListeners: Set<AsyncLifecycleListener<T>> = new Set()

  /**
   * 添加同步监听器
   * @param listener - 生命周期监听器
   */
  addListener(listener: LifecycleListener<T>): void {
    this.listeners.add(listener)
  }

  /**
   * 添加异步监听器
   * @param listener - 异步生命周期监听器
   */
  addAsyncListener(listener: AsyncLifecycleListener<T>): void {
    this.asyncListeners.add(listener)
  }

  /**
   * 移除同步监听器
   * @param listener - 生命周期监听器
   */
  removeListener(listener: LifecycleListener<T>): void {
    this.listeners.delete(listener)
  }

  /**
   * 移除异步监听器
   * @param listener - 异步生命周期监听器
   */
  removeAsyncListener(listener: AsyncLifecycleListener<T>): void {
    this.asyncListeners.delete(listener)
  }

  /**
   * 触发同步事件
   * @param event - 生命周期事件类型
   * @param instance - 实例对象
   */
  emitEvent(event: LifecycleEvent, instance: T): void {
    for (const listener of this.listeners) {
      listener.onEvent(event, instance)
    }
  }

  /**
   * 触发异步事件
   * @param event - 生命周期事件类型
   * @param instance - 实例对象
   */
  async emitAsyncEvent(event: LifecycleEvent, instance: T): Promise<void> {
    for (const listener of this.asyncListeners) {
      await listener.onAsyncEvent(event, instance)
    }
  }
}

/**
 * 单例配置选项
 * @typeParam T - 实例类型
 * @remarks
 * 配置单例的行为和生命周期。
 */
export interface SingletonOptions<T> {
  /** 是否为全局单例，如果为 true，实例将被挂载到全局对象上 */
  global?: boolean
  /** 是否延迟初始化 */
  lazy?: boolean
  /** 最大重试次数 */
  retryCount?: number
  /** 重试间隔(毫秒) */
  retryInterval?: number
  /** 错误处理策略 */
  errorStrategy?: ErrorHandlingStrategy
  /** 实例工厂 */
  instanceFactory?: InstanceFactory<T>
  /** 生命周期监听器 */
  lifecycleListener?: LifecycleListener<T>
  /** 异步生命周期监听器 */
  asyncLifecycleListener?: AsyncLifecycleListener<T>
  /** 实例创建后的同步回调函数 */
  onCreate?(instance: T): void
  /** 实例的异步初始化函数 */
  onAsyncInit?(instance: T): Promise<void>
  /** 实例销毁前的回调函数 */
  onDestroy?(instance: T): void
}

/**
 * 单例错误类
 * @remarks
 * 表示单例创建或管理过程中的错误。
 */
export class SingletonError extends Error {
  constructor(
    message: string,
    public readonly className: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'SingletonError'
    Object.setPrototypeOf(this, SingletonError.prototype)
  }
}

/**
 * 单例状态枚举
 * @remarks
 * 表示单例实例的当前状态。
 */
export enum SingletonState {
  /** 未初始化 */
  PENDING = 'PENDING',
  /** 初始化中 */
  INITIALIZING = 'INITIALIZING',
  /** 已初始化 */
  INITIALIZED = 'INITIALIZED',
  /** 销毁中 */
  DESTROYING = 'DESTROYING',
  /** 已销毁 */
  DESTROYED = 'DESTROYED',
  /** 错误状态 */
  ERROR = 'ERROR'
}

/**
 * 单例元数据
 */
interface SingletonMetadata<T> {
  instance: T | null
  state: SingletonState
  options: SingletonOptions<T>
  error: Error | null
  lifecycleManager: LifecycleManager<T>
  retryCount: number
}

/**
 * 单例代理类
 * @description
 * 用于管理单例实例的创建和生命周期。
 * 使用 WeakMap 存储实例，支持垃圾回收。
 * 确保原型链和方法的正确继承。
 */
export class SingletonProxy {
  /** 存储所有单例实例的元数据 */
  private static readonly metadata = new WeakMap<Constructor<any>, SingletonMetadata<any>>()

  /**
   * 创建单例代理
   * @description
   * 将目标类转换为单例模式。
   * 确保实例只被创建一次，并正确继承原型链上的所有方法。
   */
  static create<T extends object>(
    Target: Constructor<T>,
    options: SingletonOptions<T> = {}
  ): Constructor<T> {
    return new Proxy(Target, {
      construct(target: Constructor<T>, args: any[]): T {
        let metadata = SingletonProxy.getMetadata(target)

        if (!metadata) {
          metadata = {
            instance: null,
            state: SingletonState.PENDING,
            options,
            error: null,
            lifecycleManager: new LifecycleManager<T>(),
            retryCount: 0
          }
          if (options.lifecycleListener) {
            metadata.lifecycleManager.addListener(options.lifecycleListener)
          }
          if (options.asyncLifecycleListener) {
            metadata.lifecycleManager.addAsyncListener(options.asyncLifecycleListener)
          }
          SingletonProxy.setMetadata(target, metadata)
        }

        if (metadata.instance && metadata.state === SingletonState.INITIALIZED) {
          return metadata.instance
        }

        try {
          metadata.state = SingletonState.INITIALIZING
          metadata.lifecycleManager.emitEvent('beforeCreate', null as any)

          // 同步创建实例
          const factory = options.instanceFactory || new DefaultInstanceFactory<T>()
          const instance = factory.createInstance(target, args)

          // 更新元数据
          metadata.instance = instance
          metadata.state = SingletonState.INITIALIZED
          metadata.error = null
          metadata.retryCount = 0

          // 处理全局单例
          if (options.global && typeof window !== 'undefined') {
            const globalKey = `__SINGLETON_${target.name}__`
            Object.defineProperty(window, globalKey, {
              value: instance,
              configurable: true,
              writable: false
            })
          }

          // 同步初始化
          metadata.lifecycleManager.emitEvent('created', instance)
          if (options.onCreate) {
            options.onCreate(instance)
          }

          // 异步初始化
          Promise.resolve().then(async () => {
            try {
              await metadata.lifecycleManager.emitAsyncEvent('created', instance)
              if (options.onAsyncInit) {
                await options.onAsyncInit(instance)
              }
            } catch (error) {
              metadata.error = error instanceof Error ? error : new Error(String(error))
              metadata.state = SingletonState.ERROR
              console.error(`Error in async initialization:`, error)
            }
          })

          return instance
        } catch (error) {
          metadata.state = SingletonState.ERROR

          // 使用错误处理策略
          const strategy = options.errorStrategy || new DefaultErrorStrategy()
          try {
            strategy.handleError(error instanceof Error ? error : new Error(String(error)), {
              name: target.name,
              retryCount: metadata.retryCount,
              maxRetries: options.retryCount || 3,
              retryInterval: options.retryInterval || 1000
            })

            // 重试
            metadata.retryCount++
            return new Target(...args)
          } catch (retryError) {
            const finalError = new SingletonError(
              `Failed to create singleton instance`,
              target.name,
              retryError instanceof Error ? retryError : new Error(String(retryError))
            )
            metadata.error = finalError
            throw finalError
          }
        }
      }
    })
  }

  /**
   * 获取实例
   * @description 获取指定类的单例实例
   */
  static getInstance<T>(Target: Constructor<T>): T | null {
    return this.getMetadata(Target)?.instance ?? null
  }

  /**
   * 获取实例状态
   * @description 获取指定类的单例实例状态
   */
  static getState<T>(Target: Constructor<T>): SingletonState {
    return this.getMetadata(Target)?.state ?? SingletonState.PENDING
  }

  /**
   * 获取元数据
   */
  private static getMetadata<T>(Target: Constructor<T>): SingletonMetadata<T> | undefined {
    return this.metadata.get(Target)
  }

  /**
   * 设置元数据
   */
  private static setMetadata<T>(Target: Constructor<T>, metadata: SingletonMetadata<T>): void {
    this.metadata.set(Target, metadata)
  }

  /**
   * 销毁实例
   * @description 销毁指定类的单例实例
   */
  static async destroy<T>(Target: Constructor<T>): Promise<void> {
    const metadata = this.getMetadata(Target)
    if (!metadata?.instance) return

    try {
      metadata.state = SingletonState.DESTROYING
      metadata.lifecycleManager.emitEvent('beforeDestroy', metadata.instance)

      // 调用 onDestroy 钩子
      if (metadata.options.onDestroy) {
        await metadata.options.onDestroy(metadata.instance)
      }

      // 清理全局实例
      if (metadata.options.global && typeof window !== 'undefined') {
        const globalKey = `__SINGLETON_${Target.name}__`
        delete (window as any)[globalKey]
      }

      // 更新元数据
      metadata.instance = null
      metadata.state = SingletonState.DESTROYED
      metadata.lifecycleManager.emitEvent('destroyed', null as any)
    } catch (error) {
      const finalError = new SingletonError(
        `Failed to destroy singleton instance`,
        Target.name,
        error instanceof Error ? error : new Error(String(error))
      )
      metadata.error = finalError
      throw finalError
    }
  }

  /**
   * 重置实例
   * @description 重置指定类的单例实例状态
   */
  static reset<T>(Target: Constructor<T>): void {
    const metadata = this.getMetadata(Target)
    if (metadata) {
      metadata.instance = null
      metadata.state = SingletonState.PENDING
      metadata.error = null
      metadata.retryCount = 0
    }
  }

  /**
   * 获取实例错误
   * @description 获取指定类的单例实例创建过程中的错误
   */
  static getError<T>(Target: Constructor<T>): Error | null {
    const metadata = this.getMetadata(Target)
    return metadata?.error ?? null
  }
}

/**
 * 单例装饰器
 * @description
 * 用于将类转换为单例模式的装饰器。
 * 支持全局单例和实例创建回调。
 * 确保类的所有方法和属性被正确继承。
 */
export function Singleton<T extends object>(options: SingletonOptions<T> = {}) {
  return function (Target: Constructor<T>): Constructor<T> {
    return SingletonProxy.create(Target, options)
  }
}
