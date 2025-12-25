/**
 * 分布式插件架构类型定义
 */
declare namespace DistributedPlugin {
  /**
   * 运行时上下文
   */
  export enum RuntimeContext {
    /** 主线程 */
    MAIN = 'MAIN',
    /** Worker 线程 */
    WORKER = 'WORKER',
    /** iframe 沙箱 */
    IFRAME = 'IFRAME'
  }

  /**
   * 可序列化消息
   */
  export interface SerializableMessage {
    type: string
    payload: any
    transfer?: Transferable[]
  }

  /**
   * 传输协议
   */
  export interface TransferProtocol {
    /** 协议版本 */
    version: string
    /** 序列化格式 */
    format: 'json' | 'binary' | 'structured-clone'
    /** 压缩算法 */
    compression?: 'gzip' | 'brotli' | 'none'
  }

  /**
   * 代理对象
   */
  export type ProxyObject<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? (...args: A) => Promise<R>
      : Promise<T[K]>
  }

  /**
   * 远程引用
   */
  export interface RemoteReference<T = any> {
    /** 引用ID */
    id: string
    /** 上下文 */
    context: RuntimeContext
    /** 类型 */
    type: string
    /** 代理对象 */
    proxy: ProxyObject<T>
  }

  /**
   * 可传输对象
   */
  export type Transferable = ArrayBuffer | MessagePort | ImageBitmap | OffscreenCanvas

  /**
   * 跨上下文桥接接口
   */
  export interface CrossContextBridge {
    /**
     * 发送消息
     */
    postMessage: (message: SerializableMessage) => void

    /**
     * 监听消息
     */
    onMessage: (handler: (message: SerializableMessage) => void) => () => void

    /**
     * RPC 调用
     */
    invoke: <T = any>(method: string, ...args: any[]) => Promise<T>

    /**
     * 创建远程代理
     */
    createProxy: <T = any>(target: string) => ProxyObject<T>

    /**
     * 销毁桥接
     */
    dispose: () => void
  }
}

export { DistributedPlugin }
