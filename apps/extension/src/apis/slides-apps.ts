import { extHttp } from '@/utils/http.ts'

export function GET_SLIDES_APPS() {
  extHttp.get('/api/slides/apps')
}
