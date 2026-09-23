/**
 * IPC 错误模型。
 *
 * **决定设计的约束**：Electron 的 `contextBridge` 不保留 Error 的自定义属性 ——
 * 官方文档：「Errors that are thrown are also copied... any custom properties on the
 * Error object will be lost」。preload 与 renderer 是两个 JS realm，所以在 preload
 * 里 `throw` 出来的 `IpcClientError.code` 到渲染侧就丢了。
 *
 * 因此 **code 必须以 message 前缀为载体**（`[CODE] text`）跨桥，渲染侧用
 * `decodeIpcMessage` 还原。渲染侧**禁止**用 `instanceof IpcClientError` 判类型。
 *
 * 分工：
 * - 预期内的业务失败 → 主进程 `throw new IpcError(code, msg)`，wrapper 编码进信封
 * - 编程错误 / 未预期异常 → 让它 reject，归为 `IPC_HANDLER_ERROR`
 */

/** 契约的错误码词汇表：有限联合，调用方可靠穷尽检查 */
export const IPC_ERROR_CODES = [
  // 传输层
  'IPC_UNTRUSTED_SENDER',
  'IPC_INVALID_PAYLOAD',
  'IPC_HANDLER_ERROR',
  'IPC_UNKNOWN',
  // 业务失败
  'CHAT_PROVIDER_NOT_FOUND',
  'CHAT_SESSION_NOT_FOUND',
  'CHAT_MESSAGE_NOT_FOUND',
  'USER_RECORD_NOT_FOUND',
  'MIRROR_NOT_FOUND',
  'MAGNETIC_TILE_NOT_FOUND',
  'WORKSPACE_NOT_FOUND',
  'WORKSPACE_PATH_DUPLICATE',
  'WORKSPACE_PATH_UNAVAILABLE',
  'WORKSPACE_FOLDER_NOT_FOUND',
  'WORKSPACE_FOLDER_REQUIRED',
  'WORKSPACE_PATH_ESCAPE',
  'WORKSPACE_ENTRY_NOT_FOUND',
  'WORKSPACE_FILE_TOO_LARGE',
  'WORKSPACE_GIT_FAILED',
  'WORKSPACE_CHANGE_NOT_FOUND',
  'OVERLAY_UNAVAILABLE',
  'DEVTOOLS_DISABLED',
  'UPDATER_NOT_CONFIGURED',
  'UPDATER_NO_UPDATE_DOWNLOADED',
  'UPDATER_CHECK_FAILED',
  'ASSISTANT_FRAME_UNAVAILABLE',
  'ASSISTANT_KEYSTORE_UNAVAILABLE',
  'DOC_PANDOC_MISSING',
  'DOC_INPUT_NOT_FOUND',
  'DOC_CONVERT_FAILED',
  'DOC_TIMEOUT',
  'SCREENSHOT_ACTION_UNAVAILABLE',
  'SCREENSHOT_NO_FILE',
  'SCREENSHOT_BAD_PAYLOAD',
  'SIDECAR_NOT_READY'
] as const

export type IpcErrorCode = (typeof IPC_ERROR_CODES)[number]

export interface IpcErrorPayload {
  code: IpcErrorCode
  /** 原始错误类名；跨桥后 `instanceof` 不可用，靠它判别 */
  name: string
  message: string
  /** 必须是结构化克隆安全的值 */
  details?: unknown
  /** 仅开发态附带 */
  stack?: string
}

export type IpcEnvelope<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload }

export function envelopeOk<T>(data: T): IpcEnvelope<T> {
  return { ok: true, data }
}

export function envelopeFail(error: IpcErrorPayload): IpcEnvelope<never> {
  return { ok: false, error }
}

/** 主进程 handler 内的「预期业务失败」信号；穿 IPC 前由 wrapper 编码进信封 */
export class IpcError extends Error {
  readonly code: IpcErrorCode
  readonly details?: unknown

  constructor(code: IpcErrorCode, message: string, options: { details?: unknown } = {}) {
    super(message)
    this.name = 'IpcError'
    this.code = code
    this.details = options.details
  }
}

const CODE_PREFIX = /^\[([A-Z][A-Z0-9_]*)\]\s?/

function isKnownCode(value: string): value is IpcErrorCode {
  return (IPC_ERROR_CODES as readonly string[]).includes(value)
}

/** 把 code 编码进 message —— 唯一能跨 contextBridge 的载体 */
export function encodeIpcMessage(code: IpcErrorCode, message: string): string {
  return `[${code}] ${message}`
}

/** 从 message 前缀还原 code；无法识别时退化为 IPC_UNKNOWN */
export function decodeIpcMessage(message: string): { code: IpcErrorCode; message: string } {
  const matched = CODE_PREFIX.exec(message)
  if (!matched) return { code: 'IPC_UNKNOWN', message }
  const raw: string = matched[1]
  return {
    code: isKnownCode(raw) ? raw : 'IPC_UNKNOWN',
    message: message.slice(matched[0].length)
  }
}

/**
 * preload 抛给渲染进程的类型化失败。
 *
 * `code` 在 preload 侧是真实属性，但跨桥后会丢 —— 所以同时编进 message，
 * 渲染侧用 `decodeIpcMessage` 取回。
 */
export class IpcClientError extends Error {
  readonly code: IpcErrorCode
  readonly details?: unknown

  constructor(
    code: IpcErrorCode,
    message: string,
    options: { details?: unknown; stack?: string } = {}
  ) {
    super(encodeIpcMessage(code, message))
    this.name = 'IpcClientError'
    this.code = code
    this.details = options.details
    if (options.stack !== undefined) this.stack = options.stack
  }
}

/** 把任意抛出物归一成信封可用的 payload；`details` 必须结构化克隆安全 */
export function toErrorPayload(error: unknown, options: { isDev?: boolean } = {}): IpcErrorPayload {
  const isDev = options.isDev === true

  if (error instanceof IpcError) {
    return {
      code: error.code,
      name: error.name,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
      ...(isDev && error.stack !== undefined ? { stack: error.stack } : {})
    }
  }

  const name = error instanceof Error ? error.name : 'Error'
  const message = error instanceof Error ? error.message : String(error)

  return {
    code: 'IPC_HANDLER_ERROR',
    name,
    message,
    ...(isDev && error instanceof Error && error.stack !== undefined ? { stack: error.stack } : {})
  }
}

/**
 * zod 校验失败拍平成可克隆结构。
 * **绝不把 `ZodError` 实例塞进 details** —— 它不是结构化克隆安全的。
 */
export function toZodDetails(error: {
  issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; code: string; message: string }>
}): Array<{ path: string; code: string; message: string }> {
  return error.issues.map(function (issue) {
    return {
      path: issue.path.map(String).join('.'),
      code: issue.code,
      message: issue.message
    }
  })
}
