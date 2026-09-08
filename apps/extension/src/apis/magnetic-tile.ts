import { http } from '@/utils/http/http.ts'

function FIND_MAGNETIC_TILE() {
  return http.get('/magnetic-tile', {
    env: 'corex'
  })
}

function FIND_SINGLETON(id: string) {
  return http.get(`/magnetic-tile/singleton/${id}`, {
    env: 'corex'
  })
}

function FIND_FAVICON(url: string) {
  return http.get('/magnetic-tile/favicon', {
    query: {
      url: decodeURIComponent(url)
    },
    env: 'corex'
  })
}

export { FIND_FAVICON, FIND_MAGNETIC_TILE, FIND_SINGLETON }
