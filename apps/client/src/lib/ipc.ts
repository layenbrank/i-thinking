/**
 * corex-serve IPC 客户端封装（对齐 serve/protocol Response）
 */
import { invoke } from '@tauri-apps/api/core'

export interface IpcResponse {
  id: number
  ok: boolean
  path?: string
  data?: unknown
  ms: number
  error?: string
}

export async function ipcInvoke(module: string, args: unknown): Promise<IpcResponse> {
  return invoke<IpcResponse>('ipc_invoke', { module, args })
}

export function parseData<T>(resp: IpcResponse): T {
  if (!resp.ok) {
    throw new Error(resp.error ?? `IPC ${resp.id} failed`)
  }
  if (resp.data === undefined || resp.data === null) {
    throw new Error('IPC 响应缺少 data')
  }
  return resp.data as T
}

export function parsePath(resp: IpcResponse): string {
  if (!resp.ok) {
    throw new Error(resp.error ?? `IPC ${resp.id} failed`)
  }
  if (!resp.path) {
    throw new Error('IPC 响应缺少 path')
  }
  return resp.path
}
