import { cacheInterceptor } from '@/utils/http/cache.ts'
import { ENV_TOKEN } from '@/utils/http/token.ts'
import { urlInterceptor } from '@/utils/http/url.ts'
import { HttpClient, HttpContext, withFetch, withInterceptors } from '@ngify/http'

export const http = new HttpClient(
	withFetch(),
	withInterceptors([urlInterceptor, cacheInterceptor])
)

http.get('', {
	context: new HttpContext().set(ENV_TOKEN, 'extension')
})
