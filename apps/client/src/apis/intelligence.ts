import { fetch } from '@tauri-apps/plugin-http'

import { http } from '@/utils/http/http.ts'
import { GeneratorJSON } from '@/utils/http/stream.ts'
import { INTELLIGENCE_TOKEN } from '@/utils/http/token.ts'

type CommunicateParams = MagneticTile.Intelligence.Communicate.Params
type CommunicateResponse = MagneticTile.Intelligence.Communicate.Response

// SSE server sent events
export function POST_COMMUNICATE(
  data: CommunicateParams,
  options?: { signal?: AbortSignal }
) {
  const token = 'b38cf8b7ca1e4bb18b00893d66093c00.WgxFSgb9H0u4CdE0twgqsqNB'
  const timeoutSignal = AbortSignal.timeout(1000 * 60 * 10)
  const signal = options?.signal
    ? typeof AbortSignal.any === 'function'
      ? AbortSignal.any([options.signal, timeoutSignal])
      : options.signal
    : timeoutSignal
  // return fetch(`${ENVURL.intelligence}/chat`, {
  return fetch(`/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      Authorization: `Bearer ${token}`
      // Accept: 'text/event-stream'
    },
    proxy: {
      all: {
        url: 'http://localhost:11434'
      }
    },
    signal: signal, // 10分钟超时或外部中止
    body: JSON.stringify(data)
  })
}

export { GeneratorJSON }

export function GET_TAGS() {
  return http.get('/tags', {
    context: INTELLIGENCE_TOKEN
  })
}

export function GET_CHAT_HISTORY(params: { userId: string }) {
  return http.get('/chat/history', {
    context: INTELLIGENCE_TOKEN,
    params
  })
}

