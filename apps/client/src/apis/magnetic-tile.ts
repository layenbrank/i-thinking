import { http } from '@/utils/http/http.ts'

function GET_TILES() {
  return http.get('/magnetic-tile', {
    env: 'thinking'
  })
}

function GET_SINGLETON(id: string) {
  return http.get(`/magnetic-tile/singleton/${id}`, {
    env: 'thinking'
  })
}

function GET_FAVICON(url: string) {
  return http.get('/magnetic-tile/favicon', {
    query: {
      url: decodeURIComponent(url)
    },
    env: 'thinking'
  })
}

export { GET_TILES, GET_FAVICON, GET_SINGLETON }
