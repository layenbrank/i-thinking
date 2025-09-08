import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { v5 as UUID } from 'uuid'

const reflect = new Map<string, HttpRequest>([])

interface HttpRequest<T = any> extends InternalAxiosRequestConfig<T> {
	retry?: number
}

interface HttpError extends AxiosError {
	config?: InternalAxiosRequestConfig & {
		retry?: string
	}
}

interface HttpResponse extends AxiosResponse {
	config: InternalAxiosRequestConfig & {
		retry?: string
	}
}

export const http = axios.create({
	baseURL: 'http://localhost:3000/api/v',
	timeout: 1000 * 60
})

const namespace: Readonly<string> = 'a94e9afe-1a63-4ae0-b39c-f47dca83bd54'

http.interceptors.request.use(
	function (options: HttpRequest) {
		const key: string = [options.params, options.baseURL, options.method, options.url, options.data]
			.filter(Boolean)
			.join(',')

		const ID: string = UUID(key, namespace)

		const reflectResp = reflect.get(ID)

		// const retry = Number(options.retry)
		let retry = Number(reflectResp?.retry)
		console.log('[Req]', typeof retry)

		if (isNaN(retry)) retry = 0
		if (retry === 3) retry = 0
		if (!isNaN(retry) && retry !== 0) retry = retry + 1
		reflect.set(ID, {
			...options,
			...reflectResp,
			retry
		})

		console.log(
			'[Req]',
			'\noptions',
			options,
			'\nreflectResp',
			reflectResp,
			'\nentries',
			reflect.entries(),
			'\nretry',
			retry,
			'\nassignment',
			{
				...options,
				...reflectResp,
				retry
			}
		)

		return options
	},
	function (error) {
		return Promise.reject(error)
	}
)

http.interceptors.response.use(
	function (response: HttpResponse) {
		const { method, params, data, url, baseURL } = response.config

		const key: string = [params, baseURL, method, url, data].filter(Boolean).join(',')

		const ID: string = UUID(key, namespace)

		const options = reflect.get(ID)

		return response
	},
	function (error: HttpError) {
		const key: string = [
			error.config?.params,
			error.config?.baseURL,
			error.config?.method,
			error.config?.url,
			error.config?.data
		]
			.filter(Boolean)
			.join(',')

		const ID: string = UUID(key, namespace)

		const reflectResp = reflect.get(ID)

		let retry = Number(reflectResp?.retry)

		if (!error.config) return Promise.reject(error)
		const { method, url, baseURL, params, data } = error.config
		if (!method) return void Promise.reject(error)
		if (isNaN(retry)) return Promise.reject(error)
		if (retry === 3) {
			retry = 0
			return Promise.reject(error)
		}
		if (!isNaN(retry)) retry = retry + 1

		reflect.set(ID, {
			...error.config,
			...reflectResp,
			retry
		})

		// void http.request({
		// 	baseURL,
		// 	method,
		// 	url,
		// 	params,
		// 	data
		// })

		console.log(
			'[Res]',
			'\nerror',
			error,
			'\nreflectResp',
			reflectResp,
			'\nentries',
			reflect.entries()
		)

		return Promise.reject(error)
	}
)
