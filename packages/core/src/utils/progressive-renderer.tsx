import {
  type Component,
  type VNode,
  defineComponent,
  h,
  ref,
  type Ref,
  type App,
  type Plugin,
  type DirectiveBinding,
  getCurrentInstance,
  onBeforeUnmount,
  nextTick,
  type ComponentPublicInstance,
  watch,
  createApp,
  onMounted
} from 'vue'

/**
 * 渲染优先级
 */
export enum RenderPriority {
  /** 高优先级 - 立即渲染 */
  HIGH = 'high',
  /** 中优先级 - 在requestAnimationFrame中渲染 */
  MEDIUM = 'medium',
  /** 低优先级 - 在requestIdleCallback中渲染 */
  LOW = 'low'
}

/**
 * 渲染策略接口
 */
export interface RenderStrategy {
  /**
   * 执行渲染策略
   * @param task 渲染任务
   * @param callback 渲染回调
   */
  execute(task: RenderTask, callback: () => void): void

  /**
   * 取消渲染
   * @param task 渲染任务
   */
  cancel(task: RenderTask): void
}

/**
 * 立即渲染策略
 */
class ImmediateRenderStrategy implements RenderStrategy {
  execute(task: RenderTask, callback: () => void): void {
    callback()
  }

  cancel(): void {
    // 立即渲染无需取消
  }
}

/**
 * 动画帧渲染策略
 */
class AnimationFrameRenderStrategy implements RenderStrategy {
  private frameId: number | null = null

  execute(_: RenderTask, callback: () => void): void {
    this.frameId = requestAnimationFrame(() => {
      this.frameId = null
      callback()
    })
  }

  cancel(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
  }
}

/**
 * IdleDeadline 接口定义
 */
interface IdleDeadline {
  timeRemaining: () => number
  didTimeout: boolean
}

/**
 * requestIdleCallback 和 cancelIdleCallback 的类型定义
 */
type RequestIdleCallback = (
  callback: (deadline: IdleDeadline) => void,
  options?: { timeout: number }
) => number

type CancelIdleCallback = (handle: number) => void

/**
 * 空闲时间渲染策略
 */
class IdleCallbackRenderStrategy implements RenderStrategy {
  private idleId: number | null = null
  private timeoutId: number | null = null
  private readonly hasIdleCallback =
    typeof window !== 'undefined' &&
    'requestIdleCallback' in window &&
    'cancelIdleCallback' in window

  execute(task: RenderTask, callback: () => void): void {
    // 清除之前的回调（如果存在）
    this.cancel()

    if (this.hasIdleCallback) {
      try {
        const requestIdleCallback = window.requestIdleCallback as RequestIdleCallback

        this.idleId = requestIdleCallback(
          (deadline: IdleDeadline) => {
            this.idleId = null

            // 如果有足够的空闲时间或已超时，则执行回调
            if (deadline.timeRemaining() > 0 || deadline.didTimeout) {
              callback()
            } else {
              // 如果没有足够的空闲时间，则重新调度
              this.execute(task, callback)
            }
          },
          { timeout: 500 } // 设置超时，确保最终会执行
        )
      } catch (error) {
        console.error('Error in requestIdleCallback:', error)
        // 降级为setTimeout
        this.fallbackToTimeout(callback)
      }
    } else {
      // 降级为setTimeout
      this.fallbackToTimeout(callback)
    }
  }

  private fallbackToTimeout(callback: () => void): void {
    this.timeoutId = window.setTimeout(() => {
      this.timeoutId = null
      callback()
    }, 100)
  }

  cancel(): void {
    if (this.idleId !== null && this.hasIdleCallback) {
      try {
        const cancelIdleCallback = window.cancelIdleCallback as CancelIdleCallback
        cancelIdleCallback(this.idleId)
      } catch (error) {
        console.error('Error in cancelIdleCallback:', error)
      }
      this.idleId = null
    }

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }
}

/**
 * 渲染策略工厂
 */
export class RenderStrategyFactory {
  private static strategies: Record<RenderPriority, RenderStrategy> = {
    [RenderPriority.HIGH]: new ImmediateRenderStrategy(),
    [RenderPriority.MEDIUM]: new AnimationFrameRenderStrategy(),
    [RenderPriority.LOW]: new IdleCallbackRenderStrategy()
  }

  /**
   * 获取渲染策略
   * @param priority 渲染优先级
   * @returns 渲染策略
   */
  static getStrategy(priority: RenderPriority): RenderStrategy {
    return this.strategies[priority]
  }

  /**
   * 注册自定义渲染策略
   * @param priority 渲染优先级
   * @param strategy 渲染策略
   */
  static registerStrategy(priority: RenderPriority, strategy: RenderStrategy): void {
    this.strategies[priority] = strategy
  }
}

/**
 * 渲染配置
 */
export interface ProgressiveRenderConfig {
  /** 渲染优先级 */
  priority?: RenderPriority
  /** 每批渲染的组件数量 */
  batchSize?: number
  /** 批次间隔时间(ms) */
  batchInterval?: number
  /** 是否显示加载占位符 */
  showPlaceholder?: boolean
  /** 自定义加载占位符组件 */
  placeholderComponent?: Component
  /** 渲染完成回调 */
  onComplete?: () => void
  /** 每批渲染完成回调 */
  onBatchComplete?: (renderedCount: number, totalCount: number) => void
  /** 自定义渲染策略 */
  renderStrategy?: RenderStrategy
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<Omit<ProgressiveRenderConfig, 'renderStrategy'>> & {
  renderStrategy: RenderStrategy | undefined
} = {
  priority: RenderPriority.MEDIUM,
  batchSize: 5,
  batchInterval: 16, // 约等于一帧的时间
  showPlaceholder: true,
  placeholderComponent: defineComponent({
    render() {
      return <div class="progressive-renderer-placeholder">加载中...</div>
    }
  }),
  onComplete: () => {},
  onBatchComplete: () => {},
  renderStrategy: undefined // 将在运行时根据priority设置
}

/**
 * 获取合并后的配置
 * @param config 用户配置
 * @returns 合并后的配置
 */
function getMergedConfig(config: ProgressiveRenderConfig = {}): Required<ProgressiveRenderConfig> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config } as Required<ProgressiveRenderConfig>

  // 如果没有指定渲染策略，则根据优先级获取
  if (!mergedConfig.renderStrategy) {
    mergedConfig.renderStrategy = RenderStrategyFactory.getStrategy(mergedConfig.priority)
  }

  return mergedConfig
}

/**
 * 渲染任务
 */
interface RenderTask<
  T extends Required<ProgressiveRenderConfig> = Required<ProgressiveRenderConfig>
> {
  id: string
  components: VNode[] | (() => VNode[])
  config: T
  renderedCount: Ref<number>
  isComplete: Ref<boolean>
  totalCount: number
  timeoutId?: number
}

/**
 * 任务管理器
 */
export class TaskManager {
  private static instance: TaskManager
  private tasks: Map<string, RenderTask<any>> = new Map()
  private isProcessorStarted = false

  /**
   * 获取任务管理器实例
   */
  static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager()
    }
    return TaskManager.instance
  }

  /**
   * 添加任务
   * @param task 渲染任务
   */
  addTask<T extends Required<ProgressiveRenderConfig>>(task: RenderTask<T>): void {
    this.tasks.set(task.id, task)
    this.startTaskProcessor()
  }

  /**
   * 移除任务
   * @param taskId 任务ID
   */
  removeTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (task && task.timeoutId) {
      clearTimeout(task.timeoutId)
    }
    this.tasks.delete(taskId)
  }

  /**
   * 获取任务
   * @param taskId 任务ID
   */
  getTask<T extends Required<ProgressiveRenderConfig>>(taskId: string): RenderTask<T> | undefined {
    return this.tasks.get(taskId) as RenderTask<T> | undefined
  }

  /**
   * 启动任务处理器
   */
  private startTaskProcessor(): void {
    if (this.isProcessorStarted) return
    this.isProcessorStarted = true

    // 处理所有任务
    this.processTasks()
  }

  /**
   * 处理所有任务
   */
  private processTasks(): void {
    // 按优先级顺序处理任务（高 -> 中 -> 低）
    // 确保高优先级任务先执行完毕
    const highPriorityTasks = Array.from(this.tasks.values()).filter(
      task => task.config.priority === RenderPriority.HIGH && !task.isComplete.value
    )

    if (highPriorityTasks.length > 0) {
      highPriorityTasks.forEach(task => this.renderNextBatch(task))
      // 如果有高优先级任务，先处理完再继续
      if (highPriorityTasks.some(task => !task.isComplete.value)) {
        // 安排下一次处理
        setTimeout(() => this.processTasks(), 16)
        return
      }
    }

    // 处理中优先级任务
    const mediumPriorityTasks = Array.from(this.tasks.values()).filter(
      task => task.config.priority === RenderPriority.MEDIUM && !task.isComplete.value
    )

    if (mediumPriorityTasks.length > 0) {
      mediumPriorityTasks.forEach(task => this.renderNextBatch(task))
      // 如果有中优先级任务，先处理完再继续
      if (mediumPriorityTasks.some(task => !task.isComplete.value)) {
        // 安排下一次处理
        setTimeout(() => this.processTasks(), 16)
        return
      }
    }

    // 处理低优先级任务
    const lowPriorityTasks = Array.from(this.tasks.values()).filter(
      task => task.config.priority === RenderPriority.LOW && !task.isComplete.value
    )

    if (lowPriorityTasks.length > 0) {
      lowPriorityTasks.forEach(task => this.renderNextBatch(task))
      // 如果有低优先级任务，安排下一次处理
      if (lowPriorityTasks.some(task => !task.isComplete.value)) {
        setTimeout(() => this.processTasks(), 16)
      }
    }

    // 检查是否所有任务都已完成
    const hasIncompleteTasks = Array.from(this.tasks.values()).some(task => !task.isComplete.value)

    // 如果还有未完成的任务，继续处理
    if (hasIncompleteTasks) {
      this.isProcessorStarted = true
    } else {
      this.isProcessorStarted = false
    }
  }

  /**
   * 渲染下一批组件
   * @param task 渲染任务
   */
  private renderNextBatch(task: RenderTask): void {
    if (task.isComplete.value) return

    // 清除之前的超时计时器（如果存在）
    if (task.timeoutId) {
      clearTimeout(task.timeoutId)
      task.timeoutId = undefined
    }

    const strategy =
      task.config.renderStrategy || RenderStrategyFactory.getStrategy(task.config.priority)

    try {
      strategy.execute(task, () => {
        const nextCount = Math.min(
          task.renderedCount.value + task.config.batchSize,
          task.totalCount
        )

        if (task.renderedCount.value < nextCount) {
          // 更新已渲染数量
          task.renderedCount.value = nextCount

          // 触发批次完成回调
          try {
            task.config.onBatchComplete(task.renderedCount.value, task.totalCount)
          } catch (error) {
            console.error('Error in onBatchComplete callback:', error)
          }

          if (task.renderedCount.value >= task.totalCount) {
            // 任务完成
            task.isComplete.value = true

            // 触发完成回调
            try {
              task.config.onComplete()
            } catch (error) {
              console.error('Error in onComplete callback:', error)
            }
          } else {
            // 安排下一批渲染
            task.timeoutId = window.setTimeout(() => {
              this.renderNextBatch(task)
            }, task.config.batchInterval)
          }
        }
      })
    } catch (error) {
      console.error('Error executing render strategy:', error)

      // 出错时，尝试使用立即渲染策略作为降级方案
      if (task.config.priority !== RenderPriority.HIGH) {
        console.warn('Falling back to immediate render strategy due to error')
        task.config.priority = RenderPriority.HIGH
        this.renderNextBatch(task)
      } else {
        // 如果已经是高优先级但仍然失败，标记为完成以避免无限循环
        task.isComplete.value = true
        console.error('Failed to render task even with high priority strategy')
      }
    }
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

/**
 * 创建渐进式渲染组件
 * @param components 要渲染的组件数组或返回组件数组的函数
 * @param config 渲染配置
 * @returns Vue组件
 */
export function createProgressiveRenderer(
  components: VNode[] | (() => VNode[]),
  config: ProgressiveRenderConfig = {}
): Component {
  const mergedConfig = getMergedConfig(config)

  const renderedCount = ref(0)
  const isComplete = ref(false)

  // 计算组件总数
  const getComponents = typeof components === 'function' ? components : () => components
  const totalCount = typeof components === 'function' ? 0 : components.length

  const taskId = generateId()
  const task: RenderTask = {
    id: taskId,
    components,
    config: mergedConfig,
    renderedCount,
    isComplete,
    totalCount
  }

  // 返回包装后的组件
  return defineComponent({
    name: 'ProgressiveRenderer',
    setup() {
      // 如果是函数，则在setup中调用以获取实际组件
      if (typeof components === 'function') {
        const resolvedComponents = getComponents()
        task.totalCount = resolvedComponents.length
      }

      // 添加到任务管理器
      TaskManager.getInstance().addTask(task)

      // 组件卸载时清理任务
      onBeforeUnmount(() => {
        TaskManager.getInstance().removeTask(taskId)
      })

      return () => {
        const currentComponents = typeof components === 'function' ? getComponents() : components

        const visibleComponents = currentComponents.slice(0, renderedCount.value)

        return (
          <div class="progressive-renderer">
            {visibleComponents}
            {!isComplete.value && mergedConfig.showPlaceholder && (
              <div class="progressive-renderer-placeholder-container">
                {h(mergedConfig.placeholderComponent)}
              </div>
            )}
          </div>
        )
      }
    }
  })
}

/**
 * 创建时间切片渲染器
 * @param renderFunction 渲染函数，接收已渲染数量和总数量作为参数
 * @param totalItems 总项目数
 * @param config 渲染配置
 * @returns Vue组件
 */
export function createTimeSliceRenderer(
  renderFunction: (renderedCount: number, totalItems: number) => VNode[],
  totalItems: number,
  config: ProgressiveRenderConfig = {}
): Component {
  const mergedConfig = getMergedConfig(config)

  const renderedCount = ref(0)
  const isComplete = ref(false)

  const taskId = generateId()
  const task: RenderTask = {
    id: taskId,
    components: () => renderFunction(renderedCount.value, totalItems),
    config: mergedConfig,
    renderedCount,
    isComplete,
    totalCount: totalItems
  }

  // 返回包装后的组件
  return defineComponent({
    name: 'TimeSliceRenderer',
    setup() {
      // 添加到任务管理器
      TaskManager.getInstance().addTask(task)

      // 组件卸载时清理任务
      onBeforeUnmount(() => {
        TaskManager.getInstance().removeTask(taskId)
      })

      return () => {
        const visibleComponents = renderFunction(renderedCount.value, totalItems)

        return (
          <div class="time-slice-renderer">
            {visibleComponents}
            {!isComplete.value && mergedConfig.showPlaceholder && (
              <div class="time-slice-renderer-placeholder">
                {h(mergedConfig.placeholderComponent)}
              </div>
            )}
          </div>
        )
      }
    }
  })
}

/**
 * 虚拟列表渲染器配置
 */
export interface VirtualProgressiveRenderConfig extends ProgressiveRenderConfig {
  /** 每项高度(px) */
  itemHeight?: number
  /** 容器高度(px) */
  containerHeight?: number
  /** 可视区域外预渲染的项目数量 */
  overscan?: number
}

/**
 * 获取合并后的虚拟列表配置
 * @param config 用户配置
 * @returns 合并后的配置
 */
function getMergedVirtualConfig(
  config: VirtualProgressiveRenderConfig = {}
): Required<VirtualProgressiveRenderConfig> {
  const baseConfig = getMergedConfig(config)

  return {
    ...baseConfig,
    itemHeight: config.itemHeight ?? 50,
    containerHeight: config.containerHeight ?? 500,
    overscan: config.overscan ?? 5
  }
}

/**
 * 创建虚拟列表渲染器
 * 结合了渐进式渲染和虚拟滚动的优点
 * @param items 数据项数组
 * @param itemRenderer 项目渲染函数
 * @param config 渲染配置
 * @returns Vue组件
 */
export function createVirtualProgressiveRenderer<T>(
  items: T[],
  itemRenderer: (item: T, index: number) => VNode,
  config: VirtualProgressiveRenderConfig = {}
): Component {
  // 返回包装后的组件
  return defineComponent({
    name: 'VirtualProgressiveRenderer',
    setup() {
      const mergedConfig = getMergedVirtualConfig(config)

      const renderedCount = ref(0)
      const isComplete = ref(false)
      const scrollTop = ref(0)
      const containerRef = ref<HTMLElement | null>(null)
      const visibleItemsCount = ref(0)

      const taskId = generateId()
      const task: RenderTask<Required<VirtualProgressiveRenderConfig>> = {
        id: taskId,
        components: () =>
          items.slice(0, renderedCount.value).map((item, index) => itemRenderer(item, index)),
        config: mergedConfig,
        renderedCount,
        isComplete,
        totalCount: items.length
      }

      // 添加到任务管理器
      TaskManager.getInstance().addTask(task)

      // 组件卸载时清理任务
      onBeforeUnmount(() => {
        TaskManager.getInstance().removeTask(taskId)
      })

      // 计算可见区域的起始和结束索引
      const getVisibleRange = () => {
        if (!containerRef.value) {
          return { start: 0, end: Math.min(20, renderedCount.value) }
        }

        const start = Math.max(
          0,
          Math.floor(scrollTop.value / mergedConfig.itemHeight) - mergedConfig.overscan
        )
        const visibleCount =
          Math.ceil(mergedConfig.containerHeight / mergedConfig.itemHeight) +
          mergedConfig.overscan * 2

        // 确保不超过已渲染的数量
        const end = Math.min(start + visibleCount, renderedCount.value)

        // 更新可见项目数量（用于调试）
        visibleItemsCount.value = end - start

        return {
          start,
          end
        }
      }

      // 处理滚动事件
      const handleScroll = (event: Event) => {
        const target = event.target as HTMLElement
        scrollTop.value = target.scrollTop
      }

      // 在组件挂载后获取容器引用
      onMounted(() => {
        nextTick(() => {
          const container = document.querySelector('.virtual-progressive-renderer') as HTMLElement
          if (container) {
            containerRef.value = container
            console.log('虚拟列表容器已挂载', {
              height: mergedConfig.containerHeight,
              itemHeight: mergedConfig.itemHeight,
              overscan: mergedConfig.overscan,
              totalItems: items.length
            })
          }
        })
      })

      return () => {
        const { start, end } = getVisibleRange()

        // 只渲染可见区域的项目
        const visibleItems = items.slice(start, end).map((item, index) => {
          return (
            <div
              key={`item-${start + index}`}
              style={{
                position: 'absolute',
                top: `${(start + index) * mergedConfig.itemHeight}px`,
                height: `${mergedConfig.itemHeight}px`,
                width: '100%'
              }}
            >
              {itemRenderer(item, start + index)}
            </div>
          )
        })

        // 计算内容容器的总高度
        // 使用已渲染的项目数量而不是总项目数量
        const contentHeight = renderedCount.value * mergedConfig.itemHeight

        return (
          <div
            class="virtual-progressive-renderer"
            style={{
              height: `${mergedConfig.containerHeight}px`,
              overflow: 'auto',
              position: 'relative'
            }}
            onScroll={handleScroll}
          >
            {/* 容器，高度等于已渲染项目的总高度 */}
            <div
              style={{
                height: `${contentHeight}px`,
                position: 'relative'
              }}
            >
              {visibleItems}
              {!isComplete.value && mergedConfig.showPlaceholder && (
                <div
                  style={{
                    position: 'absolute',
                    top: `${contentHeight}px`,
                    width: '100%'
                  }}
                >
                  {h(mergedConfig.placeholderComponent)}
                </div>
              )}
            </div>
            {/* 调试信息 */}
            {import.meta.env?.MODE !== 'production' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  padding: '4px',
                  fontSize: '12px',
                  borderRadius: '4px 0 0 0'
                }}
              >
                已渲染: {renderedCount.value}/{items.length} | 可见: {visibleItemsCount.value} |
                滚动位置: {scrollTop.value}
              </div>
            )}
          </div>
        )
      }
    }
  })
}

/**
 * 全局配置
 */
export function configureProgressiveRenderer(globalConfig: Partial<ProgressiveRenderConfig>): void {
  Object.assign(DEFAULT_CONFIG, globalConfig)
}

/**
 * 创建分组渲染器
 * 将大量组件分组，每组单独进行渐进式渲染
 * @param groups 组件分组
 * @param config 渲染配置
 * @returns Vue组件
 */
export function createGroupProgressiveRenderer(
  groups: Array<{
    components: VNode[] | (() => VNode[])
    config?: ProgressiveRenderConfig
  }>,
  config: ProgressiveRenderConfig = {}
): Component {
  const mergedConfig = getMergedConfig(config)

  // 为每个组创建渐进式渲染器
  const renderers = groups.map(group =>
    createProgressiveRenderer(group.components, { ...mergedConfig, ...group.config })
  )

  // 返回包装后的组件
  return defineComponent({
    name: 'GroupProgressiveRenderer',
    setup() {
      return () => (
        <div class="group-progressive-renderer">
          {renderers.map((renderer, index) => h(renderer, { key: index }))}
        </div>
      )
    }
  })
}

/**
 * 创建优先级队列渲染器
 * 根据优先级顺序渲染组件
 * @param priorityGroups 按优先级分组的组件
 * @param config 渲染配置
 * @returns Vue组件
 */
export function createPriorityQueueRenderer(
  priorityGroups: {
    [RenderPriority.HIGH]?: VNode[] | (() => VNode[])
    [RenderPriority.MEDIUM]?: VNode[] | (() => VNode[])
    [RenderPriority.LOW]?: VNode[] | (() => VNode[])
  },
  config: ProgressiveRenderConfig = {}
): Component {
  const groups = []

  // 高优先级组
  if (priorityGroups[RenderPriority.HIGH]) {
    groups.push({
      components: priorityGroups[RenderPriority.HIGH],
      config: { ...config, priority: RenderPriority.HIGH }
    })
  }

  // 中优先级组
  if (priorityGroups[RenderPriority.MEDIUM]) {
    groups.push({
      components: priorityGroups[RenderPriority.MEDIUM],
      config: { ...config, priority: RenderPriority.MEDIUM }
    })
  }

  // 低优先级组
  if (priorityGroups[RenderPriority.LOW]) {
    groups.push({
      components: priorityGroups[RenderPriority.LOW],
      config: { ...config, priority: RenderPriority.LOW }
    })
  }

  return createGroupProgressiveRenderer(groups, config)
}

/**
 * v-progressive-for 指令处理函数
 */
function handleProgressiveFor(
  el: Element,
  binding: DirectiveBinding,
  vnode: VNode,
  config: ProgressiveRenderConfig = {}
): void {
  // 获取指令值（应该是一个数组）
  const items = binding.value

  if (!Array.isArray(items)) {
    console.error('[v-progressive-for] expects an array value')
    return
  }

  // 获取组件实例
  const instance = getCurrentInstance()
  if (!instance) return

  // 清理旧任务（如果存在）
  const oldTaskId = el.getAttribute('data-progressive-task-id')
  if (oldTaskId) {
    TaskManager.getInstance().removeTask(oldTaskId)
  }

  // 创建一个唯一ID
  const id = `progressive-for-${generateId()}`
  el.setAttribute('data-progressive-for-id', id)

  // 创建渲染任务
  const renderedCount = ref(0)
  const isComplete = ref(false)

  const taskId = generateId()
  el.setAttribute('data-progressive-task-id', taskId)

  const mergedConfig = getMergedConfig(config)

  const task: RenderTask = {
    id: taskId,
    components: () => [], // 这里不需要实际的组件，我们会直接操作DOM
    config: mergedConfig,
    renderedCount,
    isComplete,
    totalCount: items.length
  }

  // 添加到任务管理器
  TaskManager.getInstance().addTask(task)

  // 清理函数
  const cleanup = () => {
    TaskManager.getInstance().removeTask(taskId)
  }

  // 在组件卸载时清理
  if (instance.proxy) {
    onBeforeUnmount(cleanup)
  }

  // 初始渲染
  nextTick(() => {
    // 创建文档片段，用于批量更新DOM
    const fragment = document.createDocumentFragment()
    const container = document.createElement('div')
    container.className = 'progressive-for-container'

    // 监听渲染进度变化
    const unwatch = watch(renderedCount, newCount => {
      // 渲染新增的项目
      const startIndex = Math.max(0, container.children.length)
      const endIndex = Math.min(newCount, items.length)

      if (startIndex < endIndex) {
        // 创建新的元素
        for (let i = startIndex; i < endIndex; i++) {
          const itemEl = document.createElement('div')
          itemEl.className = 'progressive-for-item'
          itemEl.dataset.index = i.toString()

          // 这里应该使用Vue的渲染函数来渲染每个项目
          // 但这需要更复杂的实现，这里简化为文本内容
          itemEl.textContent = JSON.stringify(items[i])

          container.appendChild(itemEl)
        }

        // 触发批次完成回调
        mergedConfig.onBatchComplete(newCount, items.length)

        // 检查是否完成
        if (newCount >= items.length) {
          isComplete.value = true
          mergedConfig.onComplete()
          unwatch() // 停止监听
        }
      }
    })

    // 添加容器到元素
    el.innerHTML = ''
    el.appendChild(container)

    // 如果需要显示占位符
    if (mergedConfig.showPlaceholder) {
      const placeholderContainer = document.createElement('div')
      placeholderContainer.className = 'progressive-for-placeholder'

      // 使用Vue渲染占位符组件
      const placeholderVNode = h(mergedConfig.placeholderComponent)
      const placeholderApp = createApp({
        render: () => placeholderVNode
      })

      placeholderApp.mount(placeholderContainer)
      el.appendChild(placeholderContainer)

      // 当渲染完成时移除占位符
      watch(isComplete, complete => {
        if (complete) {
          placeholderApp.unmount()
          el.removeChild(placeholderContainer)
        }
      })
    }
  })
}

/**
 * v-progressive-for 指令
 */
const progressiveForDirective = {
  mounted(el: Element, binding: DirectiveBinding, vnode: VNode) {
    handleProgressiveFor(el, binding, vnode)
  },

  /**
   * 指令使用示例:
   *
   * ```vue
   * <template>
   *   <!-- 基本用法 -->
   *   <div v-progressive-for="items"></div>
   *
   *   <!-- 带配置的用法 -->
   *   <div v-progressive-for="{
   *     items: largeDataset,
   *     config: {
   *       batchSize: 20,
   *       priority: RenderPriority.LOW,
   *       showPlaceholder: true
   *     }
   *   }"></div>
   * </template>
   *
   * <script setup>
   * import { RenderPriority } from '@desktop-widgets/core'
   *
   * // 数据
   * const items = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `项目 ${i}` }))
   * const largeDataset = Array.from({ length: 5000 }, (_, i) => ({ id: i, name: `大数据项目 ${i}` }))
   * </script>
   * ```
   */
  updated(el: Element, binding: DirectiveBinding, vnode: VNode) {
    // 获取任务ID
    const id = el.getAttribute('data-progressive-for-id')
    if (!id) return

    // 重新处理
    handleProgressiveFor(el, binding, vnode)
  },
  unmounted(el: Element) {
    // 获取任务ID
    const id = el.getAttribute('data-progressive-for-id')
    if (!id) return

    // 清理任务
    const taskId = el.getAttribute('data-progressive-task-id')
    if (taskId) {
      TaskManager.getInstance().removeTask(taskId)
    }

    // 移除属性
    el.removeAttribute('data-progressive-for-id')
    el.removeAttribute('data-progressive-task-id')
  }
}

/**
 * 渐进式渲染组件
 */
export const ProgressiveRenderer = defineComponent({
  name: 'ProgressiveRenderer',
  props: {
    items: {
      type: Array,
      required: true
    },
    renderItem: {
      type: Function,
      required: true
    },
    config: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    // 每次组件重新创建时，创建新的响应式状态
    const mergedConfig = getMergedConfig(props.config as ProgressiveRenderConfig)
    const renderedCount = ref(0)
    const isComplete = ref(false)

    // 计算组件总数
    const items = props.items as any[]
    const renderItem = props.renderItem as (item: any, index: number) => VNode
    const totalCount = items.length

    const taskId = generateId()
    const task: RenderTask = {
      id: taskId,
      components: () =>
        items.slice(0, renderedCount.value).map((item, index) => renderItem(item, index)),
      config: mergedConfig,
      renderedCount,
      isComplete,
      totalCount
    }

    // 添加到任务管理器
    TaskManager.getInstance().addTask(task)

    // 组件挂载后打印调试信息
    onMounted(() => {
      console.log('ProgressiveRenderer 组件已挂载', {
        items: items.length,
        config: mergedConfig
      })
    })

    // 组件卸载时清理任务
    onBeforeUnmount(() => {
      TaskManager.getInstance().removeTask(taskId)
    })

    return () => {
      const visibleItems = items.slice(0, renderedCount.value)

      return (
        <div class="progressive-renderer">
          {visibleItems.map((item, index) => renderItem(item, index))}
          {!isComplete.value && mergedConfig.showPlaceholder && (
            <div class="progressive-renderer-placeholder-container">
              {h(mergedConfig.placeholderComponent)}
            </div>
          )}
          {/* 调试信息 */}
          {import.meta.env?.MODE !== 'production' && (
            <div
              style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '4px',
                fontSize: '12px',
                borderRadius: '4px 0 0 0'
              }}
            >
              已渲染: {renderedCount.value}/{items.length}
            </div>
          )}
        </div>
      )
    }
  }
})

/**
 * 虚拟列表组件
 */
export const VirtualList = defineComponent({
  name: 'VirtualList',
  props: {
    items: {
      type: Array,
      required: true
    },
    renderItem: {
      type: Function,
      required: true
    },
    config: {
      type: Object,
      default: () => ({})
    },
    itemHeight: {
      type: Number,
      default: 40
    },
    overscan: {
      type: Number,
      default: 5
    }
  },
  setup(props) {
    // 每次组件重新创建时，创建新的响应式状态
    const items = props.items as any[]
    const renderItem = props.renderItem as (item: any, index: number) => VNode

    // 合并配置，添加虚拟列表特有的配置
    const mergedConfig = {
      ...getMergedConfig(props.config as ProgressiveRenderConfig),
      itemHeight: props.itemHeight,
      overscan: props.overscan,
      isVirtual: true
    }

    // 创建响应式状态
    const renderedCount = ref(0)
    const isComplete = ref(false)
    const containerRef = ref<HTMLElement | null>(null)
    const scrollTop = ref(0)
    const visibleItemsCount = ref(0)

    // 计算组件总数
    const totalCount = items.length

    // 获取可见范围
    const getVisibleRange = () => {
      if (!containerRef.value) {
        return { start: 0, end: Math.min(mergedConfig.batchSize, totalCount) }
      }

      const { itemHeight, overscan } = mergedConfig
      const containerHeight = containerRef.value.clientHeight

      // 计算可见区域的起始和结束索引
      const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - overscan)
      const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2
      const endIndex = Math.min(totalCount, startIndex + visibleCount)

      visibleItemsCount.value = endIndex - startIndex

      return {
        start: startIndex,
        end: endIndex
      }
    }

    // 处理滚动事件
    const handleScroll = (e: Event) => {
      if (e.target) {
        scrollTop.value = (e.target as HTMLElement).scrollTop
      }
    }

    // 组件挂载后设置容器引用
    onMounted(async () => {
      await nextTick()
      // 打印调试信息
      console.log('虚拟列表已挂载', {
        items: items.length,
        config: mergedConfig,
        container: containerRef.value
      })
    })

    // 创建任务
    const taskId = generateId()
    const task: RenderTask = {
      id: taskId,
      components: () => {
        // 虚拟列表只渲染可见区域的组件
        const { start, end } = getVisibleRange()
        return items
          .slice(0, renderedCount.value)
          .slice(start, end)
          .map((item, index) => renderItem(item, start + index))
      },
      config: mergedConfig,
      renderedCount,
      isComplete,
      totalCount
    }

    // 添加到任务管理器
    TaskManager.getInstance().addTask(task)

    // 组件卸载时清理任务
    onBeforeUnmount(() => {
      TaskManager.getInstance().removeTask(taskId)
    })

    // 组件挂载后打印调试信息
    onMounted(() => {
      console.log('VirtualList 组件已挂载', {
        items: items.length,
        config: mergedConfig
      })
    })

    return () => {
      const { start, end } = getVisibleRange()
      const visibleItems = items.slice(0, renderedCount.value).slice(start, end)

      // 计算内容总高度
      const contentHeight = totalCount * mergedConfig.itemHeight

      return (
        <div
          class="virtual-list-container"
          style={{ height: '100%', overflow: 'auto', position: 'relative' }}
          ref={containerRef}
          onScroll={handleScroll}
        >
          <div
            class="virtual-list-content"
            style={{ height: `${contentHeight}px`, position: 'relative' }}
          >
            <div
              class="virtual-list-items"
              style={{
                position: 'absolute',
                top: `${start * mergedConfig.itemHeight}px`,
                width: '100%'
              }}
            >
              {visibleItems.map((item, index) => (
                <div key={start + index} style={{ height: `${mergedConfig.itemHeight}px` }}>
                  {renderItem(item, start + index)}
                </div>
              ))}
            </div>
            {!isComplete.value && mergedConfig.showPlaceholder && (
              <div class="virtual-list-placeholder-container">
                {h(mergedConfig.placeholderComponent)}
              </div>
            )}
            {/* 调试信息 */}
            {import.meta.env?.MODE !== 'production' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  padding: '4px',
                  fontSize: '12px',
                  borderRadius: '4px 0 0 0',
                  zIndex: 1000
                }}
              >
                已渲染: {renderedCount.value}/{items.length} | 可见: {visibleItemsCount.value} |
                滚动位置: {scrollTop.value}
              </div>
            )}
          </div>
        </div>
      )
    }
  }
})

/**
 * 插件选项
 */
export interface ProgressiveRendererOptions {
  /** 全局配置 */
  config?: ProgressiveRenderConfig
  /** 是否注册指令 */
  directive?: boolean
  /** 是否注册组件 */
  components?: boolean
  /** 自定义指令名称 */
  directiveName?: string
  /** 自定义组件名称前缀 */
  componentPrefix?: string
}

/**
 * 渐进式渲染插件
 */
export const ProgressiveRendererPlugin: Plugin = {
  install(app: App, options: ProgressiveRendererOptions = {}) {
    // 应用全局配置
    if (options.config) {
      configureProgressiveRenderer(options.config)
    }

    // 注册指令
    if (options.directive !== false) {
      const directiveName = options.directiveName || 'progressive-for'
      app.directive(directiveName, progressiveForDirective)
    }

    // 注册组件
    if (options.components !== false) {
      const prefix = options.componentPrefix || ''
      app.component(`${prefix}ProgressiveRenderer`, ProgressiveRenderer)
      app.component(`${prefix}VirtualList`, VirtualList)
    }

    // 添加全局属性
    app.config.globalProperties.$progressiveRenderer = {
      createProgressiveRenderer,
      createTimeSliceRenderer,
      createVirtualProgressiveRenderer,
      createGroupProgressiveRenderer,
      createPriorityQueueRenderer,
      configureProgressiveRenderer,
      RenderPriority
    }
  }
}

// 默认导出插件
export default ProgressiveRendererPlugin
