import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { GET_ENGINE_SUGGESTION, type SuggestionItem } from '@/apis/engine.ts'
import { ENGINE_UI } from '@/views/overview/engine/constants'

const SUGGESTION_KEY = ['engine', 'suggestion'] as const

let sessionCvid = ''

function findCvid() {
  if (sessionCvid) return sessionCvid
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  sessionCvid = Array.from(bytes)
    .map(function (byte) {
      return byte.toString(16).padStart(2, '0')
    })
    .join('')
    .toUpperCase()
  return sessionCvid
}

function parseSuggestion(data: unknown): SuggestionItem[] {
  if (!data || typeof data !== 'object') return []
  const series = (data as { s?: unknown }).s
  if (!Array.isArray(series)) return []

  const items: SuggestionItem[] = []
  for (const row of series) {
    if (!row || typeof row !== 'object') continue
    const item = row as { id?: unknown; q?: unknown; u?: unknown; t?: unknown }
    if (typeof item.id !== 'string' || typeof item.q !== 'string' || typeof item.u !== 'string') {
      continue
    }
    items.push({
      id: item.id,
      q: item.q,
      u: item.u,
      t: typeof item.t === 'string' ? item.t : ''
    })
  }
  return items
}

function fetchSuggestion(qry: string, signal: AbortSignal) {
  return GET_ENGINE_SUGGESTION(
    { qry, cp: String(qry.length), cvid: findCvid() },
    signal
  ).then(parseSuggestion)
}

function useDebouncedKeyword(value: string, wait: number) {
  const [settled, updateSettled] = useState(value)

  useEffect(
    function () {
      const timer = setTimeout(function () {
        updateSettled(value)
      }, value ? wait : 0)
      return function () {
        clearTimeout(timer)
      }
    },
    [value, wait]
  )

  return settled
}

/**
 * 停手后再查。相同关键词在 staleTime 内直接用缓存；
 * 关键词变了就用 signal 取消上一次，空词不发请求。
 */
function useSuggestionQuery(keyword: string) {
  const qry = useDebouncedKeyword(keyword.trim(), ENGINE_UI.SUGGEST_WAIT_MS)
  const query = useQuery({
    queryKey: [...SUGGESTION_KEY, qry],
    queryFn: function ({ queryKey, signal }) {
      const current = queryKey[SUGGESTION_KEY.length]
      if (typeof current !== 'string' || current.length === 0) return []
      return fetchSuggestion(current, signal)
    },
    enabled: qry.length > 0,
    retry: false
  })
  const isCurrent = qry.length > 0 && qry === keyword.trim()
  return {
    items: isCurrent && query.data ? query.data : []
  }
}

export type { SuggestionItem }
export { parseSuggestion, useSuggestionQuery }
