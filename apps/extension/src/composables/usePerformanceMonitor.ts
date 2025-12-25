/**
 * 性能监控系统
 *
 * 观测指标
 * - FPS（rAF 计数）
 * - 内存（performance.memory）
 * - 请求/错误计数、平均响应时间
 * - 自定义指标（custom map）
 *
 * 能力
 * - mark/measure 包装函数与阶段性测量
 * - 样本窗口统计与汇总
 */

import { onUnmounted, readonly, ref } from 'vue'

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  /** 内存使用 */
  memory?: {
    used: number
    total: number
    limit: number
  }
  /** FPS */
  fps: number
  /** 平均响应时间 */
  avgResponseTime: number
  /** 请求计数 */
  requestCount: number
  /** 错误计数 */
  errorCount: number
  /** 缓存命中率 */
  cacheHitRate: number
  /** 自定义指标 */
  custom: Record<string, number>
}

/**
 * 性能监控配置
 */
export interface PerformanceMonitorConfig {
  /** 采样间隔（毫秒） */
  sampleInterval?: number
  /** 最大样本数 */
  maxSamples?: number
  /** 是否启用内存监控 */
  enableMemory?: boolean
  /** 是否启用 FPS 监控 */
  enableFPS?: boolean
}

/**
 * 性能监控器
 */
export function usePerformanceMonitor(config: PerformanceMonitorConfig = {}) {
  const { sampleInterval = 1000, maxSamples = 60, enableMemory = true, enableFPS = true } = config

  // 指标存储
  const metrics = ref<PerformanceMetrics>({
    fps: 0,
    avgResponseTime: 0,
    requestCount: 0,
    errorCount: 0,
    cacheHitRate: 0,
    custom: {}
  })

  // 历史样本
  const samples = ref<PerformanceMetrics[]>([])

  // 响应时间记录
  const responseTimes: number[] = []

  // FPS 计算
  let frameCount = 0
  let lastFrameTime = Date.now()
  let rafId: number | null = null

  // 采样定时器
  let sampleTimer: ReturnType<typeof setInterval> | null = null

  /**
   * 记录帧
   */
  function recordFrame() {
    frameCount++
    rafId = requestAnimationFrame(recordFrame)
  }

  /**
   * 计算 FPS
   */
  function calculateFPS(): number {
    const now = Date.now()
    const elapsed = now - lastFrameTime
    const fps = Math.round((frameCount * 1000) / elapsed)
    frameCount = 0
    lastFrameTime = now
    return fps
  }

  /**
   * 获取内存使用
   */
  function getMemoryUsage() {
    if (!enableMemory || !(performance as any).memory) return undefined

    const memory = (performance as any).memory
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit
    }
  }

  /**
   * 记录请求
   */
  function recordRequest(duration: number) {
    responseTimes.push(duration)
    if (responseTimes.length > maxSamples) {
      responseTimes.shift()
    }
    metrics.value.requestCount++
  }

  /**
   * 记录错误
   */
  function recordError() {
    metrics.value.errorCount++
  }

  /**
   * 更新缓存命中率
   */
  function updateCacheHitRate(hits: number, total: number) {
    metrics.value.cacheHitRate = total > 0 ? hits / total : 0
  }

  /**
   * 设置自定义指标
   */
  function setCustomMetric(name: string, value: number) {
    metrics.value.custom[name] = value
  }

  /**
   * 采样
   */
  function sample() {
    const currentMetrics: PerformanceMetrics = {
      fps: enableFPS ? calculateFPS() : 0,
      avgResponseTime:
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0,
      requestCount: metrics.value.requestCount,
      errorCount: metrics.value.errorCount,
      cacheHitRate: metrics.value.cacheHitRate,
      custom: { ...metrics.value.custom }
    }

    if (enableMemory) {
      currentMetrics.memory = getMemoryUsage()
    }

    // 更新当前指标
    metrics.value = currentMetrics

    // 添加到历史样本
    samples.value.push(currentMetrics)
    if (samples.value.length > maxSamples) {
      samples.value.shift()
    }
  }

  /**
   * 启动监控
   */
  function start() {
    if (sampleTimer) return

    // 启动 FPS 监控
    if (enableFPS && typeof requestAnimationFrame !== 'undefined') {
      lastFrameTime = Date.now()
      frameCount = 0
      rafId = requestAnimationFrame(recordFrame)
    }

    // 启动采样
    sampleTimer = setInterval(() => {
      sample()
    }, sampleInterval)

    console.log('[PerformanceMonitor] Started')
  }

  /**
   * 停止监控
   */
  function stop() {
    if (sampleTimer) {
      clearInterval(sampleTimer)
      sampleTimer = null
    }

    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }

    console.log('[PerformanceMonitor] Stopped')
  }

  /**
   * 重置
   */
  function reset() {
    metrics.value = {
      fps: 0,
      avgResponseTime: 0,
      requestCount: 0,
      errorCount: 0,
      cacheHitRate: 0,
      custom: {}
    }
    samples.value = []
    responseTimes.length = 0
    frameCount = 0
  }

  /**
   * 获取统计信息
   */
  function getStats() {
    return {
      current: metrics.value,
      history: samples.value,
      summary: {
        avgFPS:
          samples.value.length > 0
            ? samples.value.reduce((sum, s) => sum + s.fps, 0) / samples.value.length
            : 0,
        avgResponseTime:
          samples.value.length > 0
            ? samples.value.reduce((sum, s) => sum + s.avgResponseTime, 0) / samples.value.length
            : 0,
        totalRequests: metrics.value.requestCount,
        totalErrors: metrics.value.errorCount,
        avgCacheHitRate:
          samples.value.length > 0
            ? samples.value.reduce((sum, s) => sum + s.cacheHitRate, 0) / samples.value.length
            : 0
      }
    }
  }

  /**
   * 性能标记
   */
  function mark(name: string) {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name)
    }
  }

  /**
   * 性能测量
   */
  function measure(name: string, startMark: string, endMark?: string) {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        if (endMark) {
          performance.measure(name, startMark, endMark)
        } else {
          performance.measure(name, startMark)
        }

        const entries = performance.getEntriesByName(name, 'measure')
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1]
          if (lastEntry) {
            const duration = lastEntry.duration
            recordRequest(duration)
            return duration
          }
        }
      } catch (error) {
        console.warn('[PerformanceMonitor] Measure failed:', error)
      }
    }
    return 0
  }

  /**
   * 清除性能标记
   */
  function clearMarks(name?: string) {
    if (typeof performance !== 'undefined' && performance.clearMarks) {
      performance.clearMarks(name)
    }
  }

  /**
   * 清除性能测量
   */
  function clearMeasures(name?: string) {
    if (typeof performance !== 'undefined' && performance.clearMeasures) {
      performance.clearMeasures(name)
    }
  }

  /**
   * 包装函数进行性能监控
   */
  function wrap<T extends (...args: any[]) => any>(fn: T, name?: string): T {
    const fnName = name ?? fn.name ?? 'anonymous'

    return ((...args: any[]) => {
      const startMark = `${fnName}-start`
      const endMark = `${fnName}-end`

      mark(startMark)

      try {
        const result = fn(...args)

        // 处理 Promise
        if (result instanceof Promise) {
          return result
            .then((value) => {
              mark(endMark)
              measure(fnName, startMark, endMark)
              clearMarks(startMark)
              clearMarks(endMark)
              return value
            })
            .catch((error) => {
              recordError()
              throw error
            })
        }

        mark(endMark)
        measure(fnName, startMark, endMark)
        clearMarks(startMark)
        clearMarks(endMark)

        return result
      } catch (error) {
        recordError()
        throw error
      }
    }) as T
  }

  // 组件卸载时清理
  onUnmounted(() => {
    stop()
  })

  return {
    metrics: readonly(metrics),
    samples: readonly(samples),
    start,
    stop,
    reset,
    getStats,
    recordRequest,
    recordError,
    updateCacheHitRate,
    setCustomMetric,
    mark,
    measure,
    clearMarks,
    clearMeasures,
    wrap
  }
}

export type PerformanceMonitor = ReturnType<typeof usePerformanceMonitor>
