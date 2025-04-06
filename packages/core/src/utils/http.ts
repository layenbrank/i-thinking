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
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * Axios 增强型 HTTP 客户端模块
 * @module HttpClient
 * @description
 * 提供企业级 HTTP 客户端功能，包含以下特性：
 * - 请求队列与优先级控制
 * - 自动重试机制
 * - 重复请求取消
 * - 缓存策略（内存/LocalStorage）
 * - 性能监控
 * - 可扩展的拦截器体系
 * - 事件总线集成
 * - TypeScript 强类型支持
 */

// 类型定义
// =========================================

/**
 * 自定义 HTTP 错误类
 * @remarks
 * 扩展标准 Error 对象，包含 HTTP 状态码、业务错误码和响应数据
 * @example
 * throw new HttpError('认证失败', { status: 401, code: 'AUTH_FAILED' });
 */
export class HttpError extends Error {
  /** HTTP 状态码 */
  status?: number;
  /** 业务错误码 */
  code?: string | number;
  /** 响应原始数据 */
  data?: any;
  /** 错误发生时间戳 */
  timestamp: number;

  /**
   * 构造函数
   * @param message - 错误消息
   * @param options - 错误选项，包含状态码、错误码和数据
   */
  constructor(
    message?: string,
    options?: { status?: number; code?: string | number; data?: any },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = options?.status;
    this.code = options?.code;
    this.data = options?.data;
    this.timestamp = Date.now();
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Axios 配置扩展
 * @remarks
 * 为 AxiosRequestConfig 添加自定义配置项
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    /**
     * 是否取消重复请求
     * @default false
     */
    cancelDuplicated?: boolean;
    /**
     * @description 重试配置
     * @example
     * { count: 3, delay: 1000 } // 失败后重试3次，每次间隔1秒
     */
    retry?: {
      count: number;
      /**
       * @description 重试延迟(ms)
       */
      delay: number;
    };
    /**
     * @description 是否显示错误提示
     * @default true
     */
    showErrorMessage?: boolean;
    /**
     * @description 是否返回原始响应（不经过拦截器处理）
     * @default false
     */
    raw?: boolean;
    /**
     * @description 自定义请求标识符（用于取消重复请求）
     */
    requestId?: string;
    /**
     * @description 请求元数据
     */
    metadata?: {
      /** 请求开始时间 */
      startTime?: number;
      /** 其他元数据 */
      [key: string]: any;
    };
    /**
     * 缓存配置
     * @default false
     */
    cache?:
      | boolean
      | {
          /** 缓存键 */
          key?: string;
          /** 缓存时间(ms) */
          ttl?: number;
        };
    /**
     * 请求优先级
     * @default RequestPriority.NORMAL
     */
    priority?: RequestPriority;
    /**
     * 是否绕过队列直接发送请求
     * @default false
     */
    bypassQueue?: boolean;
  }

  export interface AxiosResponse {
    /**
     * @description 标记响应是否来自缓存
     */
    cached?: boolean;
  }
}

/**
 * 缓存项
 * @description 定义缓存项的结构，包含数据、时间戳和过期时间
 * @typeParam T - 缓存数据类型
 * @example
 * const cacheItem: CacheItem<{ name: string }> = {
 *   data: { name: 'John' },
 *   timestamp: Date.now(),
 *   expires: Date.now() + 3600000 // 缓存1小时
 * };
 */
export interface CacheItem<T = any> {
  /** 缓存数据 */
  data: T;
  /** 缓存时间戳 */
  timestamp: number;
  /** 缓存过期时间 */
  expires: number;
}

/**
 * @description 缓存策略接口
 * @description 定义缓存操作的接口，包括获取、设置、检查、删除和清空缓存等方法
 * @remarks
 * 实现该接口可创建自定义缓存策略
 * @example
 * class RedisCacheStrategy implements CacheStrategy {
 *   async get(key: string) { ... }
 *   async set(key: string, value: any, ttl?: number) { ... }
 * }
 */
export interface CacheStrategy {
  /**
   * @description 获取缓存数据
   * @param key - 缓存键
   * @returns 缓存数据或 null
   */
  get<T = any>(key: string): Promise<T | null> | T | null;

  /**
   * @description 设置缓存数据
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 缓存时间(ms)
   */
  set<T = any>(key: string, value: T, ttl?: number): Promise<void> | void;

  /**
   * @description 检查缓存是否存在
   * @param key - 缓存键
   * @returns 是否存在缓存
   */
  has(key: string): Promise<boolean> | boolean;

  /**
   * @description 删除缓存
   * @param key - 缓存键
   */
  delete(key: string): Promise<void> | void;

  /**
   * @description 清空缓存
   */
  clear(): Promise<void> | void;
}

/**
 * 性能指标接口
 * @description 记录请求的性能指标，包括 URL、方法、请求 ID、开始时间、结束时间、持续时间、状态码、是否慢请求和是否缓存等信息
 * @example
 * const metrics: PerformanceMetrics = {
 *   url: '/api/users',
 *   method: 'GET',
 *   requestId: '123',
 *   startTime: 1620000000000,
 *   endTime: 1620000001000,
 *   duration: 1000,
 *   status: 200,
 *   slow: false,
 *   cached: false
 * };
 */
export interface PerformanceMetrics {
  /** 请求 URL */
  url: string;
  /** 请求方法 */
  method: string;
  /** 请求 ID */
  requestId?: string;
  /** 请求开始时间戳 */
  startTime: number;
  /** 请求结束时间戳 */
  endTime: number;
  /** 请求总耗时（毫秒） */
  duration: number;
  /** HTTP 状态码 */
  status: number;
  /** 是否标记为慢请求 */
  slow: boolean;
  /** 是否来自缓存 */
  cached: boolean;
}

/**
 * 性能监控接口
 * @description 定义性能监控的接口，包括记录指标、获取平均响应时间、获取慢请求列表、获取所有指标和清空指标等方法
 */
export interface PerformanceMonitor {
  /**
   * 记录性能指标
   * @param metrics - 性能指标
   */
  recordMetrics(metrics: PerformanceMetrics): void;

  /**
   * 获取平均响应时间
   * @param url - 可选的 URL 过滤器
   * @param method - 可选的请求方法过滤器
   * @returns 平均响应时间(ms)
   */
  getAverageResponseTime(url?: string, method?: string): number;

  /**
   * 获取慢请求列表
   * @param threshold - 可选的阈值（毫秒）
   * @returns 慢请求列表
   */
  getSlowRequests(threshold?: number): PerformanceMetrics[];

  /**
   * 获取所有性能指标
   * @returns 所有性能指标列表
   */
  getMetrics(): PerformanceMetrics[];

  /**
   * 清空性能指标
   */
  clear(): void;
}

/**
 * 请求优先级
 * @description 定义请求的优先级，包括低、正常、高和关键四个级别
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

/**
 * 队列中的请求项
 * @description 定义队列中请求项的结构，包括 ID、配置、优先级、解决和拒绝函数以及时间戳
 * @example
 * const queuedRequest: QueuedRequest = {
 *   id: '123',
 *   config: { url: '/api/users' },
 *   priority: RequestPriority.NORMAL,
 *   resolve: (value) => console.log(value),
 *   reject: (reason) => console.error(reason),
 *   timestamp: Date.now()
 * };
 */
export interface QueuedRequest {
  /** 请求 ID */
  id: string;
  /** 请求配置 */
  config: AxiosRequestConfig;
  /** 请求优先级 */
  priority: RequestPriority;
  /** 解决函数 */
  resolve: (value: any) => void;
  /** 拒绝函数 */
  reject: (reason: any) => void;
  /** 请求时间戳 */
  timestamp: number;
}

/**
 * 并发控制配置
 * @description 定义并发控制的配置，包括最大并发请求数、队列大小限制、队列满时的行为和请求超时时间等
 * @example
 * const concurrencyConfig: ConcurrencyConfig = {
 *   maxConcurrent: 10,
 *   queueSize: 100,
 *   queueFullStrategy: 'reject-new',
 *   queueTimeout: 60000
 * };
 */
export interface ConcurrencyConfig {
  /** 最大并发请求数 */
  maxConcurrent: number;
  /** 队列大小限制（0 表示无限制） */
  queueSize: number;
  /** 队列满时的行为：丢弃新请求或丢弃最低优先级请求 */
  queueFullStrategy: "reject-new" | "drop-lowest";
  /** 请求超时时间（毫秒，0 表示无超时） */
  queueTimeout: number;
}

/**
 * HTTP 客户端配置
 * @description 定义 HTTP 客户端的配置，继承自 Axios 的默认配置，并添加了一些自定义配置项
 * @example
 * const httpClientConfig: HttpClientConfig = {
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 *   enableCancelDuplicated: true,
 *   defaultRetry: { count: 3, delay: 1000 },
 *   getToken: () => localStorage.getItem('token'),
 *   setAuthHeader: (headers, token) => headers.Authorization = `Bearer ${token}`,
 *   errorHandler: new DefaultErrorHandler(),
 *   responseHandler: new DefaultResponseHandler(),
 *   eventBus: new EventBus(),
 *   logger: console,
 *   slowRequestThreshold: 5000,
 *   cacheStrategy: new LocalStorageCacheStrategy(),
 *   defaultCacheTTL: 3600000,
 *   performanceMonitor: new PerformanceMonitor(),
 *   concurrency: {
 *     maxConcurrent: 10,
 *     queueSize: 100,
 *     queueFullStrategy: 'reject-new',
 *     queueTimeout: 60000
 *   }
 * };
 */
export interface HttpClientConfig extends CreateAxiosDefaults {
  /** 基础请求路径 */
  baseURL?: string;
  /** 请求超时时间 */
  timeout?: number;
  /** 是否启用请求重复取消 */
  enableCancelDuplicated?: boolean;
  /** 默认重试配置 */
  defaultRetry?: {
    /** 重试次数 */
    count: number;
    /** 重试延迟(ms) */
    delay: number;
  };
  /** 获取认证令牌的函数 */
  getToken?: () => string | null | Promise<string | null>;
  /** 设置认证令牌的函数 */
  setAuthHeader?: (headers: any, token: string) => void;
  /** 错误处理器 */
  errorHandler?: ErrorHandler;
  /** 响应处理器 */
  responseHandler?: ResponseHandler;
  /** 事件总线 */
  eventBus?: EventBus;
  /** 日志记录器 */
  logger?: Logger;
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold?: number;
  /** 缓存策略 */
  cacheStrategy?: CacheStrategy;
  /** 默认缓存时间（毫秒） */
  defaultCacheTTL?: number;
  /** 性能监控 */
  performanceMonitor?: PerformanceMonitor;
  /** 并发控制配置 */
  concurrency?: Partial<ConcurrencyConfig>;
}

/**
 * 请求选项
 * @description 继承自 Axios 的请求配置，可添加更多自定义选项
 * @example
 * const requestOptions: RequestOptions = {
 *   url: '/api/users',
 *   method: 'GET',
 *   cache: { key: 'users', ttl: 3600000 }
 * };
 */
export interface RequestOptions extends AxiosRequestConfig {
  // 可以添加更多自定义选项
}

/**
 * 错误处理器接口
 * @description 定义错误处理的接口，包括处理 HTTP 状态码错误、网络错误、取消请求和通用错误等方法，以及显示错误消息的方法
 */
export interface ErrorHandler {
  /**
   * 处理 HTTP 状态码错误
   * @param error - Axios 错误对象
   * @returns 处理结果
   */
  handleStatusError: (error: AxiosError) => Promise<any>;
  /**
   * 处理网络错误
   * @param error - Axios 错误对象
   * @returns 处理结果
   */
  handleNetworkError: (error: AxiosError) => Promise<any>;
  /**
   * 处理取消请求
   * @param error - 错误对象
   * @returns 处理结果
   */
  handleCancelError: (error: any) => Promise<any>;
  /**
   * 处理通用错误
   * @param error - 错误对象
   * @returns 处理结果
   */
  handleGeneralError: (error: any) => Promise<any>;
  /**
   * 显示错误消息
   * @param message - 错误消息
   */
  showErrorMessage: (message: string) => void;
}

/**
 * 响应处理器接口
 * @description 定义响应处理的接口，包括处理响应数据的方法
 */
export interface ResponseHandler {
  /**
   * 处理响应数据
   * @param response - Axios 响应对象
   * @returns 处理结果
   */
  handleResponse: (response: AxiosResponse) => any;
}

/**
 * 事件总线接口
 * @description 定义事件总线的接口，包括监听事件、取消监听事件、触发事件和一次性监听事件等方法
 */
export interface EventBus {
  /**
   * 监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消监听函数
   */
  on(event: string, callback: Function): () => void;

  /**
   * 取消监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  off(event: string, callback: Function): void;

  /**
   * 触发事件
   * @param event - 事件名称
   * @param args - 事件参数
   */
  emit(event: string, ...args: any[]): void;

  /**
   * 一次性监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消监听函数
   */
  once(event: string, callback: Function): () => void;
}

/**
 * 事件类型
 * @description 定义请求相关的事件类型，包括请求开始、请求成功、请求错误、请求完成和慢请求等事件
 */
export enum EventType {
  REQUEST_START = "request:start",
  REQUEST_SUCCESS = "request:success",
  REQUEST_ERROR = "request:error",
  REQUEST_COMPLETE = "request:complete",
  SLOW_REQUEST = "request:slow",
}

/**
 * 请求事件数据
 * @description 定义请求事件的数据结构，包括 URL、方法、时间戳、持续时间、请求 ID、配置、响应和错误等信息
 * @example
 * const requestEvent: RequestEvent = {
 *   url: '/api/users',
 *   method: 'GET',
 *   timestamp: Date.now(),
 *   duration: 100,
 *   requestId: '123',
 *   config: { url: '/api/users' },
 *   response: { data: { name: 'John' } },
 *   error: null
 * };
 */
export interface RequestEvent {
  /** 请求 URL */
  url: string;
  /** 请求方法 */
  method: string;
  /** 请求时间戳 */
  timestamp: number;
  /** 请求持续时间(ms) */
  duration?: number;
  /** 请求 ID */
  requestId?: string;
  /** 请求配置 */
  config?: AxiosRequestConfig;
  /** 请求响应 */
  response?: AxiosResponse;
  /** 请求错误 */
  error?: any;
}

/**
 * 日志级别
 * @description 定义日志的级别，包括调试、信息、警告和错误四个级别
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * 日志记录器接口
 * @description 定义日志记录的接口，包括调试、信息、警告和错误日志的记录方法，以及通用的日志记录方法
 */
export interface Logger {
  /**
   * 记录调试日志
   * @param message - 日志消息
   * @param args - 日志参数
   */
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;

  /**
   * 记录信息日志
   * @param message - 日志消息
   * @param args - 日志参数
   */
  warn(message: string, ...args: any[]): void;

  /**
   * 记录警告日志
   * @param message - 日志消息
   * @param args - 日志参数
   */
  error(message: string, ...args: any[]): void;

  /**
   * 记录错误日志
   * @param message - 日志消息
   * @param args - 日志参数
   */
  log(level: LogLevel, message: string, ...args: any[]): void;
}

// 工具函数
// =========================================

/**
 * 创建延迟函数
 * @description 返回一个 Promise，在指定的毫秒数后解决
 * @param ms - 延迟的毫秒数
 * @returns 延迟的 Promise
 * @example
 * await delay(1000); // 延迟1秒
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 生成请求的唯一键
 * @description 根据请求配置生成一个唯一的键，用于取消重复请求或缓存
 * @param config - 请求配置
 * @returns 唯一键
 * @example
 * const key = generateRequestKey({ url: '/api/users', method: 'GET' });
 */
const generateRequestKey = (config: AxiosRequestConfig): string => {
  const { url, method, params, data, requestId } = config;
  return (
    requestId ||
    [url, method, JSON.stringify(params), JSON.stringify(data)].join("&")
  );
};

// 默认处理器实现
// =========================================

/**
 * 默认状态码错误处理映射
 * @description 定义常见 HTTP 状态码对应的错误消息
 */
const defaultStatusErrorMap: Record<number, string> = {
  400: "请求参数错误",
  401: "未授权，请重新登录",
  403: "拒绝访问",
  404: "请求的资源不存在",
  500: "服务器错误",
  502: "网关错误",
  503: "服务不可用",
  504: "网关超时",
};

/**
 * 默认错误处理器
 * @description 实现错误处理器接口，提供默认的错误处理逻辑
 */
export class DefaultErrorHandler implements ErrorHandler {
  /** 状态码错误处理映射 */
  private statusErrorMap: Record<number, string>;

  /**
   * 构造函数
   * @param statusErrorMap - 状态码错误处理映射
   */
  constructor(statusErrorMap?: Record<number, string>) {
    this.statusErrorMap = statusErrorMap || defaultStatusErrorMap;
  }

  /**
   * 处理 HTTP 状态码错误
   * @param error - Axios 错误对象
   * @returns 处理结果
   */
  async handleStatusError(error: AxiosError): Promise<any> {
    const status = error.response?.status || 0;
    const message =
      this.statusErrorMap[status] || `请求失败，状态码: ${status}`;
    this.showErrorMessage(message);

    // 特殊处理 401 错误，可以在这里触发登出逻辑
    if (status === 401) {
      // 可以触发登出逻辑
      // logout()
    }

    return Promise.reject(
      new HttpError(message, {
        status,
        data: error.response?.data,
      }),
    );
  }

  /**
   * 处理网络错误
   * @param error - Axios 错误对象
   * @returns 处理结果
   */
  async handleNetworkError(error: AxiosError): Promise<any> {
    this.showErrorMessage("网络错误，请检查您的网络连接");
    return Promise.reject(new HttpError("网络错误，请检查您的网络连接"));
  }

  /**
   * 处理取消请求
   * @param error - 错误对象
   * @returns 处理结果
   */
  async handleCancelError(error: any): Promise<any> {
    // 通常不需要显示取消请求的错误消息
    console.log("请求被取消:", error.message);
    return Promise.reject(error);
  }

  /**
   * 处理通用错误
   * @param error - 错误对象
   * @returns 处理结果
   */
  async handleGeneralError(error: any): Promise<any> {
    this.showErrorMessage(error.message || "请求发生未知错误");
    return Promise.reject(error);
  }

  /**
   * 显示错误消息
   * @param message - 错误消息
   */
  showErrorMessage(message: string): void {
    console.error(message);
  }
}

/**
 * 默认响应处理器
 * @description 实现响应处理器接口，提供默认的响应处理逻辑
 */
export class DefaultResponseHandler implements ResponseHandler {
  handleResponse(response: AxiosResponse): any {
    const data = response.data;

    // 根据业务逻辑处理响应
    // 假设后端返回格式为 { code: number, data: any, message: string }
    const isStandardFormat = data && typeof data === "object" && "code" in data;

    if (!isStandardFormat) {
      return data;
    }

    const isSuccess = data.code === 0 || data.code === 200;

    if (isSuccess) {
      return data.data;
    }

    throw new HttpError(data.message || "请求失败", {
      code: data.code,
      data: data.data,
    });
  }
}

// 请求拦截器策略
// =========================================

/**
 * 请求拦截器接口
 * @description 定义请求拦截器的接口，包括拦截请求配置的方法
 */
interface RequestInterceptor {
  /**
   * 拦截请求配置
   * @param config - 请求配置
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any>;
}

/**
 * 重复请求取消拦截器
 * @description 实现请求拦截器接口，用于取消重复请求
 */
class DuplicateRequestInterceptor implements RequestInterceptor {
  /**
   * 拦截请求配置
   * @param config - 请求配置
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(
    config: AxiosRequestConfig,
    httpClient: HttpClient,
  ): Promise<any> {
    const shouldCancelDuplicated =
      httpClient.getConfig().enableCancelDuplicated &&
      config.cancelDuplicated !== false;

    if (shouldCancelDuplicated) {
      httpClient.addPendingRequest(config);
    }

    return config;
  }
}

/**
 * 认证令牌拦截器
 * @description 实现请求拦截器接口，用于在请求头中添加认证令牌
 */
class AuthTokenInterceptor implements RequestInterceptor {
  /**
   * 拦截请求配置
   * @param config - 请求配置
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(
    config: AxiosRequestConfig,
    httpClient: HttpClient,
  ): Promise<any> {
    const { getToken, setAuthHeader } = httpClient.getConfig();

    if (!getToken) {
      return config;
    }

    const token = await getToken();

    if (!token) {
      return config;
    }

    // 创建新的配置对象
    const newConfig = { ...config };

    // 确保 headers 存在
    if (!newConfig.headers) {
      newConfig.headers = {};
    }

    // 设置认证头
    if (setAuthHeader) {
      setAuthHeader(newConfig.headers, token);
    } else {
      newConfig.headers.Authorization = `Bearer ${token}`;
    }

    return newConfig;
  }
}

// 响应拦截器策略
// =========================================

/**
 * 响应拦截器接口
 * @description 定义响应拦截器的接口，包括拦截响应的方法
 */
interface ResponseInterceptor {
  /**
   * 拦截响应
   * @param response - Axios 响应对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(response: AxiosResponse, httpClient: HttpClient): any;
}

/**
 * 响应处理拦截器
 * @description 实现响应拦截器接口，用于处理响应数据
 */
class ResponseHandlerInterceptor implements ResponseInterceptor {
  /**
   * 拦截响应
   * @param response - Axios 响应对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    try {
      // 如果配置了返回原始响应，则直接返回
      if (response.config?.raw === true) {
        return response;
      }

      // 处理响应数据
      const result = httpClient.getResponseHandler().handleResponse(response);

      // 为处理后的结果添加原始响应的引用（如果结果是对象且不是AxiosResponse）
      if (
        result &&
        typeof result === "object" &&
        !Array.isArray(result) &&
        !("status" in result && "config" in result)
      ) {
        // 使用不可枚举属性添加原始响应的引用，避免污染结果对象
        Object.defineProperty(result, "__response", {
          value: response,
          enumerable: false,
          configurable: true,
          writable: false, // 防止被修改
        });
      }

      return result;
    } catch (error) {
      // 捕获处理过程中的错误，确保不会中断响应链
      console.error("响应处理拦截器错误:", error);
      // 出错时返回原始响应，保证请求流程不中断
      return response;
    }
  }
}

/**
 * 请求清理拦截器
 * @description 实现响应拦截器接口，用于清理请求相关的资源
 */
class RequestCleanupInterceptor implements ResponseInterceptor {
  /**
   * 拦截响应
   * @param response - Axios 响应对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    const shouldCleanup =
      httpClient.getConfig().enableCancelDuplicated &&
      response.config.cancelDuplicated !== false;

    if (shouldCleanup) {
      httpClient.removePendingRequest(response.config);
    }

    return response;
  }
}

// 错误处理策略
// =========================================

/**
 * 错误处理器接口
 * @description 定义错误拦截器的接口，包括拦截错误的方法
 */
interface ErrorInterceptor {
  /**
   * 拦截错误
   * @param error - 错误对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(error: any, httpClient: HttpClient): Promise<any>;
}

/**
 * 请求清理错误拦截器
 * @description 实现错误拦截器接口，用于清理请求相关的资源
 */
class RequestCleanupErrorInterceptor implements ErrorInterceptor {
  /**
   * 拦截错误
   * @param error - 错误对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    if (!error.config) {
      return Promise.reject(error);
    }

    const shouldCleanup =
      httpClient.getConfig().enableCancelDuplicated &&
      error.config.cancelDuplicated !== false;

    if (shouldCleanup) {
      httpClient.removePendingRequest(error.config);
    }

    return Promise.reject(error);
  }
}

/**
 * 重试错误拦截器
 * @description 实现错误拦截器接口，用于重试失败的请求
 */
class RetryErrorInterceptor implements ErrorInterceptor {
  /**
   * 拦截错误
   * @param error - 错误对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    if (!error.config) {
      return Promise.reject(error);
    }

    const retryConfig =
      error.config?.retry || httpClient.getConfig().defaultRetry;

    if (!retryConfig || retryConfig.count <= 0) {
      return Promise.reject(error);
    }

    // 设置重试计数器
    const newRetryConfig = { ...retryConfig, count: retryConfig.count - 1 };
    error.config.retry = newRetryConfig;

    // 延迟后重试
    await delay(retryConfig.delay || 1000);

    // 重新发送请求
    return httpClient.getAxiosInstance()(error.config);
  }
}

/**
 * 错误处理拦截器
 * @description 实现错误拦截器接口，用于处理错误
 */
class ErrorHandlerInterceptor implements ErrorInterceptor {
  /**
   * 拦截错误
   * @param error - 错误对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    // 如果不显示错误消息，则直接返回错误
    if (error.config?.showErrorMessage === false) {
      return Promise.reject(error);
    }

    const errorHandler = httpClient.getErrorHandler();

    // 使用策略模式处理不同类型的错误
    if (axios.isCancel(error)) {
      return errorHandler.handleCancelError(error);
    }

    if (isAxiosError(error)) {
      return error.response
        ? errorHandler.handleStatusError(error)
        : errorHandler.handleNetworkError(error);
    }

    return errorHandler.handleGeneralError(error);
  }
}

// HTTP 客户端实现
// =========================================

/**
 * 请求队列管理器
 * @description 管理请求队列，控制请求的并发和优先级
 */
export class RequestQueueManager {
  /** 请求队列 */
  private queue: QueuedRequest[] = [];
  /** 活跃请求数 */
  private activeCount = 0;
  /** 并发控制配置 */
  private config: ConcurrencyConfig;
  /** HTTP 客户端实例 */
  private httpClient: HttpClient;
  private logger: Logger;
  private eventBus: EventBus;

  /**
   * 构造函数
   * @param httpClient - HTTP 客户端实例
   * @param config - 并发控制配置
   */
  constructor(httpClient: HttpClient, config: Partial<ConcurrencyConfig> = {}) {
    this.httpClient = httpClient;
    this.logger = httpClient.getLogger();
    this.eventBus = httpClient.getEventBus();

    // 默认配置
    this.config = {
      maxConcurrent: 6,
      queueSize: 100,
      queueFullStrategy: "reject-new",
      queueTimeout: 30000,
      ...config,
    };
  }

  /**
   * 入队请求
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  enqueue(config: AxiosRequestConfig): Promise<any> {
    // 如果请求配置为绕过队列，则直接发送请求
    if (config.bypassQueue) {
      return this.httpClient.getAxiosInstance().request(config);
    }

    // 如果当前活跃请求数小于最大并发数，则直接发送请求
    if (this.activeCount < this.config.maxConcurrent) {
      this.activeCount++;

      return this.httpClient
        .getAxiosInstance()
        .request(config)
        .finally(() => {
          this.activeCount--;
          this.processQueue();
        });
    }

    // 否则，将请求加入队列
    return new Promise((resolve, reject) => {
      const priority = config.priority || RequestPriority.NORMAL;
      const timestamp = Date.now();
      const id = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

      const queuedRequest: QueuedRequest = {
        id,
        config,
        priority,
        resolve,
        reject,
        timestamp,
      };

      // 检查队列是否已满
      if (
        this.config.queueSize > 0 &&
        this.queue.length >= this.config.queueSize
      ) {
        if (this.config.queueFullStrategy === "reject-new") {
          // 拒绝新请求
          const error = new Error("Request queue is full");
          this.logger.warn("Request rejected: queue is full", {
            requestId: config.requestId,
          });
          return reject(error);
        } else {
          // 查找优先级最低的请求
          const lowestPriorityIndex = this.findLowestPriorityIndex();
        }
      } else {
        // 将请求添加到队列
        this.queue.push(queuedRequest);
        this.sortQueue();

        this.logger.debug("Request queued", {
          requestId: config.requestId,
          priority,
          queueLength: this.queue.length,
        });

        // 发出请求入队事件
        this.eventBus.emit("requestQueued", {
          request: config,
          priority,
          queueLength: this.queue.length,
        });
      }

      // 如果配置了队列超时，则设置超时处理
      if (this.config.queueTimeout > 0) {
        setTimeout(() => {
          // 查找请求在队列中的位置
          const index = this.queue.findIndex((req) => req.id === id);

          if (index !== -1) {
            // 如果请求仍在队列中，则将其移除并拒绝
            const request = this.queue.splice(index, 1)[0];
            const error = new Error("Request timeout in queue");

            this.logger.warn("Request timeout in queue", {
              requestId: request.config.requestId,
              queueTime: Date.now() - request.timestamp,
            });

            // 发出请求超时事件
            this.eventBus.emit("requestQueueTimeout", {
              request: request.config,
              queueTime: Date.now() - request.timestamp,
            });

            request.reject(error);
          }
        }, this.config.queueTimeout);
      }
    });
  }

  /**
   * 处理队列
   * @private
   */
  private processQueue(): void {
    // 如果队列为空或已达到最大并发数，则不处理
    if (
      this.queue.length === 0 ||
      this.activeCount >= this.config.maxConcurrent
    ) {
      return;
    }

    // 取出队列中的第一个请求
    const request = this.queue.shift();

    if (!request) {
      return;
    }

    this.activeCount++;

    // 记录请求从入队到出队的时间
    const queueTime = Date.now() - request.timestamp;

    this.logger.debug("Request dequeued", {
      requestId: request.config.requestId,
      queueTime,
      queueLength: this.queue.length,
    });

    // 发出请求出队事件
    this.eventBus.emit("requestDequeued", {
      request: request.config,
      queueTime,
      queueLength: this.queue.length,
    });

    // 发送请求
    this.httpClient
      .getAxiosInstance()
      .request(request.config)
      .then(request.resolve)
      .catch(request.reject)
      .finally(() => {
        this.activeCount--;
        this.processQueue();
      });
  }

  /**
   * 对队列按优先级排序
   * @private
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // 首先按优先级排序（降序）
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      // 其次按时间戳排序（升序，先进先出）
      return a.timestamp - b.timestamp;
    });
  }

  /**
   * 查找队列中优先级最低的请求索引
   * @private
   * @returns 优先级最低的请求索引
   */
  private findLowestPriorityIndex(): number {
    if (this.queue.length === 0) {
      return -1;
    }

    let lowestPriority = RequestPriority.CRITICAL;
    let lowestPriorityIndex = -1;

    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority < lowestPriority) {
        lowestPriority = this.queue[i].priority;
        lowestPriorityIndex = i;
      }
    }

    return lowestPriorityIndex;
  }

  /**
   * 获取队列长度
   * @returns 队列长度
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取活跃请求数
   * @returns 活跃请求数
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * 获取队列中的请求
   * @returns 队列中的请求数组
   */
  getQueue(): QueuedRequest[] {
    return [...this.queue];
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    // 拒绝所有排队的请求
    for (const request of this.queue) {
      const error = new Error("Request cancelled: queue cleared");
      request.reject(error);
    }

    this.queue = [];
    this.logger.info("Request queue cleared", { queueLength: 0 });
  }
}

// 新增拦截器
// =========================================

/**
 * 请求事件发射器拦截器
 * @description 实现请求拦截器接口，用于在请求前后发射事件
 */
class RequestEventEmitterInterceptor implements RequestInterceptor {
  /**
   * 拦截请求配置
   * @param config - 请求配置
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(
    config: AxiosRequestConfig,
    httpClient: HttpClient,
  ): Promise<any> {
    try {
      // 确保config是有效对象
      if (!config) {
        return config;
      }

      // 添加请求开始时间
      config.metadata = {
        ...(config.metadata || {}),
        startTime: Date.now(),
      };

      // 构建并发射事件
      const eventData = this.buildEventData(config);
      this.emitEvent(httpClient, eventData);
      this.logRequest(httpClient, eventData);

      return config;
    } catch (error) {
      // 捕获任何错误，确保不影响请求处理
      console.error("请求事件发射器错误:", error);
      return config;
    }
  }

  /**
   * 构建事件数据对象
   * @param config - 请求配置
   * @returns 事件数据对象
   */
  private buildEventData(config: AxiosRequestConfig): RequestEvent {
    const timestamp = Date.now();
    return {
      url: config.url || "",
      method: "UNKNOWN",
      timestamp,
      requestId: config.requestId,
      config,
    };
  }

  /**
   * 发射事件
   * @param httpClient - HTTP客户端
   * @param eventData - 事件数据
   */
  private emitEvent(httpClient: HttpClient, eventData: RequestEvent): void {
    httpClient.getEventBus().emit(EventType.REQUEST_START, eventData);
  }

  /**
   * 记录请求日志
   * @param httpClient - HTTP客户端
   * @param eventData - 事件数据
   */
  private logRequest(httpClient: HttpClient, eventData: RequestEvent): void {
    httpClient
      .getLogger()
      .info(`请求开始: ${eventData.method} ${eventData.url}`, {
        requestId: eventData.requestId,
        timestamp: eventData.timestamp,
      });
  }
}

/**
 * 响应事件发射器拦截器
 * @description 实现响应拦截器接口，用于在响应处理前后发射事件
 */
class ResponseEventEmitterInterceptor implements ResponseInterceptor {
  /**
   * 拦截响应
   * @param response - Axios 响应对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    try {
      // 确保config存在
      const config = response?.config || {};
      const endTime = Date.now();
      const startTime = config.metadata?.startTime || endTime;
      const duration = endTime - startTime;

      // 构建事件数据
      const eventData = this.buildEventData(
        config,
        response,
        endTime,
        duration,
      );

      // 发射事件
      this.emitEvents(httpClient, eventData);

      // 记录日志
      this.logResponse(httpClient, eventData);
    } catch (error) {
      // 捕获任何错误，确保不影响响应处理
      console.error("响应事件发射器错误:", error);
    }

    return response;
  }

  /**
   * 构建事件数据对象
   * @param config - 请求配置
   * @param response - 响应对象
   * @param endTime - 结束时间
   * @param duration - 持续时间
   * @returns 事件数据对象
   */
  private buildEventData(
    config: AxiosRequestConfig,
    response: AxiosResponse,
    endTime: number,
    duration: number,
  ): RequestEvent {
    return {
      url: config.url || "",
      method: config.method?.toUpperCase() || "UNKNOWN",
      timestamp: endTime,
      duration,
      requestId: config.requestId,
      config,
      response,
    };
  }

  /**
   * 发射事件
   * @param httpClient - HTTP客户端
   * @param eventData - 事件数据
   */
  private emitEvents(httpClient: HttpClient, eventData: RequestEvent): void {
    // 发出成功事件
    httpClient.getEventBus().emit(EventType.REQUEST_SUCCESS, eventData);

    // 发出完成事件
    httpClient.getEventBus().emit(EventType.REQUEST_COMPLETE, eventData);
  }

  /**
   * 记录响应日志
   * @param httpClient - HTTP客户端
   * @param eventData - 事件数据
   */
  private logResponse(httpClient: HttpClient, eventData: RequestEvent): void {
    const status = eventData.response?.status;
    const method = eventData.method;
    const url = eventData.url;
    const duration = eventData.duration;

    httpClient
      .getLogger()
      .info(`响应完成: ${method} ${url} ${status} (${duration}ms)`, {
        requestId: eventData.requestId,
        status,
        duration,
      });
  }
}

/**
 * 错误事件发射器拦截器
 * @description 实现错误拦截器接口，用于在错误处理前后发射事件
 */
class ErrorEventEmitterInterceptor implements ErrorInterceptor {
  /**
   * 拦截错误
   * @param error - 错误对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(error: any, httpClient: HttpClient): Promise<any> {
    try {
      // 如果错误对象没有config属性，无法处理，直接拒绝
      if (!error || !error.config) {
        return Promise.reject(error);
      }

      // 提取请求配置和时间信息
      const config = error.config;
      const endTime = Date.now();
      const startTime = config.metadata?.startTime;
      const duration = startTime ? endTime - startTime : undefined;

      // 构建事件数据
      const eventData: RequestEvent = this.buildEventData(
        config,
        error,
        endTime,
        duration,
      );

      // 发射事件
      this.emitEvents(httpClient, eventData);

      // 记录错误日志
      this.logError(httpClient, eventData, error);
    } catch (e) {
      // 捕获任何错误，确保不影响错误处理流程
      console.error("错误事件发射器错误:", e);
    }

    // 始终拒绝原始错误，保持错误处理链
    return Promise.reject(error);
  }

  /**
   * 构建事件数据对象
   * @param config - 请求配置
   * @param error - 错误对象
   * @param endTime - 结束时间
   * @param duration - 持续时间
   * @returns 事件数据对象
   */
  private buildEventData(
    config: AxiosRequestConfig,
    error: any,
    endTime: number,
    duration?: number,
  ): RequestEvent {
    return {
      url: config.url || "",
      method: config.method?.toUpperCase() || "UNKNOWN",
      timestamp: endTime,
      duration,
      requestId: config.requestId,
      config,
      error,
    };
  }

  /**
   * 发射事件
   * @param httpClient - HTTP客户端
   * @param eventData - 事件数据
   */
  private emitEvents(httpClient: HttpClient, eventData: RequestEvent): void {
    // 发射请求错误事件
    httpClient.getEventBus().emit(EventType.REQUEST_ERROR, eventData);

    // 发射请求完成事件
    httpClient.getEventBus().emit(EventType.REQUEST_COMPLETE, eventData);
  }

  /**
   * 记录错误日志
   * @param httpClient - HTTP客户端
   * @param eventData - 事件数据
   * @param error - 错误对象
   */
  private logError(
    httpClient: HttpClient,
    eventData: RequestEvent,
    error: any,
  ): void {
    const errorMessage = error.message || "未知错误";
    const statusCode = error.response?.status;
    const statusText = statusCode ? ` (${statusCode})` : "";

    httpClient
      .getLogger()
      .error(
        `请求失败: ${eventData.method} ${eventData.url}${statusText} - ${errorMessage}`,
        {
          requestId: eventData.requestId,
          duration: eventData.duration,
          error: {
            message: error.message,
            stack: error.stack,
            status: error.response?.status,
            data: error.response?.data,
          },
        },
      );
  }
}

/**
 * 缓存拦截器
 * @description 实现请求拦截器接口，用于处理请求缓存
 */
class CacheInterceptor implements RequestInterceptor {
  /**
   * 拦截请求配置
   * @param config - 请求配置
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  async intercept(
    config: AxiosRequestConfig,
    httpClient: HttpClient,
  ): Promise<any> {
    // 只缓存 GET 请求，且缓存未被禁用
    if (config.method?.toUpperCase() !== "GET" || config.cache === false) {
      return config;
    }

    const cacheStrategy = httpClient.getCacheStrategy();
    const cacheKey = generateCacheKey(config);

    // 检查缓存中是否有响应
    if (await cacheStrategy.has(cacheKey)) {
      const cachedResponse = await cacheStrategy.get(cacheKey);
      if (cachedResponse) {
        // 记录缓存命中日志
        httpClient
          .getLogger()
          .info(`Cache hit: ${config.method?.toUpperCase()} ${config.url}`, {
            requestId: config.requestId,
            cacheKey,
          });

        const endTime = Date.now();
        const startTime = config.metadata?.startTime || endTime;
        const duration = endTime - startTime;
        // 创建一个已解决的 Promise，跳过实际的请求
        return { cached: true, ...cachedResponse };
      }
    }

    // 如果没有缓存，继续请求
    return config;
  }
}

/**
 * 缓存响应拦截器
 * @description 实现响应拦截器接口，用于处理响应缓存
 */
class CacheResponseInterceptor implements ResponseInterceptor {
  /**
   * 拦截响应
   * @param response - Axios 响应对象
   * @param httpClient - HTTP 客户端实例
   * @returns 处理结果
   */
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    // 如果响应已经来自缓存，则跳过
    if (response.cached) {
      return response;
    }

    // 只缓存 GET 请求，且缓存未被禁用
    if (
      response.config.method!.toUpperCase() === "GET" ||
      response.config.cache === false
    ) {
      return response;
    }

    // 如果状态码不是 2xx，则不缓存
    if (response.status < 200 || response.status >= 300) {
      return response;
    }

    const cacheStrategy = httpClient.getCacheStrategy();
    const cacheKey = generateCacheKey(response.config);

    // 确定缓存时间
    let ttl = httpClient.getDefaultCacheTTL();

    if (
      typeof response.config.cache === "object" &&
      response.config.cache.ttl
    ) {
      ttl = response.config.cache.ttl;
    }

    // 缓存响应
    cacheStrategy.set(cacheKey, response, ttl);
    console.log("CacheResponseInterceptor response", response);

    // 记录缓存存储日志
    httpClient
      .getLogger()
      .debug(
        `Cache stored: ${response.config.method} ${response.config.url} (TTL: ${ttl}ms)`,
        {
          requestId: response.config.requestId,
          cacheKey,
          ttl,
        },
      );

    return response;
  }
}

/**
 * 生成缓存键
 * @description 根据请求配置生成缓存键
 * @param config - 请求配置
 * @returns 缓存键
 * @example
 * const cacheKey = generateCacheKey({ url: '/api/users', method: 'GET' });
 */
function generateCacheKey(config: AxiosRequestConfig): string {
  // 如果配置中提供了缓存键，则使用它
  if (typeof config.cache === "object" && config.cache.key) {
    return config.cache.key;
  }

  // 否则，使用 URL、方法和参数生成键
  // const { url, method, params, data } = config
  // return `${method?.toLowerCase() || 'get'}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`
  // 否则，使用 URL、方法和参数生成键

  const { url, method, params, data } = config;
  const paramsStr = params ? JSON.stringify(params) : "";
  const dataStr = data ? JSON.stringify(data) : "";
  return `${method?.toLowerCase() || "get"}:${url}:${paramsStr}:${dataStr}`;
}

// 默认实现
// =========================================

/**
 * 默认事件总线实现
 * @description 实现事件总线接口，提供默认的事件处理逻辑
 */
export class DefaultEventBus implements EventBus {
  /** 事件监听器 Map */
  private listeners: Record<string, Function[]> = {};

  /**
   * 监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消监听函数
   */
  on(event: string, callback: Function): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);

    return () => this.off(event, callback);
  }

  /**
   * 取消监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  off(event: string, callback: Function): void {
    if (!this.listeners[event]) return;

    this.listeners[event] = this.listeners[event].filter(
      (cb) => cb !== callback,
    );

    if (this.listeners[event].length === 0) {
      delete this.listeners[event];
    }
  }

  /**
   * 触发事件
   * @param event - 事件名称
   * @param args - 事件参数
   */
  emit(event: string, ...args: any[]): void {
    if (!this.listeners[event]) return;

    this.listeners[event].forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }

  /**
   * 一次性监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   * @returns 取消监听函数
   */
  once(event: string, callback: Function): () => void {
    const onceCallback = (...args: any[]) => {
      this.off(event, onceCallback);
      callback(...args);
    };

    return this.on(event, onceCallback);
  }
}

/**
 * 默认日志记录器实现
 */
export class DefaultLogger implements Logger {
  // 日志级别与对应控制台方法的映射
  private readonly logMethodMap: Record<
    LogLevel,
    (message: string, ...args: any[]) => void
  > = {
    [LogLevel.DEBUG]: console.debug,
    [LogLevel.INFO]: console.info,
    [LogLevel.WARN]: console.warn,
    [LogLevel.ERROR]: console.error,
  };

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  log(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // 使用映射获取对应的日志方法，如果不存在则使用 console.log
    const logMethod = this.logMethodMap[level] || console.log;

    // 调用对应的日志方法
    logMethod(`${prefix} ${message}`, ...args);
  }
}

/**
 * 内存缓存策略实现
 * @remarks
 * 使用 Map 实现的简单内存缓存，适合临时缓存需求
 * @example
 * const cache = new MemoryCacheStrategy();
 * cache.set('key', { data: 'value' }, 60000); // 缓存1分钟
 * const data = cache.get('key');
 */
export class MemoryCacheStrategy implements CacheStrategy {
  private cache: Map<string, CacheItem> = new Map();

  get<T = any>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expires) {
      this.delete(key);
      return null;
    }

    return item.data as T;
  }

  set<T = any>(key: string, value: T, ttl = 60000): void {
    const timestamp = Date.now();
    const expires = timestamp + ttl;

    this.cache.set(key, {
      data: value,
      timestamp,
      expires,
    });
  }

  has(key: string): boolean {
    const item = this.cache.get(key);

    if (!item) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > item.expires) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * 本地存储缓存策略实现
 * @remarks
 * 使用 localStorage 实现的持久化缓存，适合需要浏览器持久化的场景
 * @example
 * const cache = new LocalStorageCacheStrategy('app_');
 * cache.set('user', { name: 'John' }, 300000); // 缓存5分钟
 */
export class LocalStorageCacheStrategy implements CacheStrategy {
  private prefix: string;

  constructor(prefix = "http_cache_") {
    this.prefix = prefix;
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  get<T = any>(key: string): T | null {
    const fullKey = this.getFullKey(key);
    const json = localStorage.getItem(fullKey);

    if (!json) {
      return null;
    }

    try {
      const item: CacheItem<T> = JSON.parse(json);

      // 检查是否过期
      if (Date.now() > item.expires) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      this.delete(key);
      return null;
    }
  }

  set<T = any>(key: string, value: T, ttl = 60000): void {
    const fullKey = this.getFullKey(key);
    const timestamp = Date.now();
    const expires = timestamp + ttl;

    const item: CacheItem<T> = {
      data: value,
      timestamp,
      expires,
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(item));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  }

  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const json = localStorage.getItem(fullKey);

    if (!json) {
      return false;
    }

    try {
      const item: CacheItem = JSON.parse(json);

      // 检查是否过期
      if (Date.now() > item.expires) {
        this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      this.delete(key);
      return false;
    }
  }

  delete(key: string): void {
    const fullKey = this.getFullKey(key);
    localStorage.removeItem(fullKey);
  }

  clear(): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);

      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

/**
 * 性能监控拦截器
 */
class PerformanceMonitorInterceptor implements ResponseInterceptor {
  /**
   * 拦截响应并记录性能指标
   * @param response - 响应对象（可能是AxiosResponse或已处理的数据）
   * @param httpClient - HTTP客户端实例
   * @returns 原始响应，保持链式调用
   */
  intercept(response: any, httpClient: HttpClient): any {
    try {
      // 获取原始响应对象
      const originalResponse = this.getOriginalResponse(response);
      if (!originalResponse) {
        return response;
      }

      // 计算性能指标
      const metrics = this.calculateMetrics(originalResponse, httpClient);

      // 记录性能指标
      httpClient.getPerformanceMonitor().recordMetrics(metrics);

      // 处理慢请求
      if (metrics.slow) {
        this.handleSlowRequest(metrics, httpClient);
      }
    } catch (error) {
      // 捕获任何错误，确保不影响响应处理
      console.error("性能监控拦截器错误:", error);
    }

    return response;
  }

  /**
   * 获取原始响应对象
   * @param response - 可能是AxiosResponse或已处理的数据
   * @returns 原始AxiosResponse对象或null
   */
  private getOriginalResponse(response: any): AxiosResponse | null {
    // 如果response本身就是AxiosResponse
    if (
      response &&
      typeof response === "object" &&
      response.config &&
      response.status
    ) {
      return response;
    }

    // 如果response是处理后的对象，尝试获取__response属性
    if (response && typeof response === "object") {
      const originalResponse = response.__response || response._response;
      if (originalResponse && originalResponse.config) {
        return originalResponse;
      }
    }

    return null;
  }

  /**
   * 计算性能指标
   * @param response - 原始AxiosResponse对象
   * @param httpClient - HTTP客户端实例
   * @returns 性能指标对象
   */
  private calculateMetrics(
    response: AxiosResponse,
    httpClient: HttpClient,
  ): PerformanceMetrics {
    const config = response.config;
    const endTime = Date.now();
    const startTime = config.metadata?.startTime || endTime;
    const duration = endTime - startTime;
    const slow = duration > httpClient.getSlowRequestThreshold();

    return {
      url: config.url || "",
      method: "GET",
      requestId: config.requestId,
      startTime,
      endTime,
      duration,
      status: response.status,
      slow,
      cached: !!response.cached,
    };
  }

  /**
   * 处理慢请求
   * @param metrics - 性能指标
   * @param httpClient - HTTP客户端实例
   */
  private handleSlowRequest(
    metrics: PerformanceMetrics,
    httpClient: HttpClient,
  ): void {
    httpClient.getEventBus().emit(EventType.SLOW_REQUEST, metrics);
    httpClient
      .getLogger()
      .warn(`慢请求: ${metrics.method} ${metrics.url} (${metrics.duration}ms)`);
  }
}

/**
 * 默认性能监控实现
 */
export class DefaultPerformanceMonitor implements PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxEntries: number;

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries;
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    // 限制存储的指标数量
    if (this.metrics.length >= this.maxEntries) {
      this.metrics.shift(); // 移除最旧的条目
    }

    // 添加新的指标
    this.metrics.push(metrics);
  }

  getAverageResponseTime(url?: string, method?: string): number {
    const filteredMetrics = this.metrics.filter((metric) => {
      if (url && metric.url !== url) return false;
      if (method && metric.method !== method) return false;
      return true;
    });

    if (filteredMetrics.length === 0) {
      return 0;
    }

    const totalDuration = filteredMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0,
    );
    return totalDuration / filteredMetrics.length;
  }

  getSlowRequests(threshold?: number): PerformanceMetrics[] {
    if (!threshold) {
      return this.metrics.filter((metric) => metric.slow);
    }

    return this.metrics.filter((metric) => metric.duration > threshold);
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  clear(): void {
    this.metrics = [];
  }
}

/**
 * HTTP 客户端主类
 * @description 封装增强型 HTTP 客户端，提供高级请求管理功能
 * @example
 * // 创建客户端实例
 * const client = new HttpClient({
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000
 * });
 *
 * // 发起 GET 请求
 * client.get('/users')
 *   .then(data => console.log(data))
 *   .catch(error => console.error(error));
 *
 * // 发起带缓存的 POST 请求
 * client.post('/data', { id: 1 }, {
 *   cache: { ttl: 300000 } // 缓存5分钟
 * });
 */
export class HttpClient {
  /** Axios 实例 */
  private instance!: AxiosInstance;
  /** 待处理请求的 Map */
  private pendingRequests!: Map<string, AbortController>;
  /** HTTP 客户端配置 */
  private config!: HttpClientConfig;
  /** 错误处理器 */
  private errorHandler!: ErrorHandler;
  /** 响应处理器 */
  private responseHandler!: ResponseHandler;
  /** 请求拦截器数组 */
  private requestInterceptors!: RequestInterceptor[];
  /** 响应拦截器数组 */
  private responseInterceptors!: ResponseInterceptor[];
  /** 错误拦截器数组 */
  private errorInterceptors!: ErrorInterceptor[];
  /** 事件总线 */
  private eventBus!: EventBus;
  /** 日志记录器 */
  private logger!: Logger;
  /** 缓存策略 */
  private cacheStrategy!: CacheStrategy;
  /** 性能监控器 */
  private performanceMonitor!: PerformanceMonitor;
  /** 请求队列管理器 */
  private requestQueue!: RequestQueueManager;

  /**
   * 构造函数
   * @param config - HTTP 客户端配置
   */
  constructor(config: HttpClientConfig = {}) {
    // 初始化基础配置
    this.initializeConfig(config);

    // 初始化核心组件
    this.instance = axios.create(this.config);
    this.pendingRequests = new Map<string, AbortController>();

    // 初始化处理器和服务
    this.initializeHandlersAndServices(config);

    // 初始化拦截器
    this.initializeInterceptors();

    // 设置拦截器
    this.setupInterceptors();
  }

  /**
   * 初始化配置
   * @param config - 用户提供的配置
   */
  private initializeConfig(config: HttpClientConfig): void {
    this.config = {
      // 基础配置
      baseURL: "http://localhost:3000",
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },

      // 功能配置
      enableCancelDuplicated: true,
      defaultRetry: {
        count: 0,
        delay: 1000,
      },
      slowRequestThreshold: 1000, // 默认慢请求阈值为 1 秒
      defaultCacheTTL: 60000, // 默认缓存时间为 1 分钟

      // 合并用户配置
      ...config,
    };
  }

  /**
   * 初始化处理器和服务
   * @param config - 用户提供的配置
   */
  private initializeHandlersAndServices(config: HttpClientConfig): void {
    // 初始化处理器
    this.errorHandler = config.errorHandler || new DefaultErrorHandler();
    this.responseHandler =
      config.responseHandler || new DefaultResponseHandler();

    // 初始化服务
    this.eventBus = config.eventBus || new DefaultEventBus();
    this.logger = config.logger || new DefaultLogger();
    this.cacheStrategy = config.cacheStrategy || new MemoryCacheStrategy();
    this.performanceMonitor =
      config.performanceMonitor || new DefaultPerformanceMonitor();

    // 初始化请求队列管理器
    this.requestQueue = new RequestQueueManager(this, config.concurrency);
  }

  /**
   * 初始化拦截器
   */
  private initializeInterceptors(): void {
    // 请求拦截器
    this.requestInterceptors = [
      new RequestEventEmitterInterceptor(),
      new DuplicateRequestInterceptor(),
      new AuthTokenInterceptor(),
      new CacheInterceptor(),
    ];

    // 响应拦截器
    this.responseInterceptors = [
      new RequestCleanupInterceptor(),
      new PerformanceMonitorInterceptor(),
      new CacheResponseInterceptor(),
      new ResponseEventEmitterInterceptor(),
      new ResponseHandlerInterceptor(),
    ];

    // 错误拦截器
    this.errorInterceptors = [
      new RequestCleanupErrorInterceptor(),
      new RetryErrorInterceptor(),
      new ErrorEventEmitterInterceptor(),
      new ErrorHandlerInterceptor(),
    ];
  }

  /**
   * 设置拦截器
   * @private
   */
  private setupInterceptors(): void {
    // 请求拦截器
    this.instance.interceptors.request.use(
      async (config) => {
        // 使用责任链模式依次应用所有请求拦截器
        let currentConfig = { ...config };

        for (const interceptor of this.requestInterceptors) {
          currentConfig = await interceptor.intercept(currentConfig, this);
        }

        return currentConfig;
      },
      (error) => Promise.reject(error),
    );

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 按顺序执行响应拦截器
        return this.responseInterceptors
          .reduce(async (promise, interceptor) => {
            return await promise.then((res) =>
              interceptor.intercept(res, this),
            );
          }, Promise.resolve(response))
          .catch((error) => {
            // 处理响应拦截器中的错误
            return Promise.reject(error);
          });
      },
      async (error: any) => {
        // 使用责任链模式依次应用所有错误拦截器
        for (const interceptor of this.errorInterceptors) {
          try {
            return await interceptor.intercept(error, this);
          } catch (err) {
            error = err;
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * 添加请求到 pendingRequests
   * @param config - 请求配置
   */
  addPendingRequest(config: AxiosRequestConfig): void {
    const requestKey = generateRequestKey(config);

    // 如果有重复请求，取消前一个请求
    if (this.pendingRequests.has(requestKey)) {
      const controller = this.pendingRequests.get(requestKey);
      controller?.abort("请求已取消，原因：重复请求");
      this.pendingRequests.delete(requestKey);
    }

    // 创建新的 AbortController
    const controller = new AbortController();
    config.signal = controller.signal;
    this.pendingRequests.set(requestKey, controller);
  }

  /**
   * 从 pendingRequests 中移除请求
   * @param config - 请求配置
   */
  removePendingRequest(config: AxiosRequestConfig): void {
    const requestKey = generateRequestKey(config);
    this.pendingRequests.delete(requestKey);
  }

  /**
   * 获取配置
   * @returns HTTP 客户端配置
   */
  getConfig(): HttpClientConfig {
    return this.config;
  }

  /**
   * 获取错误处理器
   * @returns 错误处理器
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * 获取响应处理器
   * @returns 响应处理器
   */
  getResponseHandler(): ResponseHandler {
    return this.responseHandler;
  }

  /**
   * 发送请求
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    // 使用请求队列管理器处理请求
    return this.requestQueue.enqueue(config) as Promise<AxiosResponse<T>>;
  }

  /**
   * 发送 GET 请求
   * @param url - 请求 URL
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  get<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  /**
   * 发送 POST 请求
   * @param url - 请求 URL
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  /**
   * 发送 PUT 请求
   * @param url - 请求 URL
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  /**
   * 发送 DELETE 请求
   * @param url - 请求 URL
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  delete<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  /**
   * 发送 PATCH 请求
   * @param url - 请求 URL
   * @param data - 请求数据
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "PATCH", url, data });
  }

  /**
   * 发送 HEAD 请求
   * @param url - 请求 URL
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  head<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "HEAD", url });
  }

  /**
   * 发送 OPTIONS 请求
   * @param url - 请求 URL
   * @param config - 请求配置
   * @returns 请求结果的 Promise
   */
  options<T = any>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: "OPTIONS", url });
  }

  /**
   * 获取请求队列管理器
   * @returns 请求队列管理器
   */
  getRequestQueue(): RequestQueueManager {
    return this.requestQueue;
  }

  /**
   * 获取队列长度
   * @returns 队列长度
   */
  getQueueLength(): number {
    return this.requestQueue.getQueueLength();
  }

  /**
   * 获取活跃请求数
   * @returns 活跃请求数
   */
  getActiveRequestCount(): number {
    return this.requestQueue.getActiveCount();
  }

  /**
   * @description 清空请求队列
   */
  clearRequestQueue(): void {
    this.requestQueue.clearQueue();
  }

  /**
   * 创建可取消请求
   * @param requestFn - 需要包装的请求函数
   * @returns 元组 [包装后的请求函数, 取消方法]
   * @example
   * const [fetchData, cancel] = client.createCancelableRequest(
   *   (params) => client.get('/data', { params })
   * );
   *
   * // 发起请求
   * fetchData({ id: 123 });
   *
   * // 取消请求
   * cancel();
   */
  createCancelableRequest<T = any, P extends any[] = any[]>(
    requestFn: (...args: P) => Promise<T>,
  ): [(...args: P) => Promise<T>, () => void] {
    let controller: AbortController | null = null;

    const wrappedRequest = (...args: P): Promise<T> => {
      // 如果有之前的请求，先取消
      if (controller) {
        controller.abort("请求已取消，原因：用户取消");
      }

      // 创建新的 AbortController
      controller = new AbortController();

      // 找到原始请求的最后一个参数（如果是对象，则可能是配置对象）
      const lastArg = args[args.length - 1];
      if (lastArg && typeof lastArg === "object" && !Array.isArray(lastArg)) {
        // 将 signal 添加到配置中
        args[args.length - 1] = {
          ...lastArg,
          signal: controller.signal,
        };
      }

      return requestFn(...args);
    };

    const cancel = () => {
      if (controller) {
        controller.abort("请求已取消，原因：用户取消");
        controller = null;
      }
    };

    return [wrappedRequest, cancel];
  }

  /**
   * 取消所有请求
   * @param reason - 取消原因
   */
  cancelAllRequests(reason = "用户取消了所有请求"): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort(reason);
    });
    this.pendingRequests.clear();
  }

  /**
   * 取消指定请求
   * @param requestId - 请求ID
   * @param reason - 取消原因
   */
  cancelRequest(requestId: string, reason = "用户取消了请求"): void {
    const controller = this.pendingRequests.get(requestId);
    if (controller) {
      controller.abort(reason);
      this.pendingRequests.delete(requestId);
    }
  }

  /**
   * 设置默认配置
   * @param config - 配置
   */
  setConfig(config: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...config };

    // 更新 axios 实例配置，只更新安全的属性
    if (config.baseURL) {
      this.instance.defaults.baseURL = config.baseURL;
    }
    if (config.timeout) {
      this.instance.defaults.timeout = config.timeout;
    }

    // 如果提供了新的错误处理器，则更新
    if (config.errorHandler) {
      this.errorHandler = config.errorHandler;
    }

    // 如果提供了新的响应处理器，则更新
    if (config.responseHandler) {
      this.responseHandler = config.responseHandler;
    }
  }

  /**
   * 获取 Axios 实例
   * @internal 仅供内部使用
   * @returns Axios 实例
   */
  getAxiosInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * 添加请求拦截器
   * @param interceptor - 请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
    this.setupInterceptors();
  }

  /**
   * 添加响应拦截器
   * @param interceptor - 响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
    this.setupInterceptors();
  }

  /**
   * 添加错误拦截器
   * @param interceptor - 错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
    this.setupInterceptors();
  }

  /**
   * 获取事件总线
   * @returns 事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * 获取日志记录器
   * @returns 日志记录器
   */
  getLogger(): Logger {
    return this.logger;
  }

  /**
   * 获取慢请求阈值
   * @returns 慢请求阈值
   */
  getSlowRequestThreshold(): number {
    return this.config.slowRequestThreshold || 1000;
  }

  /**
   * 获取缓存策略
   * @returns 缓存策略
   */
  getCacheStrategy(): CacheStrategy {
    return this.cacheStrategy;
  }

  /**
   * 获取默认缓存时间
   * @returns 默认缓存时间
   */
  getDefaultCacheTTL(): number {
    return this.config.defaultCacheTTL || 60000;
  }

  /**
   * @description 清除缓存
   */
  clearCache(): Promise<void> | void {
    return this.cacheStrategy.clear();
  }

  /**
   * 获取性能监控器
   * @returns 性能监控器
   */
  getPerformanceMonitor(): PerformanceMonitor {
    return this.performanceMonitor;
  }

  /**
   * 获取平均响应时间
   * @param url - 可选的 URL 过滤器
   * @param method - 可选的请求方法过滤器
   * @returns 平均响应时间
   */
  getAverageResponseTime(url?: string, method?: string): number {
    return this.performanceMonitor.getAverageResponseTime(url, method);
  }

  /**
   * 获取慢请求列表
   * @param threshold - 可选的阈值（毫秒）
   * @returns 慢请求列表
   */
  getSlowRequests(threshold?: number): PerformanceMetrics[] {
    return this.performanceMonitor.getSlowRequests(threshold);
  }

  /**
   * 获取所有性能指标
   * @returns 所有性能指标列表
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * @description 清除性能指标
   */
  clearPerformanceMetrics(): void {
    this.performanceMonitor.clear();
  }
}

// 创建默认实例
// =========================================

/**
 * @description 默认 HTTP 客户端实例
 */
export const httpClient = new HttpClient({
  // baseURL: 'https://api.example.com',
  baseURL: "http://172.20.10.4:3000",
  timeout: 10000,
  enableCancelDuplicated: true,
  defaultRetry: {
    count: 3,
    delay: 1000,
  },
  slowRequestThreshold: 2000, // 慢请求阈值为 2 秒
  defaultCacheTTL: 120000, // 默认缓存时间为 2 分钟
  // 假设这里有默认的错误处理器、响应处理器、事件总线、日志记录器、缓存策略和性能监控器
  errorHandler: new DefaultErrorHandler(),
  responseHandler: new DefaultResponseHandler(),
  eventBus: new DefaultEventBus(),
  logger: new DefaultLogger(),
  cacheStrategy: new MemoryCacheStrategy(),
  performanceMonitor: new DefaultPerformanceMonitor(),
  metadata: {
    startTime: Date.now(),
  },
  concurrency: {
    maxConcurrent: 10,
    queueSize: 100,
    queueFullStrategy: "reject-new",
    queueTimeout: 60000,
  },
});

/**
 * @description 通用请求方法
 */
export const request = httpClient.request.bind(httpClient);

/**
 * @description GET 请求
 */
export const get = httpClient.get.bind(httpClient);

/**
 * @description POST 请求
 */
export const post = httpClient.post.bind(httpClient);

/**
 * @description PUT 请求
 */
export const put = httpClient.put.bind(httpClient);

/**
 * @description DELETE 请求
 */
export const del = httpClient.delete.bind(httpClient);

/**
 * @description PATCH 请求
 */
export const patch = httpClient.patch.bind(httpClient);

/**
 * @description 创建可取消的请求
 */
export const createCancelableRequest =
  httpClient.createCancelableRequest.bind(httpClient);

/**
 * @description 取消所有请求
 */
export const cancelAllRequests = httpClient.cancelAllRequests.bind(httpClient);

/**
 * @description 取消指定请求
 */
export const cancelRequest = httpClient.cancelRequest.bind(httpClient);

/**
 * @description 设置默认配置
 */
export const setConfig = httpClient.setConfig.bind(httpClient);

/**
 * @description 创建新的 HTTP 客户端实例
 */
export const createHttpClient = (config: HttpClientConfig = {}): HttpClient => {
  return new HttpClient(config);
};

// 导出工具函数
export { isCancel, isAxiosError };

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
  isAxiosError,
};
/*
async request<T = any>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      this.eventBus?.emit(EventType.REQUEST_START, {
        url: config.url,
        method: config.method,
        timestamp: Date.now(),
        config
      });

      const startTime = Date.now();
      const response = await this.instance.request<T>(config);
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.eventBus?.emit(EventType.REQUEST_SUCCESS, {
        url: config.url,
        method: config.method,
        timestamp: Date.now(),
        duration,
        requestId: config.requestId,
        config,
        response
      });

      const metrics: PerformanceMetrics = {
        url: config.url,
        method: config.method,
        requestId: config.requestId,
        startTime,
        endTime,
        duration,
        status: response.status,
        slow: duration > (this.config.slowRequestThreshold || 5000),
        cached: response.cached || false
      };
      this.performanceMonitor?.recordMetrics(metrics);

      if (metrics.slow) {
        this.eventBus?.emit(EventType.SLOW_REQUEST, metrics);
      }

      this.eventBus?.emit(EventType.REQUEST_COMPLETE, {
        url: config.url,
        method: config.method,
        timestamp: Date.now(),
        duration,
        requestId: config.requestId,
        config,
        response
      });

      return response;
    } catch (error) {
      this.eventBus?.emit(EventType.REQUEST_ERROR, {
        url: config.url,
        method: config.method,
        timestamp: Date.now(),
        requestId: config.requestId,
        config,
        error
      });

      this.eventBus?.emit(EventType.REQUEST_COMPLETE, {
        url: config.url,
        method: config.method,
        timestamp: Date.now(),
        requestId: config.requestId,
        config,
        error
      });

      throw error;
    }
  }
*/
