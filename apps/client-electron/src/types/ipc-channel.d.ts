/**
 * IPC通道名称常量
 * 采用"模块:操作"的命名规范
 * @field file:monitor 文件监控
 * @field file:change 文件变化
 * @field file:list 文件列表
 * @field app:info 应用信息
 * @field app:quit 应用退出
 * @field window:minimize 窗口最小化
 * @field window:maximize 窗口最大化
 * @field window:close 窗口关闭
 * @field system:info 系统信息
 */
export type IPCChannel =
  | 'file:monitor'
  | 'monitor-changes'
  | 'file:change'
  | 'file:list'
  | 'app:info'
  | 'app:quit'
  | 'window:minimize'
  | 'window:maximize'
  | 'window:close'
  | 'system:info'
  | 'main-process-message'
