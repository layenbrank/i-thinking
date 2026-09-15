import { decodeIpcMessage } from '@/shared/ipc/error'
import type { IpcErrorCode } from '@/shared/ipc/error'

/** 归一化后的 IPC 失败 */
export interface IpcFailure {
  code: IpcErrorCode
  message: string
}

/**
 * 把任意错误归一为 `{ code, message }`。
 *
 * **code 必须从 message 前缀还原**：preload 与渲染进程是两个 JS realm，
 * `contextBridge` 会丢弃 Error 的自定义属性 —— 也就是说 preload 里
 * `IpcClientError.code` 到这边是 `undefined`，message 前缀才是权威来源。
 */
export function toIpcFailure(error: unknown): IpcFailure {
  const raw = error instanceof Error ? error.message : String(error)
  return decodeIpcMessage(raw)
}

/**
 * 展示给用户的文案：剥掉 `[CODE] ` 前缀，不把错误码暴露给用户。
 * `fallback` 用于消息为空的情况。
 */
export function toIpcMessage(error: unknown, fallback: string): string {
  return toIpcFailure(error).message || fallback
}
