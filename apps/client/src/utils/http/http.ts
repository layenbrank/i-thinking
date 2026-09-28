import { fetch } from '@tauri-apps/plugin-http'
import { ofetch, type FetchOptions } from 'ofetch'

import { findAuthToken } from '@/utils/auth'
import { ENV_URLS } from './env.ts'
import { createTraceparent, TRACEPARENT_HEADER } from './trace.ts'

declare module 'ofetch' {
  interface FetchOptions {
    /** 目标环境，用于从 ENV_URLS 选择 baseURL */
    env?: EnvURL
  }
}

type HttpOptions = Omit<FetchOptions<'json'>, 'method' | 'body'>
type HttpBody = FetchOptions['body']

const fetcher = ofetch.create(
  {
    onRequest({ request, options }) {
      // 自家接口带上链路：服务端据此把入口日志、下游调用与响应回显串成同一条链路
      const url = findRequestUrl(request)
      if (isOwnUrl(url) && !options.headers.has(TRACEPARENT_HEADER)) {
        options.headers.set(TRACEPARENT_HEADER, createTraceparent())
      }

      if (options.env) {
        options.baseURL = ENV_URLS[options.env]
        delete options.env
      }
      const token = findAuthToken()
      if (token) options.headers.set('Authorization', `Bearer ${token}`)
    }
  },
  { fetch }
)

/** 相对路径走自家服务（`baseURL` 由 `options.env` 挑）；绝对地址只有落在 `ENV_URLS` 上才算自家。 */
function isOwnUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return true
  return Object.values(ENV_URLS).some((base) => base && url.startsWith(base))
}

function findRequestUrl(request: RequestInfo | URL) {
  if (typeof request === 'string') return request
  if (request instanceof URL) return request.toString()
  return request.url
}

export const http = {
  get<T>(url: string, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'GET' })
  },
  post<T>(url: string, body?: HttpBody, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'POST', body })
  },
  put<T>(url: string, body?: HttpBody, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'PUT', body })
  },
  patch<T>(url: string, body?: HttpBody, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'PATCH', body })
  },
  delete<T>(url: string, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'DELETE' })
  }
}
