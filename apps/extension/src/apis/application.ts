import { http } from '@/utils/http.ts'

export function GET_APPLICATION() {
	return http.get('/application')
}

export function GET_SINGLETON(id: string) {
	return http.get(`/application/singleton/${id}`)
}

export function GET_FAVICON(url: string) {
	return http.get('/application/favicon', {
		params: {
			url: decodeURIComponent(url)
		}
	})
}
