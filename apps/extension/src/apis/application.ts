import { http } from '@/utils/http/http.ts'
import { EXTENSION_TOKEN } from '@/utils/http/token.ts'

export function GET_APPLICATION() {
	return http.get('/application', {
		context: EXTENSION_TOKEN
	})
}

export function GET_SINGLETON(id: string) {
	return http.get(`/application/singleton/${id}`, {
		context: EXTENSION_TOKEN
	})
}

export function GET_FAVICON(url: string) {
	return http.get('/application/favicon', {
		params: {
			url: decodeURIComponent(url)
		},
		context: EXTENSION_TOKEN
	})
}
