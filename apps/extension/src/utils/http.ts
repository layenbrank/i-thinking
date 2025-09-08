import type { HttpRequest } from '@ngify/http'
import {
	HttpClient,
	HttpContextToken,
	HttpResponse,
	withFetch,
	withInterceptors,
	type HttpEvent,
	type HttpHandlerFn
} from '@ngify/http'
import type { Observable } from 'rxjs'
import { of, tap } from 'rxjs'

/** 缓存条目 */
export interface CacheEntry {
	/** 请求的响应 */
	response: HttpResponse<unknown>
	/** 缓存有效期 */
	expire: number
}

/** 缓存令牌，值为缓存时间，单位毫秒，默认为零，不缓存 */
export const HTTP_CACHE_TOKEN = new HttpContextToken(() => 0)

/**
 * 判断请求是否可缓存
 * 一般只有 GET 请求才需要缓存
 * @param request
 */
export function isCachable(request: HttpRequest<unknown>): boolean {
	return request.context.has(HTTP_CACHE_TOKEN)
}

export class CacheService {
	private readonly cacheMap = new Map<string, CacheEntry>()

	/**
	 * 获取缓存
	 * @param request
	 */
	get(request: HttpRequest<unknown>): HttpResponse<unknown> | null {
		// 判断当前请求是否已被缓存，若未缓存则返回null
		const entry = this.cacheMap.get(request.urlWithParams)

		if (!entry) return null

		// 若缓存命中，则判断缓存是否过期；若已过期则返回 null，否则返回请求对应的响应对象
		return Date.now() > entry.expire ? null : entry.response
	}

	/**
	 * 缓存
	 * @param request
	 * @param response
	 */
	put(request: HttpRequest<unknown>, response: HttpResponse<unknown>): void {
		const entry: CacheEntry = {
			response: response,
			expire: Date.now() + request.context.get(HTTP_CACHE_TOKEN)
		}

		// 这里我们将请求的带参数 URL 作为缓存的 KEY，你也可以改成其他的
		this.cacheMap.set(request.urlWithParams, entry)
	}

	/** 清扫过期缓存 */
	clear() {
		this.cacheMap.forEach((entry, key) => {
			if (Date.now() > entry.expire) this.cacheMap.delete(key)
		})
	}

	/**
	 * 通过标记（字符串、正则）模糊查询以撤销缓存
	 * @param mark
	 * @param once 只撤销一个
	 */
	revoke(mark: string | RegExp, once?: boolean) {
		for (const key of this.cacheMap.keys()) {
			if (mark instanceof RegExp ? mark.test(key) : key.includes(mark)) {
				this.cacheMap.delete(key)
				if (once) return
			}
		}
	}

	/** 撤销所有缓存 */
	revokeAll() {
		this.cacheMap.clear()
	}
}

export const cacheService = new CacheService() // 实例化并导出去

// 缓存数拦截器
export function cacheInterceptor(
	request: HttpRequest<unknown>,
	next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
	// 如果当前请求不可缓存，则将它传递到下一个 HTTP 处理器
	if (!isCachable(request)) return next(request)

	// 缓存命中则直接返回缓存的请求响应
	const response = cacheService.get(request)
	if (response) return of(response)

	// 发送请求，成功后缓存
	return next(request).pipe(
		tap((event) => {
			cacheService.clear() // 顺便清理一下过期缓存
			event instanceof HttpResponse && cacheService.put(request, event)
		})
	)
}

// 创建不同环境的HTTP客户端
function httpClient(baseUrl: string) {
	// 创建拦截器来处理baseURL
	function urlInterceptor(req: HttpRequest<any>, next: HttpHandlerFn) {
		// 如果请求URL不是完整的URL（不包含http或https），则添加baseURL
		if (!req.url.startsWith('http')) {
			const fullUrl = baseUrl + req.url
			const newReq = req.clone({ url: fullUrl })
			return next(newReq)
		}
		return next(req)
	}

	// 创建HTTP客户端实例，使用fetch作为后端，并添加拦截器
	return new HttpClient(withFetch(), withInterceptors([urlInterceptor, cacheInterceptor]))
}

// 创建不同环境的HTTP客户端实例
// export const apiClient = createHttpClient('http://172.20.10.4:3000/api')
// export const consoleClient = createHttpClient('http://172.20.10.4:3000')
// export const authClient = createHttpClient('http://172.20.10.4:3000/auth')

export const http = httpClient(import.meta.env.VITE_APP_EXT_URL)
export const bingHttp = httpClient('/bing')
export const baiduHttp = httpClient('/baidu')

// 使用示例
// consoleClient.get('/users').subscribe((res) => {
//   console.log('res', res)
// })
