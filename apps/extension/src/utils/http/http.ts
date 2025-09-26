import { cacheInterceptor } from '@/utils/http/cache.ts'
import { ENV_TOKEN } from '@/utils/http/token.ts'
import {
	HttpClient,
	HttpContext,
	withFetch,
	withInterceptors,
	type HttpEvent,
	type HttpHandlerFn,
	type HttpRequest
} from '@ngify/http'
import type { Observable } from 'rxjs'

const ENVURL: Readonly<Record<EnvURL, string>> = {
	engine: import.meta.env.VITE_APP_ENGINE,
	extension: import.meta.env.VITE_APP_EXTENSION
}

const REGEXP: Readonly<RegExp> = /^https?:\/\//

function urlInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
	if (REGEXP.test(req.url)) return next(req)

	const ENV = req.context.get(ENV_TOKEN)
	const url = ENV && ENVURL[ENV] ? `${ENVURL[ENV]}${req.url}` : req.url
	req = req.clone({ url })

	return next(req)
}

export const http = new HttpClient(
	withFetch(),
	withInterceptors([urlInterceptor, cacheInterceptor])
)

http.get('', {
	context: new HttpContext().set(ENV_TOKEN, 'extension')
})
