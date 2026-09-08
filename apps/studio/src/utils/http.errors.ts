import { FetchError } from 'ofetch'

export const SUCCESS_CODE: number = 200
export const TIMEOUT_MS: number = 30_000

export class HttpException extends Error {
  readonly code: number
  readonly status?: number
  readonly data?: unknown

  constructor(
    message: string,
    code: number,
    options: {
      status?: number
      data?: unknown
    } = {}
  ) {
    super(message)
    this.name = 'HttpException'
    this.code = code
    this.status = options.status
    this.data = options.data
  }
}

/** 解析 `{ code, data, msg }` 信封响应，非成功码抛 HttpException */
export function HttpEnvelope<T>(envelope: RSF<T>): T {
  if (envelope.code !== SUCCESS_CODE) {
    throw new HttpException(envelope.msg || '业务请求失败', envelope.code, {
      data: envelope.data
    })
  }
  return envelope.data
}

/** 归一化 ofetch 抛出的错误为 HttpException */
export function HttpError(error: unknown): HttpException {
  if (error instanceof HttpException) return error

  if (error instanceof FetchError) {
    const status = error.response?.status ?? 0
    const data = error.data as RSF<unknown> | undefined
    if (data && typeof data.code === 'number' && data.code !== SUCCESS_CODE) {
      return new HttpException(data.msg || '业务请求失败', data.code, {
        status,
        data: data.data
      })
    }
    return new HttpException(error.message || '网络请求失败', -1, { status })
  }

  return new HttpException(
    error instanceof Error ? error.message : '网络请求失败',
    -1
  )
}
