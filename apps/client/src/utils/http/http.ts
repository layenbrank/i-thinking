import { cacheInterceptor } from '@/utils/http/cache.ts'
import { ENV_TOKEN } from '@/utils/http/token.ts'
import { urlInterceptor } from '@/utils/http/url.ts'
import {
  HttpClient,
  HttpContext,
  withFetch,
  withInterceptors
} from '@ngify/http'

import { fetch } from '@tauri-apps/plugin-http'

const http = new HttpClient(
  withFetch(
    fetch.bind(null, '', {
      proxy: {
        http: {
          url: import.meta.env.VITE_INTELLIGENCE,
          noProxy: 'tauri.localhost'
        }
      }
    })
  ),
  withInterceptors([urlInterceptor, cacheInterceptor])
)

http.get('', {
  context: new HttpContext().set(ENV_TOKEN, 'thinking')
})

export { http }
