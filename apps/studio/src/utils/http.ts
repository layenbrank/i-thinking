import { ofetch, type FetchOptions } from 'ofetch'

import { TIMEOUT_MS } from '@/utils/http.errors'
import { findAuthToken } from './auth'

type HttpOptions = Omit<FetchOptions<'json'>, 'method' | 'body'>
type HttpBody = FetchOptions['body']

const fetcher = ofetch.create({
  baseURL: import.meta.env.VITE_THINKING,
  timeout: TIMEOUT_MS,
  onRequest({ request, options }) {
    const token = findAuthToken()
    if (!token || !isThinkingUrl(findRequestUrl(request))) return
    options.headers.set('Authorization', `Bearer ${token}`)
  }
})

function findRequestUrl(request: RequestInfo) {
  if (typeof request === 'string') return request
  if (request instanceof URL) return request.toString()
  return request.url
}

/** 相对路径走自家接口；绝对地址只有落在 VITE_THINKING 上才带登录令牌。 */
function isThinkingUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return true
  const base = import.meta.env.VITE_THINKING
  if (!base) return false
  return url.startsWith(base)
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
