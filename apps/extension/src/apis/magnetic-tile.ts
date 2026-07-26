import { http } from '@/utils/http/http.ts'
import { COREX_TOKEN } from '@/utils/http/token.ts'

function FIND_MAGNETIC_TILE() {
  return http.get('/magnetic-tile', {
    context: COREX_TOKEN
  })
}

function FIND_SINGLETON(id: string) {
  return http.get(`/magnetic-tile/singleton/${id}`, {
    context: COREX_TOKEN
  })
}

function FIND_FAVICON(url: string) {
  return http.get('/magnetic-tile/favicon', {
    params: {
      url: decodeURIComponent(url)
    },
    context: COREX_TOKEN
  })
}

export { FIND_MAGNETIC_TILE, FIND_SINGLETON, FIND_FAVICON }
