interface FindStatusR {
  enabled: boolean
  checking: boolean
  downloading: boolean
  downloaded: boolean
  progress: number | null
  version: string | null
  error: string | null
}

interface CheckR {
  available: boolean
  version: string | null
  releaseNotes: string | null
  reason?: string
}

export type { CheckR, FindStatusR }
