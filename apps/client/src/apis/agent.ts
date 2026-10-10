import { fetch } from '@tauri-apps/plugin-http'

import { http } from '@/utils/http/http.ts'
import { GeneratorJSON } from '@/utils/http/stream.ts'

type CommunicateParams = MagneticTile.Agent.Communicate.Params
type CommunicateResponse = MagneticTile.Agent.Communicate.Response

// SSE server sent events
export function POST_COMMUNICATE(
  data: CommunicateParams,
  options?: { signal?: AbortSignal }
) {
  // 本地推理服务通常不校验凭证；需要时由构建环境注入，不落仓库
  const token = import.meta.env.VITE_INTELLIGENCE_TOKEN
  const timeoutSignal = AbortSignal.timeout(1000 * 60 * 10)
  const signal = options?.signal
    ? typeof AbortSignal.any === 'function'
      ? AbortSignal.any([options.signal, timeoutSignal])
      : options.signal
    : timeoutSignal
  return fetch(`${import.meta.env.VITE_INTELLIGENCE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
      // Accept: 'text/event-stream'
    },
    signal: signal, // 10分钟超时或外部中止
    body: JSON.stringify(data)
  })
}

export { GeneratorJSON }

export function GET_TAGS() {
  return http.get('/tags', {
    env: 'intelligence'
  })
}

export function GET_CHAT_HISTORY(params: { userId: string }) {
  return http.get('/chat/history', {
    env: 'intelligence',
    query: params
  })
}

