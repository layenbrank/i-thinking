import { SUGGEST_ORIGIN } from '@/shared/suggest.ts'
import { http } from '@/utils/http.ts'

interface SuggestionItem {
  id: string
  q: string
  u: string
  t: string
}

interface SuggestionQuery {
  qry: string
  cp?: string
  cvid: string
}

interface SuggestionPayload {
  s?: unknown
}

const PAGE_TYPE = 'page.home'
const CSR = '1'
const PTHS = '1'

function buildSuggestionQuery(input: SuggestionQuery) {
  return {
    pt: PAGE_TYPE,
    qry: input.qry,
    cp: input.cp && input.cp.length > 0 ? input.cp : String(input.qry.length),
    csr: CSR,
    pths: PTHS,
    cvid: input.cvid
  }
}

function GET_ENGINE_SUGGESTION(input: SuggestionQuery, signal?: AbortSignal) {
  return http.get<SuggestionPayload>(SUGGEST_ORIGIN, {
    query: buildSuggestionQuery(input),
    signal,
    headers: {
      Accept: 'application/json, text/plain, */*'
    }
  })
}

export type { SuggestionItem, SuggestionPayload, SuggestionQuery }
export { GET_ENGINE_SUGGESTION, buildSuggestionQuery }
