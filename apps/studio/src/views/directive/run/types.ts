/** 运行台的渲染侧类型（由 corex 进度帧格式化而来，纯展示） */

/** 日志行 */
interface RunLog {
  id: number
  time: string
  level: 'info' | 'success' | 'error'
  message: string
}

export type { RunLog }
