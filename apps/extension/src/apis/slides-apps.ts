import { extHttp } from '@/utils/http.ts'

export function GET_SLIDE_APP() {
	return extHttp.get('/slide-app')
}
