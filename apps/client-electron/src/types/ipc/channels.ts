/**
 * IPC通道名称常量
 * 采用"模块:操作"的命名规范
 */
export enum IpcChannels {
  // 文件监控相关
  FILE_MONITOR = 'file:monitor',
  FILE_CHANGE = 'file:change',
  FILE_LIST = 'file:list',

  // 应用相关
  APP_INFO = 'app:info',
  APP_QUIT = 'app:quit',

  // 窗口相关
  WINDOW_MINIMIZE = 'window:minimize',
  WINDOW_MAXIMIZE = 'window:maximize',
  WINDOW_CLOSE = 'window:close',

  // 系统相关
  SYSTEM_INFO = 'system:info'
}

/**
 * IPC请求状态枚举
 */
export enum IpcStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending'
}
