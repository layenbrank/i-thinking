import { HttpContext, HttpContextToken } from '@ngify/http'

/** 缓存令牌，值为缓存时间，单位毫秒，默认为零，不缓存 */
export const CACHE_TOKEN = new HttpContextToken(() => 0)

export const ENV_TOKEN = new HttpContextToken<EnvURL | undefined>(() => undefined)

export const COREX_TOKEN = new HttpContext().set(ENV_TOKEN, 'corex')

export const ENGINE_TOKEN = new HttpContext().set(ENV_TOKEN, 'engine')

export const INTELLIGENCE_TOKEN = new HttpContext().set(ENV_TOKEN, 'intelligence')
