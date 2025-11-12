import { ENV_TOKEN } from '@/utils/http/token.ts'
import { type HttpEvent, type HttpHandlerFn, type HttpRequest } from '@ngify/http'
import type { Observable } from 'rxjs'

const REGEXP: Readonly<RegExp> = /^https?:\/\//

const ENVURL: Readonly<Record<EnvURL, string>> = {
	corex: import.meta.env.VITE_COREX,
	engine: import.meta.env.VITE_ENGINE,
	intelligence: import.meta.env.VITE_INTELLIGENCE
}

export function urlInterceptor(
	req: HttpRequest<unknown>,
	next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
	if (REGEXP.test(req.url)) return next(req)

	const ENV = req.context.get(ENV_TOKEN)
	const url = ENV && ENVURL[ENV] ? `${ENVURL[ENV]}${req.url}` : req.url
	req = req.clone({ url })

	return next(req)
}
