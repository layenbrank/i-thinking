import { BehaviorSubject, Observable, ReplaySubject, Subject, type Subscription, timer } from 'rxjs'
import {
  bufferTime,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  mergeMap,
  pairwise,
  scan,
  skip,
  startWith,
  switchMap,
  take,
  tap,
  throttleTime
} from 'rxjs/operators'
import type { StoreApi } from 'zustand'

// ============================================================================
// 类型定义
// ============================================================================

/** 事件基础类型 */
interface BaseEvent<T extends string = string, P = unknown> {
  type: T
  payload: P
  timestamp: number
  meta?: Record<string, unknown>
}

/** 事件总线配置 */
interface EventBusConfig {
  /** 是否开启调试日志 */
  debug?: boolean
  /** 历史事件缓冲大小 */
  historySize?: number
  /** 事件超时时间 (ms) */
  eventTimeout?: number
}

/** Zustand Store 订阅选项 */
interface StoreSubscriptionOptions<T, S> {
  /** 选择器函数 */
  selector: (state: T) => S
  /** 相等性比较函数 */
  equalityFn?: (a: S, b: S) => boolean
  /** 防抖时间 */
  debounce?: number
  /** 节流时间 */
  throttle?: number
  /** 是否跳过初始值 */
  skipInitial?: boolean
}

/** 命令模式 - 命令类型 */
interface Command<T extends string = string, P = unknown> {
  type: T
  payload: P
  execute: () => Promise<void> | void
  undo?: () => Promise<void> | void
}

// ============================================================================
// EventBus 类 - 类型安全的事件总线
// ============================================================================

export class EventBus<EventMap extends Record<string, unknown>> {
  private subject = new Subject<BaseEvent<keyof EventMap & string, EventMap[keyof EventMap]>>()
  private entry = new ReplaySubject<BaseEvent<keyof EventMap & string, EventMap[keyof EventMap]>>(
    100
  )
  private config: Required<EventBusConfig>
  private subscriptions = new Set<Subscription>()

  constructor(config: EventBusConfig = {}) {
    this.config = {
      debug: import.meta.env.DEV,
      historySize: 100,
      eventTimeout: 30000,
      ...config
    }

    // 将事件流入历史记录
    const self = this
    this.subject.subscribe(function (event) {
      self.entry.next(event)
    })
  }

  /** 发布事件 */
  emit<K extends keyof EventMap>(
    type: K,
    payload: EventMap[K],
    meta?: Record<string, unknown>
  ): void {
    const event: BaseEvent<K & string, EventMap[K]> = {
      type: type as K & string,
      payload,
      timestamp: Date.now(),
      meta
    }

    if (this.config.debug) {
      console.log(`[EventBus] emit:`, type, payload)
    }

    this.subject.next(event as any)
  }

  /** 订阅特定类型的事件 */
  on<K extends keyof EventMap>(type: K): Observable<EventMap[K]> {
    return this.subject.pipe(
      filter(function (event) {
        return event.type === type
      }),
      map(function (event) {
        return event.payload as EventMap[K]
      })
    )
  }

  /** 订阅所有事件 */
  onAny(): Observable<BaseEvent<keyof EventMap & string, EventMap[keyof EventMap]>> {
    return this.subject.asObservable()
  }

  /** 订阅多个事件类型 */
  onMany<K extends keyof EventMap>(types: K[]): Observable<EventMap[K]> {
    return this.subject.pipe(
      filter(function (event) {
        return types.includes(event.type as K)
      }),
      map(function (event) {
        return event.payload as EventMap[K]
      })
    )
  }

  /** 等待特定事件 (一次性) */
  once<K extends keyof EventMap>(type: K): Promise<EventMap[K]> {
    const self = this
    return new Promise(function (resolve, reject) {
      const timeoutId = setTimeout(function () {
        reject(new Error(`Event ${String(type)} timeout`))
      }, self.config.eventTimeout)

      self
        .on(type)
        .pipe(take(1))
        .subscribe({
          next(payload) {
            clearTimeout(timeoutId)
            resolve(payload)
          },
          error(err) {
            clearTimeout(timeoutId)
            reject(err)
          }
        })
    })
  }

  /** 获取历史事件 */
  getHistory(
    count?: number
  ): Observable<BaseEvent<keyof EventMap & string, EventMap[keyof EventMap]>[]> {
    const events: BaseEvent<keyof EventMap & string, EventMap[keyof EventMap]>[] = []
    const limit = count ?? this.config.historySize

    return new Observable(
      function (subscriber) {
        this.entry.pipe(take(limit)).subscribe({
          next(event) {
            events.push(event)
          },
          complete() {
            subscriber.next(events)
            subscriber.complete()
          }
        })
      }.bind(this)
    )
  }

  /** 清理 */
  destroy(): void {
    this.subscriptions.forEach(function (sub) {
      sub.unsubscribe()
    })
    this.subscriptions.clear()
    this.subject.complete()
    this.entry.complete()
  }
}

// ============================================================================
// Zustand Store 桥接工具
// ============================================================================

/**
 * 将 Zustand store 状态转换为 Observable
 */
export function storeToObservable<T, S>(
  store: StoreApi<T>,
  options: StoreSubscriptionOptions<T, S>
): Observable<S> {
  const { selector, equalityFn, debounce, throttle, skipInitial } = options

  return new Observable<S>(function (subscriber) {
    // 发送初始值
    if (!skipInitial) {
      subscriber.next(selector(store.getState()))
    }

    // 订阅变化
    const unsubscribe = store.subscribe(function (state, prevState) {
      const current = selector(state)
      const previous = selector(prevState)

      const isEqual = equalityFn ? equalityFn(current, previous) : current === previous

      if (!isEqual) {
        subscriber.next(current)
      }
    })

    return unsubscribe
  }).pipe(
    debounce ? debounceTime(debounce) : tap(function () {}),
    throttle ? throttleTime(throttle) : tap(function () {}),
    distinctUntilChanged(equalityFn)
  )
}

/**
 * 将 Observable 桥接到 Zustand store
 */
export function observableToStore<T, S>(
  observable$: Observable<S>,
  store: StoreApi<T>,
  updater: (state: T, value: S) => Partial<T>
): Subscription {
  return observable$.subscribe(function (value) {
    store.setState(function (state) {
      return updater(state, value)
    })
  })
}

/**
 * 创建双向绑定
 */
export function createTwoWayBinding<T, S>(
  store: StoreApi<T>,
  selector: (state: T) => S,
  updater: (state: T, value: S) => Partial<T>,
  options: { debounce?: number } = {}
): {
  value$: BehaviorSubject<S>
  subscription: Subscription
  destroy: () => void
} {
  const initialValue = selector(store.getState())
  const value$ = new BehaviorSubject<S>(initialValue)

  // Store -> Observable
  const storeToObs = storeToObservable(store, {
    selector,
    skipInitial: true,
    debounce: options.debounce
  }).subscribe(function (value) {
    value$.next(value)
  })

  // Observable -> Store
  const obsToStore = value$
    .pipe(
      skip(1), // 跳过初始值
      debounceTime(options.debounce ?? 0),
      distinctUntilChanged()
    )
    .subscribe(function (value) {
      store.setState(function (state) {
        return updater(state, value)
      })
    })

  const subscription = new Subscription()
  subscription.add(storeToObs)
  subscription.add(obsToStore)

  return {
    value$,
    subscription,
    destroy() {
      subscription.unsubscribe()
      value$.complete()
    }
  }
}

// ============================================================================
// 状态变化追踪器
// ============================================================================

interface StateChange<T> {
  current: T
  previous: T
  timestamp: number
  diff: Partial<T>
}

/**
 * 创建状态变化追踪器
 */
export function createStateTracker<T extends Record<string, unknown>>(
  store: StoreApi<T>,
  options: {
    maxHistory?: number
    trackFields?: (keyof T)[]
  } = {}
): {
  changes$: Observable<StateChange<T>>
  history$: Observable<StateChange<T>[]>
  undo: () => void
  redo: () => void
  canUndo$: Observable<boolean>
  canRedo$: Observable<boolean>
  destroy: () => void
} {
  const { maxHistory = 50, trackFields } = options
  const changes$ = new Subject<StateChange<T>>()
  const history: StateChange<T>[] = []
  let historyIndex = -1

  const subscription = storeToObservable(store, {
    selector: function (state) {
      return state
    },
    skipInitial: true
  })
    .pipe(
      pairwise(),
      map(function ([previous, current]) {
        const diff: Partial<T> = {}
        const fields = trackFields ?? (Object.keys(current) as (keyof T)[])

        fields.forEach(function (key) {
          if (current[key] !== previous[key]) {
            diff[key] = current[key]
          }
        })

        return {
          current,
          previous,
          timestamp: Date.now(),
          diff
        } as StateChange<T>
      }),
      filter(function (change) {
        return Object.keys(change.diff).length > 0
      })
    )
    .subscribe(function (change) {
      // 截断 redo 历史
      history.splice(historyIndex + 1)
      history.push(change)

      // 限制历史大小
      if (history.length > maxHistory) {
        history.shift()
      } else {
        historyIndex++
      }

      changes$.next(change)
    })

  const canUndo$ = new BehaviorSubject(false)
  const canRedo$ = new BehaviorSubject(false)

  function updateCanUndoRedo() {
    canUndo$.next(historyIndex >= 0)
    canRedo$.next(historyIndex < history.length - 1)
  }

  return {
    changes$: changes$.asObservable(),
    history$: changes$.pipe(
      scan(function (acc, change) {
        const newAcc = [...acc, change]
        return newAcc.slice(-maxHistory)
      }, [] as StateChange<T>[]),
      startWith([])
    ),
    undo() {
      if (historyIndex >= 0) {
        const change = history[historyIndex]
        store.setState(change.previous)
        historyIndex--
        updateCanUndoRedo()
      }
    },
    redo() {
      if (historyIndex < history.length - 1) {
        historyIndex++
        const change = history[historyIndex]
        store.setState(change.current)
        updateCanUndoRedo()
      }
    },
    canUndo$: canUndo$.asObservable(),
    canRedo$: canRedo$.asObservable(),
    destroy() {
      subscription.unsubscribe()
      changes$.complete()
      canUndo$.complete()
      canRedo$.complete()
    }
  }
}

// ============================================================================
// 命令模式实现
// ============================================================================

export class CommandBus<CommandMap extends Record<string, unknown>> {
  private commands$ = new Subject<
    Command<keyof CommandMap & string, CommandMap[keyof CommandMap]>
  >()
  private executedCommands: Command<keyof CommandMap & string, CommandMap[keyof CommandMap]>[] = []
  private undoneCommands: Command<keyof CommandMap & string, CommandMap[keyof CommandMap]>[] = []
  private maxHistory: number

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory
  }

  /** 执行命令 */
  async execute<K extends keyof CommandMap>(
    type: K,
    payload: CommandMap[K],
    handlers: {
      execute: () => Promise<void> | void
      undo?: () => Promise<void> | void
    }
  ): Promise<void> {
    const command: Command<K & string, CommandMap[K]> = {
      type: type as K & string,
      payload,
      ...handlers
    }

    await command.execute()

    this.executedCommands.push(command as any)
    this.undoneCommands = [] // 清空 redo 栈

    if (this.executedCommands.length > this.maxHistory) {
      this.executedCommands.shift()
    }

    this.commands$.next(command as any)
  }

  /** 撤销上一个命令 */
  async undo(): Promise<boolean> {
    const command = this.executedCommands.pop()
    if (!command || !command.undo) return false

    await command.undo()
    this.undoneCommands.push(command)
    return true
  }

  /** 重做上一个撤销的命令 */
  async redo(): Promise<boolean> {
    const command = this.undoneCommands.pop()
    if (!command) return false

    await command.execute()
    this.executedCommands.push(command)
    return true
  }

  /** 监听命令执行 */
  onCommand<K extends keyof CommandMap>(type: K): Observable<CommandMap[K]> {
    return this.commands$.pipe(
      filter(function (cmd) {
        return cmd.type === type
      }),
      map(function (cmd) {
        return cmd.payload as CommandMap[K]
      })
    )
  }

  /** 是否可以撤销 */
  get canUndo(): boolean {
    return (
      this.executedCommands.length > 0 &&
      this.executedCommands[this.executedCommands.length - 1]?.undo !== undefined
    )
  }

  /** 是否可以重做 */
  get canRedo(): boolean {
    return this.undoneCommands.length > 0
  }

  destroy(): void {
    this.commands$.complete()
    this.executedCommands = []
    this.undoneCommands = []
  }
}

// ============================================================================
// 数据流操作符工具
// ============================================================================

/**
 * 批量处理操作符 - 收集一段时间内的值然后批量处理
 */
export function batchProcess<T>(
  timeWindow: number,
  processor: (items: T[]) => void
): (source: Observable<T>) => Observable<T[]> {
  return function (source) {
    return source.pipe(
      bufferTime(timeWindow),
      filter(function (items) {
        return items.length > 0
      }),
      tap(processor)
    )
  }
}

/**
 * 重试操作符 - 带指数退避
 */
export function retryWithBackoff<T>(
  maxRetries: number,
  initialDelay: number = 1000
): (source: Observable<T>) => Observable<T> {
  return function (source) {
    let retryCount = 0

    return source.pipe(
      catchError(function (error) {
        if (retryCount >= maxRetries) {
          throw error
        }

        retryCount++
        const delay = initialDelay * Math.pow(2, retryCount - 1)

        return timer(delay).pipe(
          switchMap(function () {
            return source
          }),
          retryWithBackoff(maxRetries - retryCount, initialDelay)
        )
      })
    )
  }
}

/**
 * 并发控制操作符
 */
export function concurrentLimit<T, R>(
  project: (value: T) => Observable<R>,
  concurrency: number
): (source: Observable<T>) => Observable<R> {
  return function (source) {
    return source.pipe(mergeMap(project, concurrency))
  }
}

/**
 * 防抖 + 去重组合操作符
 */
export function debounceDistinct<T>(
  debounceMs: number,
  comparator?: (a: T, b: T) => boolean
): (source: Observable<T>) => Observable<T> {
  return function (source) {
    return source.pipe(debounceTime(debounceMs), distinctUntilChanged(comparator))
  }
}

// ============================================================================
// React Hooks 辅助
// ============================================================================

/**
 * 创建可用于 React useEffect 的订阅工厂
 */
export function createSubscriptionFactory<T>(
  observable$: Observable<T>,
  onValue: (value: T) => void,
  onError?: (error: Error) => void
): () => () => void {
  return function () {
    const subscription = observable$.subscribe({
      next: onValue,
      error: onError
    })

    return function () {
      subscription.unsubscribe()
    }
  }
}

/**
 * 创建带清理的事件监听器
 */
export function createEventListener<K extends keyof WindowEventMap>(
  target: Window | Document | HTMLElement,
  event: K,
  options?: AddEventListenerOptions
): Observable<WindowEventMap[K]> {
  return new Observable(function (subscriber) {
    const handler = function (e: Event) {
      subscriber.next(e as WindowEventMap[K])
    }

    target.addEventListener(event, handler, options)

    return function () {
      target.removeEventListener(event, handler, options)
    }
  })
}

// ============================================================================
// 导出全局事件总线实例
// ============================================================================

/** 全局应用事件类型 */
export interface AppEventMap {
  // Mirror 事件
  'mirror:created': { id: string; mirror: Mirror }
  'mirror:updated': { id: string; changes: Partial<Mirror> }
  'mirror:deleted': { id: string }
  'mirror:selected': { id: string | null }

  // MagneticTile 事件
  'magnetic-tile:created': { id: string; magneticTile: MagneticTile }
  'magnetic-tile:updated': { id: string; changes: Partial<MagneticTile> }
  'magnetic-tile:deleted': { id: string }
  'magnetic-tile:selected': { id: string | null }

  // UI 事件
  'ui:theme-changed': { theme: 'light' | 'dark' }
  'ui:sidebar-toggled': { open: boolean }
  'ui:modal-opened': { id: string; data?: unknown }
  'ui:modal-closed': { id: string }

  // 系统事件
  'system:error': { message: string; code?: string }
  'system:notification': { type: 'success' | 'info' | 'warning' | 'error'; message: string }
}

/** 全局事件总线 */
export const appEventBus = new EventBus<AppEventMap>({
  debug: import.meta.env.DEV,
  historySize: 100
})

/** 全局命令总线 */
export interface AppCommandMap {
  'mirror:create': Omit<Mirror, 'id' | 'createdAt' | 'updatedAt'>
  'mirror:update': { id: string; changes: Partial<Mirror> }
  'mirror:delete': { id: string }
  'magnetic-tile:create': Omit<MagneticTile, 'id' | 'createdAt' | 'updatedAt'>
  'magnetic-tile:update': { id: string; changes: Partial<MagneticTile> }
  'magnetic-tile:delete': { id: string }
}

export const appCommandBus = new CommandBus<AppCommandMap>()
