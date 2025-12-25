/**
 * 批处理配置接口
 *
 * 说明
 * - 按大小/时间窗口聚合消息，减少主线程负载
 * - 可使用 requestIdleCallback 在空闲时批量处理
 * - 支持高优先级消息队列，确保关键消息抢占处理
 */
export interface BatcherConfig {
  /** 最大批次大小 */
  maxSize: number
  /** 最大等待时间（毫秒） */
  maxWait: number
  /** 是否使用空闲回调 */
  useIdleCallback?: boolean
  /** 优先级处理 */
  priorityThreshold?: number
}

/**
 * 批处理消息
 */
interface BatchMessage<T = any> {
  id: string
  data: T
  priority: 'high' | 'normal' | 'low'
  timestamp: number
}

/**
 * 消息批处理器
 */
export function useMessageBatcher<T = any>(config: BatcherConfig) {
  const { maxSize, maxWait, useIdleCallback = true, priorityThreshold = 5 } = config

  const queue: BatchMessage<T>[] = []
  const highPriorityQueue: BatchMessage<T>[] = []
  let timer: ReturnType<typeof setTimeout> | null = null
  let idleCallbackId: number | null = null
  let messageId = 0
  let onFlushCallback: ((messages: T[]) => void) | null = null

  /**
   * 生成消息ID
   */
  function generateMessageId(): string {
    return `msg_${Date.now()}_${++messageId}`
  }

  /**
   * 刷新队列
   * - 先处理高优先级，再处理普通队列
   * - onFlushCallback 统一下发批次数据
   */
  function flush() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    if (idleCallbackId !== null && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(idleCallbackId)
      idleCallbackId = null
    }

    // 先处理高优先级队列
    if (highPriorityQueue.length > 0) {
      const messages = highPriorityQueue.map((msg) => msg.data)
      highPriorityQueue.length = 0
      onFlushCallback?.(messages)
    }

    // 处理普通队列
    if (queue.length > 0) {
      const messages = queue.map((msg) => msg.data)
      queue.length = 0
      onFlushCallback?.(messages)
    }
  }

  /**
   * 调度刷新
   * - 若开启 useIdleCallback，则在浏览器空闲时批处理
   * - 否则按 maxWait 触发定时批处理
   */
  function scheduleFlush() {
    if (timer) return

    if (useIdleCallback && typeof requestIdleCallback !== 'undefined') {
      idleCallbackId = requestIdleCallback(
        () => {
          flush()
        },
        { timeout: maxWait }
      )
    } else {
      timer = setTimeout(() => {
        flush()
      }, maxWait)
    }
  }

  /**
   * 添加消息到队列
   */
  function add(data: T, priority: 'high' | 'normal' | 'low' = 'normal') {
    const message: BatchMessage<T> = {
      id: generateMessageId(),
      data,
      priority,
      timestamp: Date.now()
    }

    // 高优先级消息
    if (priority === 'high') {
      highPriorityQueue.push(message)

      // 高优先级队列达到阈值立即刷新
      if (highPriorityQueue.length >= priorityThreshold) {
        flush()
        return
      }
    } else {
      queue.push(message)

      // 队列满了立即刷新
      if (queue.length >= maxSize) {
        flush()
        return
      }
    }

    // 调度刷新
    scheduleFlush()
  }

  /**
   * 清空队列
   */
  function drain() {
    queue.length = 0
    highPriorityQueue.length = 0
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (idleCallbackId !== null && typeof cancelIdleCallback !== 'undefined') {
      cancelIdleCallback(idleCallbackId)
      idleCallbackId = null
    }
  }

  /**
   * 注册刷新回调
   */
  function onFlush(callback: (messages: T[]) => void) {
    onFlushCallback = callback
    return () => {
      onFlushCallback = null
    }
  }

  /**
   * 获取队列大小
   */
  const size = computed(() => queue.length + highPriorityQueue.length)

  /**
   * 清理
   */
  function dispose() {
    drain()
    onFlushCallback = null
  }

  return {
    add,
    flush,
    drain,
    onFlush,
    size: readonly(size),
    dispose
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { leading?: boolean; trailing?: boolean } = {}
): T & { cancel: () => void; flush: () => void } {
  const { leading = true, trailing = true } = options

  let timeout: ReturnType<typeof setTimeout> | null = null
  let previous = 0
  let result: any
  let args: any[] | null = null

  const later = () => {
    previous = leading === false ? 0 : Date.now()
    timeout = null
    if (args) {
      result = func(...args)
      args = null
    }
  }

  const throttled = ((...newArgs: any[]) => {
    const now = Date.now()
    if (!previous && leading === false) previous = now

    const remaining = wait - (now - previous)
    args = newArgs

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      previous = now
      result = func(...args)
      if (!timeout) {
        args = null
      }
    } else if (!timeout && trailing) {
      timeout = setTimeout(later, remaining)
    }

    return result
  }) as T & { cancel: () => void; flush: () => void }

  throttled.cancel = () => {
    if (timeout) clearTimeout(timeout)
    previous = 0
    timeout = null
    args = null
  }

  throttled.flush = () => {
    if (timeout) {
      clearTimeout(timeout)
      later()
    }
  }

  return throttled
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: { immediate?: boolean; maxWait?: number } = {}
): T & { cancel: () => void; flush: () => void } {
  const { immediate = false, maxWait } = options

  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastCallTime = 0
  let lastInvokeTime = 0
  let result: any
  let args: any[] | null = null

  const invokeFunc = (time: number) => {
    const callArgs = args ?? []
    args = null
    lastInvokeTime = time
    result = func(...callArgs)
    return result
  }

  const leadingEdge = (time: number) => {
    lastInvokeTime = time
    timeout = setTimeout(timerExpired, wait)
    return immediate ? invokeFunc(time) : result
  }

  const remainingWait = (time: number) => {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting
  }

  const shouldInvoke = (time: number) => {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    return (
      lastCallTime === 0 ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  const timerExpired = () => {
    const time = Date.now()
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    timeout = setTimeout(timerExpired, remainingWait(time))
  }

  const trailingEdge = (time: number) => {
    timeout = null
    if (args) {
      return invokeFunc(time)
    }
    args = null
    return result
  }

  const debounced = ((...newArgs: any[]) => {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastCallTime = time
    args = newArgs

    if (isInvoking) {
      if (timeout === null) {
        return leadingEdge(lastCallTime)
      }
      if (maxWait !== undefined) {
        timeout = setTimeout(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    timeout ??= setTimeout(timerExpired, wait)
    return result
  }) as T & { cancel: () => void; flush: () => void }

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout)
    lastInvokeTime = 0
    lastCallTime = 0
    timeout = null
    args = null
  }

  debounced.flush = () => {
    return timeout === null ? result : trailingEdge(Date.now())
  }

  return debounced
}

export type MessageBatcher<T = any> = ReturnType<typeof useMessageBatcher<T>>
