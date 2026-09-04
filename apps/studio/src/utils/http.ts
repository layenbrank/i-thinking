import ky, { type KyInstance } from 'ky'
import { findAuthToken } from './auth'
import { TIMEOUT_MS } from '@/utils/http.errors'

function HttpClient(): KyInstance {
  return ky.create({
    prefix: import.meta.env.VITE_THINKING,
    timeout: TIMEOUT_MS,
    retry: {
      limit: 3,
      methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504]
    },
    hooks: {
      init: [],
      beforeRequest: [
        function injectAuth(state) {
          const token = findAuthToken()
          if (token) {
            state.request.headers.set('Authorization', `Bearer ${token}`)
          }
        }
      ],
      afterResponse: [],
      beforeError: [],
      beforeRetry: []
    }
  })
}

export const http = HttpClient()
