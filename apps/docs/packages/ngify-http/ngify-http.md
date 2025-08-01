# @ngify/http 使用文档

`@ngify/http` 是一个基于 RxJS 的响应式 HTTP 客户端，提供了类似于 Angular HttpClient 的 API，但可以在任何 JavaScript/TypeScript 项目中使用。它提供了强大的请求/响应处理能力，支持拦截器、请求缓存、多 baseURL 等功能。

## 目录

- [安装](#安装)
- [基本用法](#基本用法)
- [请求方法](#请求方法)
- [请求配置](#请求配置)
- [响应处理](#响应处理)
- [拦截器](#拦截器)
- [请求缓存](#请求缓存)
- [多 baseURL 支持](#多-baseurl-支持)
- [高级用法](#高级用法)
  - [请求取消](#请求取消)
  - [竞速请求](#竞速请求)
  - [请求重试](#请求重试)
  - [并行请求](#并行请求)
  - [并行请求（并发限制）](#并行请求并发限制)
  - [串行请求](#串行请求)
  - [串行请求（批量）](#串行请求批量)
  - [错误处理](#错误处理)
- [常见场景示例](#常见场景示例)
- [完整示例](#完整示例)
- [参考资料](#参考资料)

## 安装

```bash
# npm
npm install @ngify/http rxjs

# yarn
yarn add @ngify/http rxjs

# pnpm
pnpm add @ngify/http rxjs
```

## 基本用法

### 创建 HTTP 客户端

```typescript
import { HttpClient, withFetch } from '@ngify/http'

// 创建 HTTP 客户端实例，使用 fetch 作为后端
const http = new HttpClient(withFetch())

// 发起 GET 请求
http.get('https://api.example.com/users').subscribe({
	next: (data) => console.log('请求成功:', data),
	error: (error) => console.error('请求失败:', error)
})
```

## 请求方法

`HttpClient` 提供了常用的 HTTP 方法：

```typescript
// GET 请求
http.get<User[]>('/users')

// POST 请求
http.post<User>('/users', { name: '张三', age: 25 })

// PUT 请求
http.put<User>('/users/1', { name: '李四', age: 30 })

// DELETE 请求
http.delete('/users/1')

// PATCH 请求
http.patch<User>('/users/1', { name: '王五' })

// HEAD 请求
http.head('/users')

// OPTIONS 请求
http.options('/users')

// 通用请求方法
http.request(new HttpRequest('GET', '/users'))
```

## 请求配置

### 请求参数

```typescript
// 添加查询参数
http.get('/users', {
	params: { page: 1, size: 10 }
})

// 或者使用 HttpParams
import { HttpParams } from '@ngify/http'

const params = new HttpParams().set('page', '1').set('size', '10')

http.get('/users', { params })
```

### 请求头

```typescript
// 添加请求头
http.get('/users', {
	headers: { 'Content-Type': 'application/json' }
})

// 或者使用 HttpHeaders
import { HttpHeaders } from '@ngify/http'

const headers = new HttpHeaders()
	.set('Content-Type', 'application/json')
	.set('Authorization', 'Bearer token')

http.get('/users', { headers })
```

### 响应类型

```typescript
// 指定响应类型
http.get('/users', { responseType: 'json' }) // 默认
http.get('/document', { responseType: 'text' })
http.get('/image', { responseType: 'blob' })
http.get('/file', { responseType: 'arraybuffer' })
```

### 观察类型

```typescript
// 只关注响应体
http.get('/users', { observe: 'body' }) // 默认

// 关注完整响应
http.get('/users', { observe: 'response' }).subscribe((response) => {
	console.log('状态码:', response.status)
	console.log('响应头:', response.headers)
	console.log('响应体:', response.body)
})

// 关注所有事件
http.get('/users', { observe: 'events' }).subscribe((event) => {
	// 处理不同类型的事件
})
```

## 响应处理

### 使用 RxJS 操作符

```typescript
import { catchError, retry, timeout } from 'rxjs/operators'
import { throwError } from 'rxjs'

http
	.get('/users')
	.pipe(
		// 超时处理
		timeout(5000),
		// 重试
		retry(3),
		// 错误处理
		catchError((error) => {
			console.error('请求失败:', error)
			return throwError(() => new Error('请求失败，请稍后再试'))
		})
	)
	.subscribe((data) => console.log('数据:', data))
```

## 拦截器

拦截器可以拦截和修改 HTTP 请求和响应，类似于中间件。

### 创建拦截器

```typescript
import { HttpRequest, HttpHandlerFn, withInterceptors } from '@ngify/http'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

// 创建日志拦截器
const logInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => {
	console.log(`[请求] ${req.method} ${req.url}`)

	return next(req).pipe(
		tap((event) => {
			if (event instanceof HttpResponse) {
				console.log(`[响应] ${req.method} ${req.url}`, event.status)
			}
		})
	)
}

// 创建认证拦截器
const authInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => {
	// 添加认证头
	const authReq = req.clone({
		headers: req.headers.set('Authorization', 'Bearer token')
	})

	return next(authReq)
}

// 使用拦截器
const http = new HttpClient(withFetch(), withInterceptors([logInterceptor, authInterceptor]))
```

## 请求缓存

可以使用上下文令牌和拦截器实现请求缓存。

### 实现缓存功能

```typescript
import { HttpContextToken, HttpContext } from '@ngify/http'
import { of } from 'rxjs'
import { tap } from 'rxjs/operators'

// 创建缓存令牌
const HTTP_CACHE_TOKEN = new HttpContextToken(() => 0)

// 缓存服务
class CacheService {
	private cache = new Map<string, { response: HttpResponse<unknown>; expire: number }>()

	get(request: HttpRequest<unknown>): HttpResponse<unknown> | null {
		const entry = this.cache.get(request.urlWithParams)
		if (!entry) return null

		return Date.now() > entry.expire ? null : entry.response
	}

	put(request: HttpRequest<unknown>, response: HttpResponse<unknown>): void {
		const expire = Date.now() + request.context.get(HTTP_CACHE_TOKEN)
		this.cache.set(request.urlWithParams, { response, expire })
	}

	clear() {
		this.cache.forEach((entry, key) => {
			if (Date.now() > entry.expire) {
				this.cache.delete(key)
			}
		})
	}
}

const cacheService = new CacheService()

// 缓存拦截器
const cacheInterceptor = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
	// 只缓存带有缓存令牌的请求
	if (!request.context.has(HTTP_CACHE_TOKEN)) {
		return next(request)
	}

	// 检查缓存
	const cachedResponse = cacheService.get(request)
	if (cachedResponse) {
		return of(cachedResponse)
	}

	// 发送请求并缓存响应
	return next(request).pipe(
		tap((event) => {
			cacheService.put(request, event)
		})
	)
}

// 使用缓存
http
	.get('/users', {
		context: new HttpContext().set(HTTP_CACHE_TOKEN, 60000) // 缓存 1 分钟
	})
	.subscribe((data) => console.log(data))
```

## 多 baseURL 支持

可以创建多个 HTTP 客户端实例，每个实例使用不同的 baseURL。

### 实现多 baseURL

```typescript
// 创建带有 baseURL 的 HTTP 客户端工厂
const createHttpClient = (baseUrl: string) => {
	// 创建 baseURL 拦截器
	const baseUrlInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => {
		// 如果请求 URL 不是完整的 URL，则添加 baseURL
		if (!req.url.startsWith('http')) {
			const fullUrl = baseUrl + req.url
			const newReq = req.clone({ url: fullUrl })
			return next(newReq)
		}
		return next(req)
	}

	// 创建 HTTP 客户端实例
	return new HttpClient(withFetch(), withInterceptors([baseUrlInterceptor]))
}

// 创建不同环境的 HTTP 客户端实例
const apiClient = createHttpClient('https://api.example.com')
const authClient = createHttpClient('https://auth.example.com')
const mediaClient = createHttpClient('https://media.example.com')

// 使用不同的客户端
apiClient.get('/users').subscribe((users) => console.log('用户列表:', users))
authClient
	.post('/login', { username: 'admin', password: '123456' })
	.subscribe((token) => console.log('认证令牌:', token))
mediaClient.get('/images').subscribe((images) => console.log('图片列表:', images))
```

## 高级用法

### 请求取消

```typescript
import { takeUntil } from 'rxjs/operators'
import { Subject } from 'rxjs'

// 创建取消信号
const cancelSignal = new Subject<void>()

// 发起请求
http
	.get('/users')
	.pipe(takeUntil(cancelSignal))
	.subscribe({
		next: (data) => console.log('数据:', data),
		error: (error) => console.error('错误:', error),
		complete: () => console.log('请求完成')
	})

// 取消请求
setTimeout(() => {
	console.log('取消请求')
	cancelSignal.next()
	cancelSignal.complete()
}, 1000)
```

### 竞速请求

有时候我们可能会需要并行发出多个请求，并且当其中任意一个请求首先响应成功的时候执行一些操作，也就是我们只想要拿到第一个响应成功的请求的响应结果，这时候可以使用 `race()` 函数：

```typescript
import { race } from 'rxjs'

// 创建多个请求
const requests = [http.get('url1'), http.get('url2'), http.get('url3')]

// 竞速请求，只取第一个响应成功的结果
race(requests).subscribe({
	next: (data) => console.log('第一个响应成功的数据:', data),
	error: (error) => console.error('错误:', error),
	complete: () => console.log('请求完成')
})
```

这种方式特别适用于以下场景：

- 同时请求多个数据源，只需要最快返回的结果
- 实现请求超时逻辑，将超时视为一个竞争请求
- 在多个服务器之间选择响应最快的一个

例如，我们可以结合超时逻辑：

```typescript
import { race, timer } from 'rxjs'
import { map, mapTo } from 'rxjs/operators'

// 创建请求
const request = http.get('/api/data')

// 创建5秒超时
const timeout$ = timer(5000).pipe(mapTo(new Error('请求超时')))

// 竞速请求与超时
race(
	request,
	timeout$.pipe(
		map((error) => {
			throw error
		})
	)
).subscribe({
	next: (data) => console.log('请求成功:', data),
	error: (error) => console.error('请求失败:', error)
})
```

### 请求重试

```typescript
import { retry, delay, take, concatMap } from 'rxjs/operators'
import { throwError, timer } from 'rxjs'

// 简单重试
http
	.get('/users')
	.pipe(retry(3))
	.subscribe((data) => console.log(data))

// 高级重试策略（使用新的 retry 配置）
http
	.get('/users')
	.pipe(
		retry({
			count: 3,
			delay: (error, retryCount) => {
				// 指数退避策略
				const delay = Math.pow(2, retryCount) * 1000
				console.log(`重试第 ${retryCount} 次，延迟 ${delay}ms`)
				return timer(delay)
			},
			// 成功后是否重置计数器
			resetOnSuccess: true
		}),
		catchError((error) => {
			console.error('重试后仍然失败:', error)
			return throwError(() => new Error('请求失败，请稍后再试'))
		})
	)
	.subscribe((data) => console.log(data))
```

### 并行请求

```typescript
import { forkJoin } from 'rxjs'

// 并行发起多个请求
forkJoin({
	users: http.get('/users'),
	products: http.get('/products'),
	orders: http.get('/orders')
}).subscribe((results) => {
	console.log('用户:', results.users)
	console.log('产品:', results.products)
	console.log('订单:', results.orders)
})
```

### 并行请求（并发限制）

当我们运行上面的例子时，所有请求都会同时发起。如果请求量很大，我们可能需要添加并发限制，这时可以使用 `from()` 函数和 `mergeAll()` 管道操作符：

```typescript
import { from, mergeAll } from 'rxjs'

// 请求列表
const requests = [
	http.get('url1'),
	http.get('url2'),
	http.get('url3'),
	http.get('url4'),
	http.get('url5')
]

// 限制在某一时刻下最多只能有2个请求同时执行
const concurrent = 2 // 并发数
from(requests)
	.pipe(mergeAll(concurrent))
	.subscribe({
		next: (data) => console.log('数据:', data),
		error: (error) => console.error('错误:', error),
		complete: () => console.log('所有请求完成')
	})
```

也可以使用 `mergeMap` 操作符来实现类似功能：

```typescript
import { from, mergeMap } from 'rxjs'

// 假设有多个ID需要请求详情
const ids = [1, 2, 3, 4, 5]

// 并发请求，最多同时2个
from(ids)
	.pipe(
		mergeMap(
			(id) => http.get(`/api/items/${id}`),
			2 // 最大并发数
		)
	)
	.subscribe({
		next: (item) => console.log('获取到项目:', item),
		complete: () => console.log('所有请求完成')
	})
```

### 串行请求

有时候我们在执行多个请求的时候，后一个请求要依赖前一个请求的响应结果或者要严格控制请求的顺序，这时候可以使用 `switchMap()` 管道操作符：

```typescript
import { switchMap } from 'rxjs/operators'

http
	.get('url1')
	.pipe(
		switchMap((response1) => {
			// 使用第一个请求的响应结果
			console.log('第一个请求的响应:', response1)
			// 发起第二个请求
			return http.get(`url2?param=${response1.id}`)
		}),
		switchMap((response2) => {
			// 使用第二个请求的响应结果
			console.log('第二个请求的响应:', response2)
			// 发起第三个请求
			return http.get(`url3?param=${response2.id}`)
		})
	)
	.subscribe({
		next: (finalResponse) => console.log('最终响应:', finalResponse),
		error: (error) => console.error('请求链中的错误:', error),
		complete: () => console.log('请求链完成')
	})
```

### 串行请求（批量）

如果我们存在大量的串行请求，且后一个请求不依赖前一个请求的响应结果，只需要控制请求顺序，这时候可以使用 `from()` 函数和 `concatAll()` 管道操作符：

```typescript
import { from, concatAll } from 'rxjs'

// 请求列表
const requests = [
	http.get('url1'),
	http.get('url2'),
	http.get('url3'),
	http.get('url4'),
	http.get('url5')
]

// 按顺序依次执行请求
from(requests)
	.pipe(concatAll())
	.subscribe({
		next: (data) => console.log('数据:', data),
		error: (error) => console.error('错误:', error),
		complete: () => console.log('所有请求完成')
	})
```

也可以使用 `concatMap` 操作符：

```typescript
import { from, concatMap } from 'rxjs'

// 假设有多个ID需要按顺序请求详情
const ids = [1, 2, 3, 4, 5]

// 串行请求，一个完成后再执行下一个
from(ids)
	.pipe(concatMap((id) => http.get(`/api/items/${id}`)))
	.subscribe({
		next: (item) => console.log('获取到项目:', item),
		complete: () => console.log('所有请求完成')
	})
```

### 错误处理

```typescript
import { catchError } from 'rxjs/operators'
import { throwError, of } from 'rxjs'

http
	.get('/users')
	.pipe(
		catchError((error) => {
			if (error.status === 404) {
				console.log('资源不存在')
				return of([]) // 返回空数组
			}
			if (error.status === 401) {
				console.log('未授权，请登录')
				// 重定向到登录页
			}
			return throwError(() => new Error('请求失败，请稍后再试'))
		})
	)
	.subscribe((data) => console.log(data))
```

## 常见场景示例

### 文件上传

```typescript
import { HttpEventType } from '@ngify/http'
import { filter } from 'rxjs/operators'

// 创建 FormData
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('name', 'example.jpg')

// 上传文件并监听进度
http
	.post('/upload', formData, {
		reportProgress: true, // 启用进度报告
		observe: 'events' // 观察所有事件
	})
	.subscribe((event) => {
		if (event.type === HttpEventType.UploadProgress && event.total) {
			// 计算上传进度
			const progress = Math.round((100 * event.loaded) / event.total)
			console.log(`上传进度: ${progress}%`)
		} else if (event.type === HttpEventType.Response) {
			console.log('上传完成:', event.body)
		}
	})
```

### 下载文件并监听进度

```typescript
import { HttpEventType } from '@ngify/http'

http
	.get('/download/large-file', {
		responseType: 'blob',
		reportProgress: true,
		observe: 'events'
	})
	.subscribe((event) => {
		if (event.type === HttpEventType.DownloadProgress) {
			// 计算下载进度
			if (event.total) {
				const progress = Math.round((100 * event.loaded) / event.total)
				console.log(`下载进度: ${progress}%`)
			} else {
				console.log(`已下载 ${event.loaded} 字节`)
			}
		} else if (event.type === HttpEventType.Response) {
			// 创建下载链接
			const url = window.URL.createObjectURL(event.body as Blob)
			const a = document.createElement('a')
			a.href = url
			a.download = 'file.pdf'
			document.body.appendChild(a)
			a.click()
			window.URL.revokeObjectURL(url)
			a.remove()
		}
	})
```

### 请求超时和自动重试

```typescript
import { timeout, retry, catchError } from 'rxjs/operators'
import { throwError } from 'rxjs'

http
	.get('/api/slow-endpoint')
	.pipe(
		// 5秒超时
		timeout(5000),
		// 超时后自动重试3次
		retry(3),
		catchError((error) => {
			if (error.name === 'TimeoutError') {
				console.error('请求超时')
			} else {
				console.error('请求失败:', error)
			}
			return throwError(() => error)
		})
	)
	.subscribe({
		next: (data) => console.log('数据:', data),
		error: (error) => console.error('最终错误:', error)
	})
```

### 请求防抖

```typescript
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators'
import { Subject } from 'rxjs'

// 创建搜索输入流
const searchTerms = new Subject<string>()

// 处理搜索请求
searchTerms
	.pipe(
		// 等待300ms，避免频繁请求
		debounceTime(300),
		// 如果搜索词没变，不发送请求
		distinctUntilChanged(),
		// 切换到新的搜索请求，取消之前未完成的
		switchMap((term) => http.get(`/api/search?q=${term}`))
	)
	.subscribe((results) => {
		console.log('搜索结果:', results)
	})

// 触发搜索
function search(term: string) {
	searchTerms.next(term)
}

// 用户输入时调用
// search('typescript')
```

### 轮询请求

```typescript
import { interval } from 'rxjs'
import { switchMap, takeUntil } from 'rxjs/operators'

// 创建停止信号
const stopPolling = new Subject<void>()

// 每5秒轮询一次
interval(5000)
	.pipe(
		// 切换到HTTP请求
		switchMap(() => http.get('/api/status')),
		// 直到停止信号发出
		takeUntil(stopPolling)
	)
	.subscribe((status) => {
		console.log('当前状态:', status)
	})

// 停止轮询
// stopPolling.next()
// stopPolling.complete()
```

### 请求节流

```typescript
import { throttleTime, switchMap } from 'rxjs/operators'
import { fromEvent } from 'rxjs'

// 监听滚动事件
fromEvent(window, 'scroll')
	.pipe(
		// 每200ms最多触发一次
		throttleTime(200),
		// 切换到HTTP请求
		switchMap(() => {
			const scrollPosition = window.scrollY
			const windowHeight = window.innerHeight
			const documentHeight = document.documentElement.scrollHeight

			// 如果滚动到底部，加载更多数据
			if (scrollPosition + windowHeight >= documentHeight - 200) {
				return http.get('/api/items?page=next')
			}

			// 否则返回空数组
			return of([])
		})
	)
	.subscribe((newItems) => {
		if (newItems.length > 0) {
			console.log('加载更多数据:', newItems)
			// 将新数据添加到列表
		}
	})
```

### 请求合并

```typescript
import { mergeMap } from 'rxjs/operators'
import { from } from 'rxjs'

// 假设有多个ID需要请求详情
const ids = [1, 2, 3, 4, 5]

// 并发请求，最多同时3个
from(ids)
	.pipe(
		mergeMap(
			(id) => http.get(`/api/items/${id}`),
			3 // 最大并发数
		)
	)
	.subscribe({
		next: (item) => console.log('获取到项目:', item),
		complete: () => console.log('所有请求完成')
	})
```

## 完整示例

下面是一个包含多种功能的完整示例：

```typescript
import {
	HttpClient,
	HttpContext,
	HttpContextToken,
	withFetch,
	withInterceptors,
	HttpRequest,
	HttpHeaders,
	HttpParams,
	HttpResponse,
	type HttpMethod,
	type HttpBackend,
	type HttpHandler,
	type HttpHandlerFn,
	type HttpInterceptor,
	type HttpEvent
} from '@ngify/http'
import { Observable, of, tap, catchError, retry, timeout } from 'rxjs'

// 缓存令牌
const HTTP_CACHE_TOKEN = new HttpContextToken(() => 0)

// 缓存服务
class CacheService {
	private readonly cacheMap = new Map<string, { response: HttpResponse<unknown>; expire: number }>()

	get(request: HttpRequest<unknown>): HttpResponse<unknown> | null {
		const entry = this.cacheMap.get(request.urlWithParams)
		if (!entry) return null
		return Date.now() > entry.expire ? null : entry.response
	}

	put(request: HttpRequest<unknown>, response: HttpResponse<unknown>): void {
		const entry = {
			response: response,
			expire: Date.now() + request.context.get(HTTP_CACHE_TOKEN)
		}
		this.cacheMap.set(request.urlWithParams, entry)
	}

	clear() {
		this.cacheMap.forEach((entry, key) => {
			if (Date.now() > entry.expire) {
				this.cacheMap.delete(key)
			}
		})
	}
}

const cacheService = new CacheService()

// 缓存拦截器
const cacheInterceptor = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
	if (!request.context.has(HTTP_CACHE_TOKEN)) {
		return next(request)
	}

	const response = cacheService.get(request)
	if (response) {
		return of(response)
	}

	return next(request).pipe(
		tap((event) => {
			cacheService.clear()
			event instanceof HttpResponse && cacheService.put(request, event)
		})
	)
}

// 日志拦截器
const logInterceptor = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
	console.log(`[请求] ${request.method} ${request.url}`)
	const startTime = Date.now()

	return next(request).pipe(
		tap((event) => {
			if (event instanceof HttpResponse) {
				const duration = Date.now() - startTime
				console.log(`[响应] ${request.method} ${request.url} - ${event.status} (${duration}ms)`)
			}
		})
	)
}

// 错误处理拦截器
const errorInterceptor = (request: HttpRequest<unknown>, next: HttpHandlerFn) => {
	return next(request).pipe(
		catchError((error) => {
			console.error(`[错误] ${request.method} ${request.url}`, error)
			return throwError(() => error)
		})
	)
}

// 创建 HTTP 客户端工厂
const createHttpClient = (baseUrl: string) => {
	const baseUrlInterceptor = (req: HttpRequest<any>, next: HttpHandlerFn) => {
		if (!req.url.startsWith('http')) {
			const fullUrl = baseUrl + req.url
			const newReq = req.clone({ url: fullUrl })
			return next(newReq)
		}
		return next(req)
	}

	return new HttpClient(
		withFetch(),
		withInterceptors([logInterceptor, errorInterceptor, baseUrlInterceptor, cacheInterceptor])
	)
}

// 创建不同环境的 HTTP 客户端实例
const apiClient = createHttpClient('https://api.example.com')
const authClient = createHttpClient('https://auth.example.com')

// 使用示例
apiClient
	.get('/users', {
		params: { page: 1, size: 10 },
		headers: { 'Content-Type': 'application/json' },
		context: new HttpContext().set(HTTP_CACHE_TOKEN, 60000) // 缓存 1 分钟
	})
	.pipe(
		timeout(10000), // 10 秒超时
		retry(3) // 失败重试 3 次
	)
	.subscribe({
		next: (data) => console.log('用户列表:', data),
		error: (error) => console.error('获取用户失败:', error),
		complete: () => console.log('请求完成')
	})
```

## 参考资料

- [GitHub 仓库](https://github.com/ngify/ngify)
- [API 文档](https://ngify.github.io/ngify/modules/_ngify_http.index.html)
- [掘金文章：使用@ngify/http 响应式HTTP 客户端处理常见的请求场景](https://juejin.cn/post/7121049508485529614)
