interface HttpClientOptions {
	baseURL: string
	timeout: number
	adapter: HttpAdapter
	before: (request: any) => void
	after: (response: any) => void
}

interface MethodOptions {
	headers?: Record<string, string>
	retry?: () => void
	[key: string]: any
}

// 适配器
interface HttpAdapter {
	Get<T = any>(url: string, options?: MethodOptions): Promise<T>
	Post<T = any>(url: string, data: any, options?: MethodOptions): Promise<T>
	Delete<T = any>(url: string, options?: MethodOptions): Promise<T>
	Put<T = any>(url: string, data: any, options: MethodOptions): Promise<T>
}

// interface HttpResponse {
// 	[key: string]: any
// }

// interface HttpMethod extends HttpAdapter {}

class HttpClient implements HttpAdapter {
	protected options: HttpClientOptions
	constructor(options: HttpClientOptions) {
		this.options = options
	}
	Get<T = any>(url: string, options?: MethodOptions): Promise<T> {
		throw new Error('Method not implemented.')
	}
	Post<T = any>(url: string, data: any, options?: MethodOptions): Promise<T> {
		throw new Error('Method not implemented.')
	}
	Delete<T = any>(url: string, options?: MethodOptions): Promise<T> {
		throw new Error('Method not implemented.')
	}
	Put<T = any>(url: string, data: any, options: MethodOptions): Promise<T> {
		throw new Error('Method not implemented.')
	}
}

const http = new HttpClient({
	baseURL: '',
	timeout: 1000 * 60,
	adapter: httpWithFetch(),
	before(request) {},
	after(response) {}
})

export function httpWithXHR(): HttpAdapter {
	return {
		Get: function <T = any>(url: string, options?: MethodOptions): Promise<T> {
			throw new Error('Function not implemented.')
		},
		Post: function <T = any>(url: string, data: any, options?: MethodOptions): Promise<T> {
			throw new Error('Function not implemented.')
		},
		Delete: function <T = any>(url: string, options?: MethodOptions): Promise<T> {
			throw new Error('Function not implemented.')
		},
		Put: function <T = any>(url: string, data: any, options: MethodOptions): Promise<T> {
			throw new Error('Function not implemented.')
		}
	}
}

export function httpWithFetch(): HttpAdapter {
	return {
		async Get(url, options) {
			const response = await fetch(url, {
				method: 'GET',
				...(options ? options : {})
			})
			return response.json()
		},
		async Post(url, data, options) {
			const response = await fetch(url, {
				method: 'POST',
				body: JSON.stringify(data ? data : {}),
				...(options ? options : {})
			})
			return response.json()
		},
		async Delete(url, options) {
			const response = await fetch(url, {
				method: 'DELETE',
				...(options ? options : {})
			})
			return response.json()
		},
		async Put(url, data, options) {
			const response = await fetch(url, {
				method: 'PUT',
				body: JSON.stringify(data ? data : {}),
				...(options ? options : {})
			})
			return response.json()
		}
	}
}
