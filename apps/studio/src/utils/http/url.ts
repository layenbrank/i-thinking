import { ENV_TOKEN } from '@/utils/http/token.ts'
import {
  type HttpEvent,
  type HttpHandlerFn,
  type HttpRequest
} from '@ngify/http'
import type { Observable } from 'rxjs'

const REGEXP: Readonly<RegExp> = /^https?:\/\//

const ENVURL: Readonly<Record<EnvURL, string>> = {
  thinking: import.meta.env.VITE_THINKING,
  engine: import.meta.env.VITE_ENGINE,
  intelligence: import.meta.env.VITE_INTELLIGENCE
}

function urlInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  if (REGEXP.test(req.url)) return next(req)
  const ENV = req.context.get(ENV_TOKEN)
  if (ENV) req = req.clone({ url: `${ENVURL[ENV]}${req.url}` })

  return next(req)
}

export { urlInterceptor, ENVURL }
