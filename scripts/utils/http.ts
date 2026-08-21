import ky, { type KyInstance } from 'ky'
import { authToken } from '@/utils/auth.ts'
import { loadEnv } from '@/utils/env.ts'
import { TIMEOUT_MS } from '@/utils/http.errors.ts'

loadEnv()

const HOST = process.env.HOST ?? '127.0.0.1'
const PORT = process.env.PORT ?? '3000'
const BASE_URL = `http://${HOST}:${PORT}`

function HttpClient(): KyInstance {
  return ky.create({
    prefix: BASE_URL,
    timeout: TIMEOUT_MS,
    retry: {
      limit: 3,
      methods: ['get', 'put', 'head', 'delete', 'options', 'trace'],
      statusCodes: [408, 413, 429, 500, 502, 503, 504]
    },
    hooks: {
      beforeRequest: [
        function injectAuth({ request }) {
          const token = authToken.toRead()
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`)
          }
        }
      ]
    }
  })
}

const http = HttpClient()

export { BASE_URL, http }
