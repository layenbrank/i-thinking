export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string }

export function ipcOk<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}

export function ipcFail(code: string, message: string): IpcResult<never> {
  return { ok: false, code, message }
}
