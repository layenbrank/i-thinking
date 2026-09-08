import { http } from '@/utils/http/http.ts'

function GET_TILES() {
  return http.get('/magnetic-tile', {
    env: 'corex'
  })
}

function GET_SINGLETON(id: string) {
  return http.get(`/magnetic-tile/singleton/${id}`, {
    env: 'corex'
  })
}

function GET_FAVICON(url: string) {
  return http.get('/magnetic-tile/favicon', {
    query: {
      url: decodeURIComponent(url)
    },
    env: 'corex'
  })
}

export { GET_TILES, GET_FAVICON, GET_SINGLETON }
