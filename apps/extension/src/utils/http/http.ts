import { ofetch, type FetchOptions } from 'ofetch'

import { ENV_URLS } from './env.ts'

declare module 'ofetch' {
  interface FetchOptions {
    /** 目标环境，用于从 ENV_URLS 选择 baseURL */
    env?: EnvURL
  }
}

type HttpOptions = Omit<FetchOptions, 'method' | 'body'>

const fetcher = ofetch.create({
  onRequest({ options }) {
    if (options.env) {
      options.baseURL = ENV_URLS[options.env]
      delete options.env
    }
  }
})

export const http = {
  get<T>(url: string, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'GET' })
  },
  post<T>(url: string, body?: unknown, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'POST', body })
  },
  put<T>(url: string, body?: unknown, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'PUT', body })
  },
  patch<T>(url: string, body?: unknown, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'PATCH', body })
  },
  delete<T>(url: string, options?: HttpOptions) {
    return fetcher<T>(url, { ...options, method: 'DELETE' })
  }
}
