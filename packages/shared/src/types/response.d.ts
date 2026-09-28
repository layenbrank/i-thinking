interface RSF<F> {
  /**
   * @description 响应状态码
   */
  code: number
  /**
   * @description 响应是否成功
   */
  success: boolean
  /**
   * @description 响应消息
   */
  msg: string
  /**
   * @description 响应数据
   */
  data: F
  /**
   * @description 响应时间戳
   */
  timestamp: number
  /**
   * @description 链路追踪 ID（服务端 `traceparent` 的 trace-id，无链路上下文时省略）
   */
  traceID?: string
}

interface RSP<P> extends RSF<P> {
  /**
   * @description 总条数
   */
  total: number
}
