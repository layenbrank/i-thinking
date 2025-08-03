import { http } from '@/utils/http.ts'

export function GET_SLIDE_APP() {
	return http.get('/slide-app')
}
