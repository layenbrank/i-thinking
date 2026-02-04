import {
  HttpClient,
  HttpContext,
  withFetch,
  withInterceptors
} from '@ngify/http'

import { cacheInterceptor } from '@/utils/http/cache.ts'
import { ENV_TOKEN } from '@/utils/http/token.ts'
import { urlInterceptor } from '@/utils/http/url.ts'

const http = new HttpClient(
  withFetch(fetch),
  withInterceptors([urlInterceptor, cacheInterceptor])
)

http.get('', {
  context: new HttpContext().set(ENV_TOKEN, 'thinking')
})

export { http }
