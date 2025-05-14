/**
 * IPC请求状态类型
 * @field success 成功
 * @field error 错误
 * @field pending 处理中
 */
type IPCStatus = 'success' | 'error' | 'pending'

/**
 * IPC响应基础接口
 */
export interface IPCResponse<T = any> {
  status: IPCStatus
  data?: T
  error?: string
  timestamp: number
}

/**
 * 文件变化信息
 * @field path 文件路径
 * @field event 事件类型
 * @field timestamp 时间戳
 */
export interface FileChangeInfo {
  path: string
  event: 'add' | 'change' | 'unlink'
  timestamp: number
}

/**
 * 文件变化响应
 */
export type FileChangeResponse = IPCResponse<FileChangeInfo>
