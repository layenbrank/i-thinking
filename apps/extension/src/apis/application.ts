import { http } from '@/utils/http/http.ts'
import { COREX_TOKEN } from '@/utils/http/token.ts'

export function GET_APPLICATION() {
	return http.get('/application', {
		context: COREX_TOKEN
	})
}

export function GET_SINGLETON(id: string) {
	return http.get(`/application/singleton/${id}`, {
		context: COREX_TOKEN
	})
}

export function GET_FAVICON(url: string) {
	return http.get('/application/favicon', {
		params: {
			url: decodeURIComponent(url)
		},
		context: COREX_TOKEN
	})
}
