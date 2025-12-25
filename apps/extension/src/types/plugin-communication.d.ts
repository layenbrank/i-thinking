/**
 * 插件间通信协议类型定义
 */
declare namespace PluginCommunication {
  /**
   * 消息类型
   */
  export enum MessageType {
    /** 请求 */
    REQUEST = 'REQUEST',
    /** 响应 */
    RESPONSE = 'RESPONSE',
    /** 广播 */
    BROADCAST = 'BROADCAST',
    /** 订阅 */
    SUBSCRIBE = 'SUBSCRIBE',
    /** 取消订阅 */
    UNSUBSCRIBE = 'UNSUBSCRIBE',
    /** 错误 */
    ERROR = 'ERROR'
  }

  /**
   * 消息接口
   */
  export interface Message<TPayload = any> {
    /** 消息ID */
    id: string
    /** 消息类型 */
    type: MessageType
    /** 源插件 */
    from: string
    /** 目标插件 */
    to?: string
    /** 主题 */
    topic?: string
    /** 负载 */
    payload: TPayload
    /** 时间戳 */
    timestamp: number
    /** 请求ID（用于响应） */
    requestId?: string
  }

  /**
   * 通道
   */
  export type Channel = string

  /**
   * 主题
   */
  export type Topic = string

  /**
   * 消息过滤器
   */
  export type MessageFilter = (message: Message) => boolean

  /**
   * 消息处理器
   */
  export type MessageHandler<T = any> = (payload: T, message: Message<T>) => void | Promise<void>

  /**
   * 通信选项
   */
  export interface CommunicationOptions {
    /** 超时时间（毫秒） */
    timeout?: number
    /** 优先级 */
    priority?: 'high' | 'normal' | 'low'
    /** 重试次数 */
    retry?: number
    /** 是否需要确认 */
    ack?: boolean
  }

  /**
   * 消息总线接口
   */
  export interface MessageBus {
    /**
     * 发送消息
     */
    send: <T>(target: string, payload: T, options?: CommunicationOptions) => void

    /**
     * 广播消息
     */
    broadcast: <T>(topic: Topic, payload: T) => void

    /**
     * 订阅主题
     */
    subscribe: <T>(topic: Topic, handler: MessageHandler<T>) => () => void

    /**
     * 取消订阅
     */
    unsubscribe: (topic: Topic, handler: MessageHandler) => void

    /**
     * 请求-响应
     */
    request: <TReq, TRes>(
      target: string,
      payload: TReq,
      options?: CommunicationOptions
    ) => Promise<TRes>

    /**
     * 销毁
     */
    dispose: () => void
  }

  /**
   * 中间件函数
   */
  export type Middleware = (message: Message, next: () => Promise<void>) => void | Promise<void>
}

export { PluginCommunication }
