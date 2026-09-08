import { ofetch, type FetchOptions } from 'ofetch'

import { TIMEOUT_MS } from '@/utils/http.errors'
import { findAuthToken } from './auth'

type HttpOptions = Omit<FetchOptions<'json'>, 'method' | 'body'>
type HttpBody = FetchOptions['body']

const fetcher = ofetch.create({
  baseURL: import.meta.env.VITE_THINKING,
  timeout: TIMEOUT_MS,
  onRequest({ options }) {
    const token = findAuthToken()
    if (token) options.headers.set('Authorization', `Bearer ${token}`)
  }
})

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
