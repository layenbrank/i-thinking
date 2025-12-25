/**
 * 缓存策略枚举
 */
export enum CacheStrategy {
  /** 最近最少使用 */
  LRU = 'LRU',
  /** 最不经常使用 */
  LFU = 'LFU',
  /** 先进先出 */
  FIFO = 'FIFO',
  /** 时间过期 */
  TTL = 'TTL'
}

/**
 * 缓存条目接口
 */
interface CacheEntry<V> {
  key: string
  value: V
  createdAt: number
  lastAccessed: number
  accessCount: number
  expiresAt?: number
}

/**
 * 缓存统计接口
 */
interface CacheStats {
  requests: number
  hits: number
  misses: number
  hitRate: number
  evictions: number
  size: number
}

/**
 * LRU 缓存实现
 */
class LRUCache<K, V> {
  private readonly capacity: number
  private cache: Map<K, CacheEntry<V>>
  private accessOrder: K[]
  private cacheStats: CacheStats

  constructor(capacity = 100) {
    this.capacity = capacity
    this.cache = new Map()
    this.accessOrder = []
    this.cacheStats = {
      requests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
      size: 0
    }
  }

  get(key: K): V | undefined {
    this.cacheStats.requests++

    const entry = this.cache.get(key)
    if (!entry) {
      this.cacheStats.misses++
      this.updateHitRate()
      return undefined
    }

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key)
      this.cacheStats.misses++
      this.updateHitRate()
      return undefined
    }

    // 更新访问信息
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.cacheStats.hits++
    this.updateHitRate()

    // 移动到访问列表头部
    this.moveToFront(key)

    return entry.value
  }

  set(key: K, value: V, ttl?: number): void {
    const now = Date.now()

    // 如果已存在，先删除旧的
    if (this.cache.has(key)) {
      this.delete(key)
    }

    // 如果超过容量，删除最久未使用的
    if (this.cache.size >= this.capacity) {
      const lru = this.accessOrder.shift()
      if (lru !== undefined) {
        this.cache.delete(lru)
        this.cacheStats.evictions++
      }
    }

    const entry: CacheEntry<V> = {
      key: String(key),
      value,
      createdAt: now,
      lastAccessed: now,
      accessCount: 0,
      expiresAt: ttl ? now + ttl : undefined
    }

    this.cache.set(key, entry)
    this.accessOrder.push(key)
    this.cacheStats.size = this.cache.size
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key)
      return false
    }

    return true
  }

  delete(key: K): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
      this.cacheStats.size = this.cache.size
    }
    return deleted
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.cacheStats.size = 0
  }

  size(): number {
    return this.cache.size
  }

  stats(): CacheStats {
    return { ...this.cacheStats }
  }

  private moveToFront(key: K): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }
  }

  private updateHitRate(): void {
    this.cacheStats.hitRate =
      this.cacheStats.requests > 0 ? this.cacheStats.hits / this.cacheStats.requests : 0
  }
}

/**
 * 依赖缓存 Composable
 */
export function useDependencyCache<K = any, V = any>(
  strategy: CacheStrategy = CacheStrategy.LRU,
  capacity = 100
) {
  let cache: LRUCache<K, V>

  // 根据策略创建缓存
  switch (strategy) {
    case CacheStrategy.LRU:
      cache = new LRUCache<K, V>(capacity)
      break
    // TODO: 实现其他策略 (LFU, FIFO, TTL)
    default:
      cache = new LRUCache<K, V>(capacity)
  }

  /**
   * 预热缓存
   */
  function prime(entries: { key: K; value: V; ttl?: number }[]) {
    entries.forEach(({ key, value, ttl }) => {
      cache.set(key, value, ttl)
    })
  }

  /**
   * 获取多个值
   */
  function getMany(keys: K[]): Map<K, V> {
    const result = new Map<K, V>()
    keys.forEach((key) => {
      const value = cache.get(key)
      if (value !== undefined) {
        result.set(key, value)
      }
    })
    return result
  }

  /**
   * 设置多个值
   */
  function setMany(entries: { key: K; value: V; ttl?: number }[]) {
    entries.forEach(({ key, value, ttl }) => {
      cache.set(key, value, ttl)
    })
  }

  return {
    get: (key: K) => cache.get(key),
    set: (key: K, value: V, ttl?: number) => cache.set(key, value, ttl),
    has: (key: K) => cache.has(key),
    delete: (key: K) => cache.delete(key),
    clear: () => cache.clear(),
    size: () => cache.size(),
    stats: () => cache.stats(),
    prime,
    getMany,
    setMany
  }
}

export type DependencyCache = ReturnType<typeof useDependencyCache>
