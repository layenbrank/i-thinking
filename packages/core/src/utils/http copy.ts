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
  type InternalAxiosRequestConfig,
} from "axios";

// 类型定义
// =========================================

/**
 * 自定义 HTTP 错误类
 */
export class HttpError extends Error {
  status?: number;
  code?: string | number;
  data?: any;

  constructor(
    message?: string,
    options?: { status?: number; code?: string | number; data?: any },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = options?.status;
    this.code = options?.code;
    this.data = options?.data;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 请求配置扩展
 */
declare module "axios" {
  export interface AxiosRequestConfig {
    // 是否取消重复请求
    cancelDuplicated?: boolean;
    // 重试配置
    retry?: {
      // 重试次数
      count: number;
      // 重试延迟(ms)
      delay: number;
    };
    // 是否显示错误提示
    showErrorMessage?: boolean;
    // 是否返回原始响应（不经过拦截器处理）
    raw?: boolean;
    // 自定义请求标识符（用于取消重复请求）
    requestId?: string;
  }
}

/**
 * HTTP 客户端配置
 */
export interface HttpClientConfig extends CreateAxiosDefaults {
  // 请求基础路径
  baseURL?: string;
  // 请求超时时间
  timeout?: number;
  // 是否启用请求重复取消
  enableCancelDuplicated?: boolean;
  // 默认重试配置
  defaultRetry?: {
    count: number;
    delay: number;
  };
  // 获取认证令牌的函数
  getToken?: () => string | null | Promise<string | null>;
  // 设置认证令牌的函数
  setAuthHeader?: (headers: any, token: string) => void;
  // 错误处理器
  errorHandler?: ErrorHandler;
  // 响应处理器
  responseHandler?: ResponseHandler;
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
  handleStatusError: (error: AxiosError) => Promise<any>;
  // 处理网络错误
  handleNetworkError: (error: AxiosError) => Promise<any>;
  // 处理取消请求
  handleCancelError: (error: any) => Promise<any>;
  // 处理通用错误
  handleGeneralError: (error: any) => Promise<any>;
  // 显示错误消息
  showErrorMessage: (message: string) => void;
}

/**
 * 响应处理器接口
 */
export interface ResponseHandler {
  // 处理响应数据
  handleResponse: (response: AxiosResponse) => any;
}

// 工具函数
// =========================================

/**
 * 创建延迟函数
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 生成请求的唯一键
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
 */
export class DefaultErrorHandler implements ErrorHandler {
  private statusErrorMap: Record<number, string>;

  constructor(statusErrorMap?: Record<number, string>) {
    this.statusErrorMap = statusErrorMap || defaultStatusErrorMap;
  }

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

  async handleNetworkError(error: AxiosError): Promise<any> {
    this.showErrorMessage("网络错误，请检查您的网络连接");
    return Promise.reject(new HttpError("网络错误，请检查您的网络连接"));
  }

  async handleCancelError(error: any): Promise<any> {
    // 通常不需要显示取消请求的错误消息
    console.log("请求被取消:", error.message);
    return Promise.reject(error);
  }

  async handleGeneralError(error: any): Promise<any> {
    this.showErrorMessage(error.message || "请求发生未知错误");
    return Promise.reject(error);
  }

  showErrorMessage(message: string): void {
    console.error(message);
  }
}

/**
 * 默认响应处理器
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
 */
interface RequestInterceptor {
  intercept(config: AxiosRequestConfig, httpClient: HttpClient): Promise<any>;
}

/**
 * 重复请求取消拦截器
 */
class DuplicateRequestInterceptor implements RequestInterceptor {
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
 */
class AuthTokenInterceptor implements RequestInterceptor {
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
 */
interface ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any;
}

/**
 * 响应处理拦截器
 */
class ResponseHandlerInterceptor implements ResponseInterceptor {
  intercept(response: AxiosResponse, httpClient: HttpClient): any {
    const shouldReturnRaw = response.config.raw === true;

    if (shouldReturnRaw) {
      return response;
    }

    return httpClient.getResponseHandler().handleResponse(response);
  }
}

/**
 * 请求清理拦截器
 */
class RequestCleanupInterceptor implements ResponseInterceptor {
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
 */
interface ErrorInterceptor {
  intercept(error: any, httpClient: HttpClient): Promise<any>;
}

/**
 * 请求清理错误拦截器
 */
class RequestCleanupErrorInterceptor implements ErrorInterceptor {
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
 */
class RetryErrorInterceptor implements ErrorInterceptor {
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
    return httpClient.getInstance()(error.config);
  }
}

/**
 * 错误处理拦截器
 */
class ErrorHandlerInterceptor implements ErrorInterceptor {
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
 * HTTP 客户端类
 */
export class HttpClient {
  private instance: AxiosInstance;
  private pendingRequests: Map<string, AbortController>;
  private config: HttpClientConfig;
  private errorHandler: ErrorHandler;
  private responseHandler: ResponseHandler;
  private requestInterceptors: RequestInterceptor[];
  private responseInterceptors: ResponseInterceptor[];
  private errorInterceptors: ErrorInterceptor[];

  /**
   * 构造函数
   * @param config HTTP 客户端配置
   */
  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: "http://localhost:3000",
      timeout: 5000,
      headers: {
        "Content-Type": "application/json",
      },
      enableCancelDuplicated: true,
      defaultRetry: {
        count: 0,
        delay: 1000,
      },
      ...config,
    };

    this.instance = axios.create(this.config);
    this.pendingRequests = new Map<string, AbortController>();
    this.errorHandler = config.errorHandler || new DefaultErrorHandler();
    this.responseHandler =
      config.responseHandler || new DefaultResponseHandler();

    // 初始化拦截器
    this.requestInterceptors = [
      new DuplicateRequestInterceptor(),
      new AuthTokenInterceptor(),
    ];

    this.responseInterceptors = [
      new RequestCleanupInterceptor(),
      new ResponseHandlerInterceptor(),
    ];

    this.errorInterceptors = [
      new RequestCleanupErrorInterceptor(),
      new RetryErrorInterceptor(),
      new ErrorHandlerInterceptor(),
    ];

    this.setupInterceptors();
  }

  /**
   * 设置拦截器
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
      (response) => {
        // 使用责任链模式依次应用所有响应拦截器
        let currentResponse = { ...response };

        for (const interceptor of this.responseInterceptors) {
          currentResponse = interceptor.intercept(currentResponse, this);
        }

        return currentResponse;
      },
      async (error) => {
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
   */
  removePendingRequest(config: AxiosRequestConfig): void {
    const requestKey = generateRequestKey(config);
    this.pendingRequests.delete(requestKey);
  }

  /**
   * 获取配置
   */
  getConfig(): HttpClientConfig {
    return this.config;
  }

  /**
   * 获取错误处理器
   */
  getErrorHandler(): ErrorHandler {
    return this.errorHandler;
  }

  /**
   * 获取响应处理器
   */
  getResponseHandler(): ResponseHandler {
    return this.responseHandler;
  }

  /**
   * 通用请求方法
   * @param options 请求配置
   * @returns Promise
   */
  async request<T = any>(options: RequestOptions): Promise<T> {
    return this.instance.request(options);
  }

  /**
   * GET 请求
   * @param url 请求地址
   * @param params 请求参数
   * @param options 其他配置
   * @returns Promise
   */
  get<T = any>(
    url: string,
    params?: any,
    options?: Omit<RequestOptions, "url" | "method" | "params">,
  ): Promise<T> {
    return this.request<T>({
      method: "GET",
      url,
      params,
      ...options,
    });
  }

  /**
   * POST 请求
   * @param url 请求地址
   * @param data 请求数据
   * @param options 其他配置
   * @returns Promise
   */
  post<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestOptions, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({
      method: "POST",
      url,
      data,
      ...options,
    });
  }

  /**
   * PUT 请求
   * @param url 请求地址
   * @param data 请求数据
   * @param options 其他配置
   * @returns Promise
   */
  put<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestOptions, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({
      method: "PUT",
      url,
      data,
      ...options,
    });
  }

  /**
   * DELETE 请求
   * @param url 请求地址
   * @param params 请求参数
   * @param options 其他配置
   * @returns Promise
   */
  delete<T = any>(
    url: string,
    params?: any,
    options?: Omit<RequestOptions, "url" | "method" | "params">,
  ): Promise<T> {
    return this.request<T>({
      method: "DELETE",
      url,
      params,
      ...options,
    });
  }

  /**
   * PATCH 请求
   * @param url 请求地址
   * @param data 请求数据
   * @param options 其他配置
   * @returns Promise
   */
  patch<T = any>(
    url: string,
    data?: any,
    options?: Omit<RequestOptions, "url" | "method" | "data">,
  ): Promise<T> {
    return this.request<T>({
      method: "PATCH",
      url,
      data,
      ...options,
    });
  }

  /**
   * 创建一个可取消的请求
   * @param requestFn 请求函数
   * @returns [请求函数, 取消函数]
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
   * @param reason 取消原因
   */
  cancelAllRequests(reason = "用户取消了所有请求"): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort(reason);
    });
    this.pendingRequests.clear();
  }

  /**
   * 取消指定请求
   * @param requestId 请求ID
   * @param reason 取消原因
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
   * @param config 配置
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
   * 获取 axios 实例
   */
  getInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
    this.setupInterceptors();
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
    this.setupInterceptors();
  }

  /**
   * 添加错误拦截器
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
    this.setupInterceptors();
  }
}

// 创建默认实例
// =========================================

/**
 * 默认 HTTP 客户端实例
 */
export const httpClient = new HttpClient();

/**
 * 通用请求方法
 */
export const request = httpClient.request.bind(httpClient);

/**
 * GET 请求
 */
export const get = httpClient.get.bind(httpClient);

/**
 * POST 请求
 */
export const post = httpClient.post.bind(httpClient);

/**
 * PUT 请求
 */
export const put = httpClient.put.bind(httpClient);

/**
 * DELETE 请求
 */
export const del = httpClient.delete.bind(httpClient);

/**
 * PATCH 请求
 */
export const patch = httpClient.patch.bind(httpClient);

/**
 * 创建可取消的请求
 */
export const createCancelableRequest =
  httpClient.createCancelableRequest.bind(httpClient);

/**
 * 取消所有请求
 */
export const cancelAllRequests = httpClient.cancelAllRequests.bind(httpClient);

/**
 * 取消指定请求
 */
export const cancelRequest = httpClient.cancelRequest.bind(httpClient);

/**
 * 设置默认配置
 */
export const setConfig = httpClient.setConfig.bind(httpClient);

/**
 * 创建新的 HTTP 客户端实例
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
