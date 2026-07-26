/**
 * corex engine IPC（Bing 搜索建议）
 */
import { generateSecureCvid } from '@i-thinking/utils'

import { ipcInvoke, parseData } from '@/lib/ipc'

const CVID = generateSecureCvid()

const PT = 'page.home'
const CSR = '1'
const PTHS = '1'

interface SuggestionEnvelope {
  data: Engine.Suggestion
}

function parseSuggestion(payload: unknown): Engine.Suggestion {
  if (!payload || typeof payload !== 'object') {
    throw new Error('IPC suggestion 无效')
  }

  const record = payload as Record<string, unknown>

  if (Array.isArray(record.s)) {
    return record as unknown as Engine.Suggestion
  }

  const nested = record.data
  if (nested && typeof nested === 'object' && Array.isArray((nested as Engine.Suggestion).s)) {
    return nested as Engine.Suggestion
  }

  throw new Error('IPC suggestion 缺少 s')
}

async function suggestion(qry: string): Promise<Engine.Suggestion> {
  const resp = await ipcInvoke(
    'engine',
    {
      pt: PT,
      qry,
      cp: qry.length,
      csr: CSR,
      pths: PTHS,
      cvid: CVID
    },
    'suggestion'
  )
  const payload = parseData<Engine.Suggestion | SuggestionEnvelope>(resp)
  return parseSuggestion(payload)
}

const EngineIpc = {
  suggestion
}

export { EngineIpc }
