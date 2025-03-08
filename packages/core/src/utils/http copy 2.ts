// @ts-nocheck
/* eslint-disable */
import axios, {
  all,
  Axios,
  spread,
  isCancel,
  toFormData,
  formToJSON,
  getAdapter,
  mergeConfig,
  isAxiosError,
  AxiosHeaders,
  HttpStatusCode,
  type Method,
  type Cancel,
  type Canceler,
  type AxiosError,
  type AxiosStatic,
  type CancelToken,
  type AxiosAdapter,
  type AxiosPromise,
  type CancelStatic,
  type ParamEncoder,
  type ResponseType,
  type AxiosInstance,
  type AxiosDefaults,
  type AddressFamily,
  type AxiosResponse,
  type CanceledError,
  type LookupAddress,
  type HeadersDefaults,
  type GenericFormData,
  type AxiosProxyConfig,
  type responseEncoding,
  type AxiosHeaderValue,
  type SerializerOptions,
  type CancelTokenSource,
  type CancelTokenStatic,
  type SerializerVisitor,
  type LookupAddressEntry,
  type AxiosRequestConfig,
  type AxiosProgressEvent,
  type GenericAbortSignal,
  type AxiosRequestHeaders,
  type TransitionalOptions,
  type CreateAxiosDefaults,
  type AxiosResponseHeaders,
  type AxiosBasicCredentials,
  type FormSerializerOptions,
  type RawAxiosRequestConfig,
  type RawAxiosRequestHeaders,
  type FormDataVisitorHelpers,
  type CustomParamsSerializer,
  type GenericHTMLFormElement,
  type AxiosInterceptorManager,
  type RawAxiosResponseHeaders,
  type AxiosRequestTransformer,
  type AxiosInterceptorOptions,
  type ParamsSerializerOptions,
  type AxiosResponseTransformer,
  type InternalAxiosRequestConfig
} from 'axios'

// 类型定义
// =========================================

/**
 * 自定义 HTTP 错误类
 */
export class HttpError extends Error {
  status?: number
  code?: string | number
  data?: any
  timestamp: number

  constructor(message?: string, options?: { status?: number; code?: string | number; data?: any }) {
    super(message)
    this.name = 'HttpError'
    this.status = options?.status
    this.code = options?.code
    this.data = options?.data
    this.timestamp = Date.now()
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * 请求配置扩展
 */
declare module 'axios' {
  export interface AxiosRequestConfig {
    // 是否取消重复请求
    cancelDuplicated?: boolean
    // 重试配置
    retry?: {
      // 重试次数
      count: number
      // 重试延迟(ms)
      delay: number
    }
    // 是否显示错误提示
    showErrorMessage?: boolean
    // 是否返回原始响应（不经过拦截器处理）
    raw?: boolean
    // 自定义请求标识符（用于取消重复请求）
    requestId?: string
    // 请求元数据
    metadata?: {
      // 请求开始时间
      startTime?: number
      // 其他元数据
      [key: string]: any
    }
    // 缓存配置
    cache?:
      | boolean
      | {
          key?: string
          ttl?: number
        }
    // 请求优先级
    priority?: RequestPriority
    // 是否绕过队列直接发送请求
    bypassQueue?: boolean
  }

  export interface AxiosResponse {
    /**
     * 标记响应是否来自缓存
     */
    cached?: boolean
  }
}

/**
 * 缓存项
 */
export interface CacheItem<T = any> {
  data: T
  timestamp: number
  expires: number
}

/**
 * 缓存策略接口
 */
export interface CacheStrategy {
  get<T = any>(key: string): Promise<T | null> | T | null
  set<T = any>(key: string, value: T, ttl?: number): Promise<void> | void
  has(key: string): Promise<boolean> | boolean
  delete(key: string): Promise<void> | void
  clear(): Promise<void> | void
}

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  url: string
  method: string
  requestId?: string
  startTime: number
  endTime: number
  duration: number
  status: number
  slow: boolean
  cached: boolean
}

/**
 * 性能监控接口
 */
export interface PerformanceMonitor {
  recordMetrics(metrics: PerformanceMetrics): void
  getAverageResponseTime(url?: string, method?: string): number
  getSlowRequests(threshold?: number): PerformanceMetrics[]
  getMetrics(): PerformanceMetrics[]
  clear(): void
}

/**
 * 请求优先级
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * 队列中的请求项
 */
export interface QueuedRequest {
  id: string
  config: AxiosRequestConfig
  priority: RequestPriority
  resolve: (value: any) => void
  reject: (reason: any) => void
  timestamp: number
}

/**
 * 并发控制配置
 */
export interface ConcurrencyConfig {
  // 最大并发请求数
  maxConcurrent: number
  // 队列大小限制（0 表示无限制）
  queueSize: number
  // 队列满时的行为：丢弃新请求或丢弃最低优先级请求
  queueFullStrategy: 'reject-new' | 'drop-lowest'
  // 请求超时时间（毫秒，0 表示无超时）
  queueTimeout: number
}

/**
 * HTTP 客户端配置
 */
export interface HttpClientConfig extends CreateAxiosDefaults {
  // 请求基础路径
  baseURL?: string
  // 请求超时时间
  timeout?: number
  // 是否启用请求重复取消
  enableCancelDuplicated?: boolean
  // 默认重试配置
  defaultRetry?: {
    count: number
    delay: number
  }
  // 获取认证令牌的函数
  getToken?: () => string | null | Promise<string | null>
  // 设置认证令牌的函数
  setAuthHeader?: (headers: any, token: string) => void
  // 错误处理器
  errorHandler?: ErrorHandler
  // 响应处理器
  responseHandler?: ResponseHandler
  // 事件总线
  eventBus?: EventBus
  // 日志记录器
  logger?: Logger
  // 慢请求阈值（毫秒）
  slowRequestThreshold?: number
  // 缓存策略
  cacheStrategy?: CacheStrategy
  // 默认缓存时间（毫秒）
  defaultCacheTTL?: number
  // 性能监控
  performanceMonitor?: PerformanceMonitor
  // 并发控制配置
  concurrency?: Partial<ConcurrencyConfig>
}

/**
 * 请求选项
 */
export interface RequestOptions extends AxiosRequestConfig {
  // 可以添加更多自定义选项
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  // 处理 HTTP 状态码错误
  handleStatusError: (error: AxiosError) => Promise<any>
  // 处理网络错误
  handleNetworkError: (error: AxiosError) => Promise<any>
  // 处理取消请求
  handleCancelError: (error: any) => Promise<any>
  // 处理通用错误
  handleGeneralError: (error: any) => Promise<any>
  // 显示错误消息
  showErrorMessage: (message: string) => void
}

/**
 * 响应处理器接口
 */
export interface ResponseHandler {
  // 处理响应数据
  handleResponse: (response: AxiosResponse) => any
}

/**
 * 事件总线接口
 */
export interface EventBus {
  on(event: string, callback: Function): () => void
  off(event: string, callback: Function): void
  emit(event: string, ...args: any[]): void
  once(event: string, callback: Function): () => void
}

/**
 * 事件类型
 */
export enum EventType {
  REQUEST_START = 'request:start',
  REQUEST_SUCCESS = 'request:success',
  REQUEST_ERROR = 'request:error',
  REQUEST_COMPLETE = 'request:complete',
  SLOW_REQUEST = 'request:slow'
}

/**
 * 请求事件数据
 */
export interface RequestEvent {
  url: string
  method: string
  timestamp: number
  duration?: number
  requestId?: string
  config?: AxiosRequestConfig
  response?: AxiosResponse
  error?: any
}

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志记录器接口
 */
export interface Logger {
  debug(message: string, ...args: any[]): void
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  log(level: LogLevel, message: string, ...args: any[]): void
}

// 工具函数
// =========================================

/**
 * 创建延迟函数
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 生成请求的唯一键
 */
const generateRequestKey = (config: AxiosRequestConfig): string => {
  const { url, method, params, data, requestId } = config
  return requestId || [url, method, JSON.stringify(params), JSON.stringify(data)].join('&')
}

// 默认处理器实现
// =========================================

/**
 * 默认状态码错误处理映射
 */
const defaultStatusErrorMap: Record<number, string> = {
  400: '请求参数错误',
  401: '未授权，请重新登录',
  403: '拒绝访问',
  404: '请求的资源不存在',
  500: '服务器错误',
  502: '网关错误',
  503: '服务不可用',
  504: '网关超时'
}

/**
 * 默认错误处理器
 */
export class DefaultErrorHandler implements ErrorHandler {
  private statusErrorMap: Record<number, string>

  constructor(statusErrorMap?: Record<number, string>) {
    this.statusErrorMap = statusErrorMap || defaultStatusErrorMap
  }

  async handleStatusError(error: AxiosError): Promise<any> {
    const status = error.response?.status || 0
    const message = this.statusErrorMap[status] || `请求失败，状态码: ${status}`
    this.showErrorMessage(message)

    // 特殊处理 401 错误，可以在这里触发登出逻辑
    if (status === 401) {
      // 可以触发登出逻辑
      // logout()
    }

    return Promise.reject(
      new HttpError(message, {
        status,
        data: error.response?.data
      })
    )
  }

  async handleNetworkError(error: AxiosError): Promise<any> {
    this.showErrorMessage('网络错误，请检查您的网络连接')
    return Promise.reject(new HttpError('网络错误，请检查您的网络连接'))
  }

  async handleCancelError(error: any): Promise<any> {
    // 通常不需要显示取消请求的错误消息
    console.log('请求被取消:', error.message)
    return Promise.reject(error)
  }

  async handleGeneralError(error: any): Promise<any> {
    this.showErrorMessage(error.message || '请求发生未知错误')
    return Promise.reject(error)
  }

  showErrorMessage(message: string): void {
    console.error(message)
  }
}

/**
 * 默认响应处理器
 */
export class DefaultResponseHandler implements ResponseHandler {
  handleResponse(response: AxiosResponse): any {
    const data = response.data

    // 根据业务逻辑处理响应
    // 假设后端返回格式为 { code: number, data: any, message: string }
    const isStandardFormat = data && typeof data === 'object' && 'code' in data

    if (!isStandardFormat) {
      return data
    }

    const isSuccess = data.code === 0 || data.code === 200

    if (isSuccess) {
      return data.data
    }

    throw new HttpError(data.message || '请求失败', {
      code: data.code,
      data: data.data
    })
  }
}

// 请求拦截器策略
// =========================================

/**
 * 请求拦截器接口
 */
interface RequestInterceptor {
  intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any>
}

/**
 * 重复请求取消拦截器
 */
class DuplicateRequestInterceptor implements RequestInterceptor {
  async intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any> {
    const shouldCancelDuplicated =
      httpClient.getConfig().enableCancelDuplicated && config.cancelDuplicated !== false

    if (shouldCancelDuplicated) {
      httpClient.addPendingRequest(config)
    }

    return config
  }
}

/**
 * 认证令牌拦截器
 */
class AuthTokenInterceptor implements RequestInterceptor {
  async intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any> {
    const { getToken, setAuthHeader } = httpClient.getConfig()

    if (!getToken) {
      return config
    }

    const token = await getToken()

    if (!token) {
      return config
    }

    // 创建新的配置对象
    const newConfig = { ...config }

    // 确保 headers 存在
    if (!newConfig.headers) {
      newConfig.headers = {}
    }

    // 设置认证头
    if (setAuthHeader) {
      setAuthHeader(newConfig.headers, token)
    } else {
      newConfig.headers.Authorization = `Bearer ${token}`
    }

    return newConfig
  }
}

// 响应拦截器策略
// =========================================

/**
 * 响应拦截器接口
 */
interface ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any
}

/**
 * 响应处理拦截器
 */
class ResponseHandlerInterceptor implements ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    const shouldReturnRaw = response.config.raw === true

    if (shouldReturnRaw) {
      return response
    }

    return httpClient.getResponseHandler().handleResponse(response)
  }
}

/**
 * 请求清理拦截器
 */
class RequestCleanupInterceptor implements ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    const shouldCleanup =
      httpClient.getConfig().enableCancelDuplicated && response.config.cancelDuplicated !== false

    if (shouldCleanup) {
      httpClient.removePendingRequest(response.config)
    }

    return response
  }
}

// 错误处理策略
// =========================================

/**
 * 错误处理器接口
 */
interface ErrorInterceptor {
  intercept(error: any, httpClient: HttpClient): Promise<any>
}

/**
 * 请求清理错误拦截器
 */
class RequestCleanupErrorInterceptor implements ErrorInterceptor {
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    if (!error.config) {
      return Promise.reject(error)
    }

    const shouldCleanup =
      httpClient.getConfig().enableCancelDuplicated && error.config.cancelDuplicated !== false

    if (shouldCleanup) {
      httpClient.removePendingRequest(error.config)
    }

    return Promise.reject(error)
  }
}

/**
 * 重试错误拦截器
 */
class RetryErrorInterceptor implements ErrorInterceptor {
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    if (!error.config) {
      return Promise.reject(error)
    }

    const retryConfig = error.config?.retry || httpClient.getConfig().defaultRetry

    if (!retryConfig || retryConfig.count <= 0) {
      return Promise.reject(error)
    }

    // 设置重试计数器
    const newRetryConfig = { ...retryConfig, count: retryConfig.count - 1 }
    error.config.retry = newRetryConfig

    // 延迟后重试
    await delay(retryConfig.delay || 1000)

    // 重新发送请求
    return httpClient.getAxiosInstance()(error.config)
  }
}

/**
 * 错误处理拦截器
 */
class ErrorHandlerInterceptor implements ErrorInterceptor {
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    // 如果不显示错误消息，则直接返回错误
    if (error.config?.showErrorMessage === false) {
      return Promise.reject(error)
    }

    const errorHandler = httpClient.getErrorHandler()

    // 使用策略模式处理不同类型的错误
    if (axios.isCancel(error)) {
      return errorHandler.handleCancelError(error)
    }

    if (isAxiosError(error)) {
      return error.response
        ? errorHandler.handleStatusError(error)
        : errorHandler.handleNetworkError(error)
    }

    return errorHandler.handleGeneralError(error)
  }
}

// HTTP 客户端实现
// =========================================

/**
 * 请求队列管理器
 */
export class RequestQueueManager {
  private queue: QueuedRequest[] = []
  private activeCount = 0
  private config: ConcurrencyConfig
  private httpClient: HttpClient
  private logger: Logger
  private eventBus: EventBus

  constructor(httpClient: HttpClient, config: Partial<ConcurrencyConfig> = {}) {
    this.httpClient = httpClient
    this.logger = httpClient.getLogger()
    this.eventBus = httpClient.getEventBus()

    // 默认配置
    this.config = {
      maxConcurrent: 6,
      queueSize: 100,
      queueFullStrategy: 'reject-new',
      queueTimeout: 30000,
      ...config
    }
  }

  /**
   * 入队请求
   */
  enqueue(config: AxiosRequestConfig): Promise<any> {
    // 如果请求配置为绕过队列，则直接发送请求
    if (config.bypassQueue) {
      return this.httpClient.getAxiosInstance().request(config)
    }

    // 如果当前活跃请求数小于最大并发数，则直接发送请求
    if (this.activeCount < this.config.maxConcurrent) {
      this.activeCount++

      return this.httpClient
        .getAxiosInstance()
        .request(config)
        .finally(() => {
          this.activeCount--
          this.processQueue()
        })
    }

    // 否则，将请求加入队列
    return new Promise((resolve, reject) => {
      const priority = config.priority || RequestPriority.NORMAL
      const timestamp = Date.now()
      const id = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`

      const queuedRequest: QueuedRequest = {
        id,
        config,
        priority,
        resolve,
        reject,
        timestamp
      }

      // 检查队列是否已满
      if (this.config.queueSize > 0 && this.queue.length >= this.config.queueSize) {
        if (this.config.queueFullStrategy === 'reject-new') {
          // 拒绝新请求
          const error = new Error('Request queue is full')
          this.logger.warn('Request rejected: queue is full', { requestId: config.requestId })
          return reject(error)
        } else {
          // 查找优先级最低的请求
          const lowestPriorityIndex = this.findLowestPriorityIndex()

          if (lowestPriorityIndex !== -1 && this.queue[lowestPriorityIndex].priority < priority) {
            // 如果找到优先级更低的请求，则替换它
            const droppedRequest = this.queue[lowestPriorityIndex]
            this.queue[lowestPriorityIndex] = queuedRequest

            // 拒绝被丢弃的请求
            const error = new Error('Request dropped due to higher priority request')
            this.logger.warn('Request dropped: replaced by higher priority request', {
              requestId: droppedRequest.config.requestId,
              newRequestId: config.requestId
            })
            droppedRequest.reject(error)

            // 对队列重新排序
            this.sortQueue()
          } else {
            // 如果没有优先级更低的请求，则拒绝新请求
            const error = new Error(
              'Request queue is full and no lower priority request to replace'
            )
            this.logger.warn(
              'Request rejected: queue is full and no lower priority request to replace',
              {
                requestId: config.requestId
              }
            )
            return reject(error)
          }
        }
      } else {
        // 将请求添加到队列
        this.queue.push(queuedRequest)
        this.sortQueue()

        this.logger.debug('Request queued', {
          requestId: config.requestId,
          priority,
          queueLength: this.queue.length
        })

        // 发出请求入队事件
        this.eventBus.emit('requestQueued', {
          request: config,
          priority,
          queueLength: this.queue.length
        })
      }

      // 如果配置了队列超时，则设置超时处理
      if (this.config.queueTimeout > 0) {
        setTimeout(() => {
          // 查找请求在队列中的位置
          const index = this.queue.findIndex(req => req.id === id)

          if (index !== -1) {
            // 如果请求仍在队列中，则将其移除并拒绝
            const request = this.queue.splice(index, 1)[0]
            const error = new Error('Request timeout in queue')

            this.logger.warn('Request timeout in queue', {
              requestId: request.config.requestId,
              queueTime: Date.now() - request.timestamp
            })

            // 发出请求超时事件
            this.eventBus.emit('requestQueueTimeout', {
              request: request.config,
              queueTime: Date.now() - request.timestamp
            })

            request.reject(error)
          }
        }, this.config.queueTimeout)
      }
    })
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    // 如果队列为空或已达到最大并发数，则不处理
    if (this.queue.length === 0 || this.activeCount >= this.config.maxConcurrent) {
      return
    }

    // 取出队列中的第一个请求
    const request = this.queue.shift()

    if (!request) {
      return
    }

    this.activeCount++

    // 记录请求从入队到出队的时间
    const queueTime = Date.now() - request.timestamp

    this.logger.debug('Request dequeued', {
      requestId: request.config.requestId,
      queueTime,
      queueLength: this.queue.length
    })

    // 发出请求出队事件
    this.eventBus.emit('requestDequeued', {
      request: request.config,
      queueTime,
      queueLength: this.queue.length
    })

    // 发送请求
    this.httpClient
      .getAxiosInstance()
      .request(request.config)
      .then(request.resolve)
      .catch(request.reject)
      .finally(() => {
        this.activeCount--
        this.processQueue()
      })
  }

  /**
   * 对队列按优先级排序
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // 首先按优先级排序（降序）
      if (b.priority !== a.priority) {
        return b.priority - a.priority
      }

      // 其次按时间戳排序（升序，先进先出）
      return a.timestamp - b.timestamp
    })
  }

  /**
   * 查找队列中优先级最低的请求索引
   */
  private findLowestPriorityIndex(): number {
    if (this.queue.length === 0) {
      return -1
    }

    let lowestPriority = RequestPriority.CRITICAL
    let lowestPriorityIndex = -1

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < lowestPriority) {
        lowestPriority = this.queue[i].priority
        lowestPriorityIndex = i
      }
    }

    return lowestPriorityIndex
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * 获取活跃请求数
   */
  getActiveCount(): number {
    return this.activeCount
  }

  /**
   * 获取队列中的请求
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue]
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    // 拒绝所有排队的请求
    for (const request of this.queue) {
      const error = new Error('Request cancelled: queue cleared')
      request.reject(error)
    }

    this.queue = []
    this.logger.info('Request queue cleared', { queueLength: 0 })
  }
}

/**
 * HTTP 客户端类
 */
export class HttpClient {
  private instance: AxiosInstance
  private pendingRequests: Map<string, AbortController>
  private config: HttpClientConfig
  private errorHandler: ErrorHandler
  private responseHandler: ResponseHandler
  private requestInterceptors: RequestInterceptor[]
  private responseInterceptors: ResponseInterceptor[]
  private errorInterceptors: ErrorInterceptor[]
  private eventBus: EventBus
  private logger: Logger
  private cacheStrategy: CacheStrategy
  private performanceMonitor: PerformanceMonitor
  private requestQueue: RequestQueueManager

  /**
   * 构造函数
   * @param config HTTP 客户端配置
   */
  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: 'http://localhost:3000',
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      },
      enableCancelDuplicated: true,
      defaultRetry: {
        count: 0,
        delay: 1000
      },
      slowRequestThreshold: 1000, // 默认慢请求阈值为 1 秒
      defaultCacheTTL: 60000, // 默认缓存时间为 1 分钟
      ...config
    }

    this.instance = axios.create(this.config)
    this.pendingRequests = new Map<string, AbortController>()
    this.errorHandler = config.errorHandler || new DefaultErrorHandler()
    this.responseHandler = config.responseHandler || new DefaultResponseHandler()
    this.eventBus = config.eventBus || new DefaultEventBus()
    this.logger = config.logger || new DefaultLogger()
    this.cacheStrategy = config.cacheStrategy || new MemoryCacheStrategy()
    this.performanceMonitor = config.performanceMonitor || new DefaultPerformanceMonitor()

    // 初始化拦截器
    this.requestInterceptors = [
      new RequestEventEmitterInterceptor(),
      new CacheInterceptor(),
      new DuplicateRequestInterceptor(),
      new AuthTokenInterceptor()
    ]

    this.responseInterceptors = [
      new RequestCleanupInterceptor(),
      new CacheResponseInterceptor(),
      new ResponseEventEmitterInterceptor(),
      new ResponseHandlerInterceptor()
    ]

    this.errorInterceptors = [
      new RequestCleanupErrorInterceptor(),
      new RetryErrorInterceptor(),
      new ErrorEventEmitterInterceptor(),
      new ErrorHandlerInterceptor()
    ]

    // 初始化请求队列管理器
    this.requestQueue = new RequestQueueManager(this, config.concurrency)

    this.setupInterceptors()
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      async config => {
        // 使用责任链模式依次应用所有请求拦截器
        let currentConfig = { ...config }

        for (const interceptor of this.requestInterceptors) {
          currentConfig = await interceptor.intercept(currentConfig, this)
        }

        return currentConfig
      },
      error => Promise.reject(error)
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 按顺序执行响应拦截器
        return this.responseInterceptors
          .reduce(
            (promise, interceptor) => promise.then(res => interceptor.intercept(res, this)),
            Promise.resolve(response)
          )
          .then(finalResponse => {
            // 添加性能监控拦截器
            return new PerformanceMonitorInterceptor().intercept(finalResponse, this)
          })
          .catch(error => {
            // 处理响应拦截器中的错误
            return Promise.reject(error)
          })
      },
      async (error: any) => {
        // 使用责任链模式依次应用所有错误拦截器
        for (const interceptor of this.errorInterceptors) {
          try {
            return await interceptor.intercept(error, this)
          } catch (err) {
            error = err
          }
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * 添加请求到 pendingRequests
   */
  addPendingRequest(config: AxiosRequestConfig): void {
    const requestKey = generateRequestKey(config)

    // 如果有重复请求，取消前一个请求
    if (this.pendingRequests.has(requestKey)) {
      const controller = this.pendingRequests.get(requestKey)
      controller?.abort('请求已取消，原因：重复请求')
      this.pendingRequests.delete(requestKey)
    }

    // 创建新的 AbortController
    const controller = new AbortController()
    config.signal = controller.signal
    this.pendingRequests.set(requestKey, controller)
  }

  /**
   * 从 pendingRequests 中移除请求
   */
  removePendingRequest(config: AxiosRequestConfig): void {
    const requestKey = generateRequestKey(config)
    this.pendingRequests.delete(requestKey)
  }

  /**
   * 获取配置
   */
  getConfig(): HttpClientConfig {
    return this.config
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler
  }

  /**
   * 获取响应处理器
   */
  getResponseHandler(): ResponseHandler {
    return this.responseHandler
  }

  /**
   * 发送请求
   * @param config 请求配置
   */
  request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // 使用请求队列管理器处理请求
    return this.requestQueue.enqueue(config) as Promise<AxiosResponse<T>>
  }

  /**
   * 发送 GET 请求
   * @param url 请求 URL
   * @param config 请求配置
   */
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  /**
   * 发送 POST 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   */
  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  /**
   * 发送 PUT 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   */
  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  /**
   * 发送 DELETE 请求
   * @param url 请求 URL
   * @param config 请求配置
   */
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  /**
   * 发送 PATCH 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   */
  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  /**
   * 发送 HEAD 请求
   * @param url 请求 URL
   * @param config 请求配置
   */
  head<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'HEAD', url })
  }

  /**
   * 发送 OPTIONS 请求
   * @param url 请求 URL
   * @param config 请求配置
   */
  options<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'OPTIONS', url })
  }

  /**
   * 获取请求队列管理器
   */
  getRequestQueue(): RequestQueueManager {
    return this.requestQueue
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.requestQueue.getQueueLength()
  }

  /**
   * 获取活跃请求数
   */
  getActiveRequestCount(): number {
    return this.requestQueue.getActiveCount()
  }

  /**
   * 清空请求队列
   */
  clearRequestQueue(): void {
    this.requestQueue.clearQueue()
  }

  /**
   * 创建一个可取消的请求
   * @param requestFn 请求函数
   * @returns [请求函数, 取消函数]
   */
  createCancelableRequest<T = any, P extends any[] = any[]>(
    requestFn: (...args: P) => Promise<T>
  ): [(...args: P) => Promise<T>, () => void] {
    let controller: AbortController | null = null

    const wrappedRequest = (...args: P): Promise<T> => {
      // 如果有之前的请求，先取消
      if (controller) {
        controller.abort('请求已取消，原因：用户取消')
      }

      // 创建新的 AbortController
      controller = new AbortController()

      // 找到原始请求的最后一个参数（如果是对象，则可能是配置对象）
      const lastArg = args[args.length - 1]
      if (lastArg && typeof lastArg === 'object' && !Array.isArray(lastArg)) {
        // 将 signal 添加到配置中
        args[args.length - 1] = {
          ...lastArg,
          signal: controller.signal
        }
      }

      return requestFn(...args)
    }

    const cancel = () => {
      if (controller) {
        controller.abort('请求已取消，原因：用户取消')
        controller = null
      }
    }

    return [wrappedRequest, cancel]
  }

  /**
   * 取消所有请求
   * @param reason 取消原因
   */
  cancelAllRequests(reason = '用户取消了所有请求'): void {
    this.pendingRequests.forEach(controller => {
      controller.abort(reason)
    })
    this.pendingRequests.clear()
  }

  /**
   * 取消指定请求
   * @param requestId 请求ID
   * @param reason 取消原因
   */
  cancelRequest(requestId: string, reason = '用户取消了请求'): void {
    const controller = this.pendingRequests.get(requestId)
    if (controller) {
      controller.abort(reason)
      this.pendingRequests.delete(requestId)
    }
  }

  /**
   * 设置默认配置
   * @param config 配置
   */
  setConfig(config: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...config }

    // 更新 axios 实例配置，只更新安全的属性
    if (config.baseURL) {
      this.instance.defaults.baseURL = config.baseURL
    }
    if (config.timeout) {
      this.instance.defaults.timeout = config.timeout
    }

    // 如果提供了新的错误处理器，则更新
    if (config.errorHandler) {
      this.errorHandler = config.errorHandler
    }

    // 如果提供了新的响应处理器，则更新
    if (config.responseHandler) {
      this.responseHandler = config.responseHandler
    }
  }

  /**
   * 获取 Axios 实例
   * @internal 仅供内部使用
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
    this.setupInterceptors()
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
    this.setupInterceptors()
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor)
    this.setupInterceptors()
  }

  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus
  }

  /**
   * 获取日志记录器
   */
  getLogger(): Logger {
    return this.logger
  }

  /**
   * 获取慢请求阈值
   */
  getSlowRequestThreshold(): number {
    return this.config.slowRequestThreshold || 1000
  }

  /**
   * 获取缓存策略
   */
  getCacheStrategy(): CacheStrategy {
    return this.cacheStrategy
  }

  /**
   * 获取默认缓存时间
   */
  getDefaultCacheTTL(): number {
    return this.config.defaultCacheTTL || 60000
  }

  /**
   * 清除缓存
   */
  clearCache(): Promise<void> | void {
    return this.cacheStrategy.clear()
  }

  /**
   * 获取性能监控器
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor
  }

  /**
   * 获取平均响应时间
   * @param url 可选的 URL 过滤器
   * @param method 可选的请求方法过滤器
   */
  getAverageResponseTime(url?: string, method?: string): number {
    return this.performanceMonitor.getAverageResponseTime(url, method)
  }

  /**
   * 获取慢请求列表
   * @param threshold 可选的阈值（毫秒）
   */
  getSlowRequests(threshold?: number): PerformanceMetrics[] {
    return this.performanceMonitor.getSlowRequests(threshold)
  }

  /**
   * 获取所有性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics()
  }

  /**
   * 清除性能指标
   */
  clearPerformanceMetrics(): void {
    this.performanceMonitor.clear()
  }
}

// 创建默认实例
// =========================================

/**
 * 默认 HTTP 客户端实例
 */
export const httpClient = new HttpClient()

/**
 * 通用请求方法
 */
export const request = httpClient.request.bind(httpClient)

/**
 * GET 请求
 */
export const get = httpClient.get.bind(httpClient)

/**
 * POST 请求
 */
export const post = httpClient.post.bind(httpClient)

/**
 * PUT 请求
 */
export const put = httpClient.put.bind(httpClient)

/**
 * DELETE 请求
 */
export const del = httpClient.delete.bind(httpClient)

/**
 * PATCH 请求
 */
export const patch = httpClient.patch.bind(httpClient)

/**
 * 创建可取消的请求
 */
export const createCancelableRequest = httpClient.createCancelableRequest.bind(httpClient)

/**
 * 取消所有请求
 */
export const cancelAllRequests = httpClient.cancelAllRequests.bind(httpClient)

/**
 * 取消指定请求
 */
export const cancelRequest = httpClient.cancelRequest.bind(httpClient)

/**
 * 设置默认配置
 */
export const setConfig = httpClient.setConfig.bind(httpClient)

/**
 * 创建新的 HTTP 客户端实例
 */
export const createHttpClient = (config: HttpClientConfig = {}): HttpClient => {
  return new HttpClient(config)
}

// 导出工具函数
export { isCancel, isAxiosError }

// 默认导出
export default {
  httpClient,
  request,
  get,
  post,
  put,
  del,
  patch,
  createCancelableRequest,
  cancelAllRequests,
  cancelRequest,
  setConfig,
  createHttpClient,
  HttpClient,
  DefaultErrorHandler,
  DefaultResponseHandler,
  HttpError,
  isCancel,
  isAxiosError
}

// 新增拦截器
// =========================================

/**
 * 请求事件发射器拦截器
 */
class RequestEventEmitterInterceptor implements RequestInterceptor {
  async intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any> {
    // 添加请求开始时间
    config.metadata = {
      ...config.metadata,
      startTime: Date.now()
    }

    // 发射请求开始事件
    const eventData: RequestEvent = {
      url: config.url || '',
      method: config.method?.toUpperCase() || 'UNKNOWN',
      timestamp: Date.now(),
      requestId: config.requestId,
      config
    }

    httpClient.getEventBus().emit(EventType.REQUEST_START, eventData)
    httpClient.getLogger().info(`Request started: ${eventData.method} ${eventData.url}`, {
      requestId: eventData.requestId
    })

    return config
  }
}

/**
 * 响应事件发射器拦截器
 */
class ResponseEventEmitterInterceptor implements ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    const config = response.config
    const endTime = Date.now()
    const startTime = config.metadata?.startTime || endTime
    const duration = endTime - startTime

    // 发出成功事件
    httpClient.getEventBus().emit('success', {
      request: config,
      response,
      duration
    })

    // 发出完成事件
    httpClient.getEventBus().emit('complete', {
      request: config,
      response,
      duration
    })

    // 记录响应日志
    httpClient
      .getLogger()
      .info(
        `Response: ${config.method?.toUpperCase()} ${config.url} ${response.status} (${duration}ms)`,
        { requestId: config.requestId, status: response.status, duration }
      )

    return response
  }
}

/**
 * 错误事件发射器拦截器
 */
class ErrorEventEmitterInterceptor implements ErrorInterceptor {
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    if (!error.config) {
      return Promise.reject(error)
    }

    const startTime = error.config.metadata?.startTime
    const endTime = Date.now()
    const duration = startTime ? endTime - startTime : undefined

    // 发射请求错误事件
    const eventData: RequestEvent = {
      url: error.config.url || '',
      method: error.config.method?.toUpperCase() || 'UNKNOWN',
      timestamp: endTime,
      duration,
      requestId: error.config.requestId,
      config: error.config,
      error
    }

    httpClient.getEventBus().emit(EventType.REQUEST_ERROR, eventData)
    httpClient.getEventBus().emit(EventType.REQUEST_COMPLETE, eventData)

    // 记录错误日志
    const errorMessage = error.message || 'Unknown error'
    const statusCode = error.response?.status
    const statusText = statusCode ? ` (${statusCode})` : ''

    httpClient
      .getLogger()
      .error(
        `Request failed: ${eventData.method} ${eventData.url}${statusText} - ${errorMessage}`,
        {
          requestId: eventData.requestId,
          duration,
          error: {
            message: error.message,
            stack: error.stack,
            status: error.response?.status,
            data: error.response?.data
          }
        }
      )

    return Promise.reject(error)
  }
}

/**
 * 缓存拦截器
 */
class CacheInterceptor implements RequestInterceptor {
  async intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any> {
    // 只缓存 GET 请求，且缓存未被禁用
    if (config.method?.toUpperCase() !== 'GET' || config.cache === false) {
      return config
    }

    const cacheStrategy = httpClient.getCacheStrategy()
    const cacheKey = generateCacheKey(config)

    // 检查缓存中是否有响应
    if (await cacheStrategy.has(cacheKey)) {
      const cachedResponse = await cacheStrategy.get(cacheKey)

      if (cachedResponse) {
        // 记录缓存命中日志
        httpClient.getLogger().info(`Cache hit: ${config.method?.toUpperCase()} ${config.url}`, {
          requestId: config.requestId,
          cacheKey
        })

        // 创建一个已解决的 Promise，跳过实际的请求
        return Promise.resolve({
          ...cachedResponse,
          config,
          cached: true,
          status: 200,
          statusText: 'OK'
        })
      }
    }

    // 如果没有缓存，继续请求
    return config
  }
}

/**
 * 缓存响应拦截器
 */
class CacheResponseInterceptor implements ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    // 如果响应已经来自缓存，则跳过
    if (response.cached) {
      return response
    }

    // 只缓存 GET 请求，且缓存未被禁用
    if (response.config.method?.toUpperCase() !== 'GET' || response.config.cache === false) {
      return response
    }

    // 如果状态码不是 2xx，则不缓存
    if (response.status < 200 || response.status >= 300) {
      return response
    }

    const cacheStrategy = httpClient.getCacheStrategy()
    const cacheKey = generateCacheKey(response.config)

    // 确定缓存时间
    let ttl = httpClient.getDefaultCacheTTL()

    if (typeof response.config.cache === 'object' && response.config.cache.ttl) {
      ttl = response.config.cache.ttl
    }

    // 缓存响应
    cacheStrategy.set(cacheKey, response, ttl)

    // 记录缓存存储日志
    httpClient
      .getLogger()
      .debug(
        `Cache stored: ${response.config.method?.toUpperCase()} ${response.config.url} (TTL: ${ttl}ms)`,
        { requestId: response.config.requestId, cacheKey, ttl }
      )

    return response
  }
}

/**
 * 生成缓存键
 */
const generateCacheKey = (config: AxiosRequestConfig): string => {
  // 如果配置中提供了缓存键，则使用它
  if (typeof config.cache === 'object' && config.cache.key) {
    return config.cache.key
  }

  // 否则，使用 URL、方法和参数生成键
  const { url, method, params, data } = config
  return `${method?.toLowerCase() || 'get'}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`
}

// 默认实现
// =========================================

/**
 * 默认事件总线实现
 */
export class DefaultEventBus implements EventBus {
  private listeners: Record<string, Function[]> = {}

  on(event: string, callback: Function): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }

    this.listeners[event].push(callback)

    return () => this.off(event, callback)
  }

  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return

    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)

    if (this.listeners[event].length === 0) {
      delete this.listeners[event]
    }
  }

  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return

    this.listeners[event].forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error)
      }
    })
  }

  once(event: string, callback: Function): () => void {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback)
      callback(...args)
    }

    return this.on(event, onceCallback)
  }
}

/**
 * 默认日志记录器实现
 */
export class DefaultLogger implements Logger {
  // 日志级别与对应控制台方法的映射
  private readonly logMethodMap: Record<LogLevel, (message: string, ...args: any[]) => void> = {
    [LogLevel.DEBUG]: console.debug,
    [LogLevel.INFO]: console.info,
    [LogLevel.WARN]: console.warn,
    [LogLevel.ERROR]: console.error
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args)
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args)
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args)
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`

    // 使用映射获取对应的日志方法，如果不存在则使用 console.log
    const logMethod = this.logMethodMap[level] || console.log

    // 调用对应的日志方法
    logMethod(`${prefix} ${message}`, ...args)
  }
}

/**
 * 内存缓存策略
 */
export class MemoryCacheStrategy implements CacheStrategy {
  private cache: Map<string, CacheItem> = new Map()

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) {
      return null
    }

    // 检查是否过期
    if (Date.now() > item.expires) {
      this.delete(key)
      return null
    }

    return item.data as T
  }

  set<T = any>(key: string, value: T, ttl = 60000): void {
    const timestamp = Date.now()
    const expires = timestamp + ttl

    this.cache.set(key, {
      data: value,
      timestamp,
      expires
    })
  }

  has(key: string): boolean {
    const item = this.cache.get(key)

    if (!item) {
      return false
    }

    // 检查是否过期
    if (Date.now() > item.expires) {
      this.delete(key)
      return false
    }

    return true
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

/**
 * 本地存储缓存策略
 */
export class LocalStorageCacheStrategy implements CacheStrategy {
  private prefix: string

  constructor(prefix = 'http_cache_') {
    this.prefix = prefix
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`
  }

  get<T = any>(key: string): T | null {
    const fullKey = this.getFullKey(key)
    const json = localStorage.getItem(fullKey)

    if (!json) {
      return null
    }

    try {
      const item: CacheItem<T> = JSON.parse(json)

      // 检查是否过期
      if (Date.now() > item.expires) {
        this.delete(key)
        return null
      }

      return item.data
    } catch (error) {
      this.delete(key)
      return null
    }
  }

  set<T = any>(key: string, value: T, ttl = 60000): void {
    const fullKey = this.getFullKey(key)
    const timestamp = Date.now()
    const expires = timestamp + ttl

    const item: CacheItem<T> = {
      data: value,
      timestamp,
      expires
    }

    try {
      localStorage.setItem(fullKey, JSON.stringify(item))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  has(key: string): boolean {
    const fullKey = this.getFullKey(key)
    const json = localStorage.getItem(fullKey)

    if (!json) {
      return false
    }

    try {
      const item: CacheItem = JSON.parse(json)

      // 检查是否过期
      if (Date.now() > item.expires) {
        this.delete(key)
        return false
      }

      return true
    } catch (error) {
      this.delete(key)
      return false
    }
  }

  delete(key: string): void {
    const fullKey = this.getFullKey(key)
    localStorage.removeItem(fullKey)
  }

  clear(): void {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)

      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
  }
}

/**
 * 性能监控拦截器
 */
class PerformanceMonitorInterceptor implements ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    const config = response.config
    const endTime = Date.now()
    const startTime = config.metadata?.startTime || endTime
    const duration = endTime - startTime
    const slow = duration > httpClient.getSlowRequestThreshold()

    // 记录性能指标
    const metrics: PerformanceMetrics = {
      url: config.url || '',
      method: config.method?.toUpperCase() || 'GET',
      requestId: config.requestId,
      startTime,
      endTime,
      duration,
      status: response.status,
      slow,
      cached: !!response.cached
    }

    httpClient.getPerformanceMonitor().recordMetrics(metrics)

    // 如果是慢请求，发出警报
    if (slow) {
      httpClient.getEventBus().emit('slowRequest', {
        request: config,
        response,
        duration,
        threshold: httpClient.getSlowRequestThreshold()
      })

      httpClient
        .getLogger()
        .warn(
          `Slow request detected: ${config.method?.toUpperCase()} ${config.url} (${duration}ms)`,
          { requestId: config.requestId, duration, threshold: httpClient.getSlowRequestThreshold() }
        )
    }

    return response
  }
}

/**
 * 默认性能监控实现
 */
export class DefaultPerformanceMonitor implements PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxEntries: number

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    // 限制存储的指标数量
    if (this.metrics.length >= this.maxEntries) {
      this.metrics.shift() // 移除最旧的条目
    }

    this.metrics.push(metrics)
  }

  getAverageResponseTime(url?: string, method?: string): number {
    const filteredMetrics = this.metrics.filter(metric => {
      if (url && metric.url !== url) return false
      if (method && metric.method !== method) return false
      return true
    })

    if (filteredMetrics.length === 0) {
      return 0
    }

    const totalDuration = filteredMetrics.reduce((sum, metric) => sum + metric.duration, 0)
    return totalDuration / filteredMetrics.length
  }

  getSlowRequests(threshold?: number): PerformanceMetrics[] {
    if (!threshold) {
      return this.metrics.filter(metric => metric.slow)
    }

    return this.metrics.filter(metric => metric.duration > threshold)
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  clear(): void {
    this.metrics = []
  }
}
