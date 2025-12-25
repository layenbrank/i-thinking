/**
 * iframe 通信协议类型定义
 */
declare namespace IframeProtocol {
  /**
   * 消息类型枚举
   */
  export enum MessageType {
    /** 全量渲染内容 */
    RENDER = 'RENDER',
    /** 增量追加内容 */
    APPEND = 'APPEND',
    /** 清空内容 */
    CLEAR = 'CLEAR',
    /** 动态样式注入 */
    STYLE = 'STYLE',
    /** 脚本执行 */
    SCRIPT = 'SCRIPT',
    /** 错误消息 */
    ERROR = 'ERROR',
    /** 就绪通知 */
    READY = 'READY',
    /** 用户交互动作 */
    ACTION = 'ACTION',
    /** 滚动到指定位置 */
    SCROLL = 'SCROLL',
    /** 配置更新 */
    CONFIG = 'CONFIG'
  }

  /**
   * 基础消息接口
   */
  export interface BaseMessage<T = any> {
    /** 消息唯一ID */
    id: string
    /** 消息类型 */
    type: MessageType
    /** 消息负载 */
    payload: T
    /** 时间戳 */
    timestamp: number
    /** 来源标识 */
    source?: string
  }

  /**
   * 渲染消息
   */
  export interface RenderMessage extends BaseMessage<{
    /** HTML 内容 */
    html: string
    /** 是否清空现有内容 */
    clear?: boolean
  }> {
    type: MessageType.RENDER
  }

  /**
   * 追加消息
   */
  export interface AppendMessage extends BaseMessage<{
    /** 追加的 HTML 内容 */
    html: string
    /** 追加位置 */
    position?: 'beforeend' | 'afterbegin'
    /** 目标选择器 */
    target?: string
  }> {
    type: MessageType.APPEND
  }

  /**
   * 清空消息
   */
  export interface ClearMessage extends BaseMessage<{
    /** 目标选择器，为空则清空全部 */
    target?: string
  }> {
    type: MessageType.CLEAR
  }

  /**
   * 样式消息
   */
  export interface StyleMessage extends BaseMessage<{
    /** CSS 内容 */
    css: string
    /** 样式ID，用于更新或删除 */
    id?: string
    /** 是否为链接 */
    href?: string
  }> {
    type: MessageType.STYLE
  }

  /**
   * 脚本消息
   */
  export interface ScriptMessage extends BaseMessage<{
    /** 脚本内容 */
    code: string
    /** 脚本类型 */
    type?: 'module' | 'text/javascript'
    /** 是否异步执行 */
    async?: boolean
  }> {
    type: MessageType.SCRIPT
  }

  /**
   * 错误消息
   */
  export interface ErrorMessage extends BaseMessage<{
    /** 错误消息 */
    message: string
    /** 错误堆栈 */
    stack?: string
    /** 错误代码 */
    code?: string
  }> {
    type: MessageType.ERROR
  }

  /**
   * 就绪消息
   */
  export interface ReadyMessage extends BaseMessage<{
    /** iframe 版本 */
    version?: string
    /** 支持的特性 */
    features?: string[]
  }> {
    type: MessageType.READY
  }

  /**
   * 动作消息
   */
  export interface ActionMessage extends BaseMessage<{
    /** 动作类型 */
    action: 'click' | 'copy' | 'link' | 'resize' | 'custom'
    /** 动作数据 */
    data?: any
  }> {
    type: MessageType.ACTION
  }

  /**
   * 滚动消息
   */
  export interface ScrollMessage extends BaseMessage<{
    /** 滚动目标 */
    target?: string
    /** 滚动行为 */
    behavior?: 'auto' | 'smooth'
    /** 滚动位置 */
    top?: number
    left?: number
    /** 滚动到底部 */
    toBottom?: boolean
  }> {
    type: MessageType.SCROLL
  }

  /**
   * 配置消息
   */
  export interface ConfigMessage extends BaseMessage<{
    /** 配置键值对 */
    config: Record<string, any>
  }> {
    type: MessageType.CONFIG
  }

  /**
   * 消息联合类型
   */
  export type Message =
    | RenderMessage
    | AppendMessage
    | ClearMessage
    | StyleMessage
    | ScriptMessage
    | ErrorMessage
    | ReadyMessage
    | ActionMessage
    | ScrollMessage
    | ConfigMessage

  /**
   * 消息处理器
   */
  export type MessageHandler<T extends Message = Message> = (message: T) => void | Promise<void>

  /**
   * 消息过滤器
   */
  export type MessageFilter = (message: Message) => boolean
}

export { IframeProtocol }
