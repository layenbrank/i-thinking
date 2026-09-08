import { http } from '@/utils/http/http.ts'

function FIND_MAGNETIC_TILE() {
  return http.get('/magnetic-tile', {
    env: 'thinking'
  })
}

function FIND_SINGLETON(id: string) {
  return http.get(`/magnetic-tile/singleton/${id}`, {
    env: 'thinking'
  })
}

function FIND_FAVICON(url: string) {
  return http.get('/magnetic-tile/favicon', {
    query: {
      url: decodeURIComponent(url)
    },
    env: 'thinking'
  })
}

export { FIND_MAGNETIC_TILE, FIND_SINGLETON, FIND_FAVICON }
