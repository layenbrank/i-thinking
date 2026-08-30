type UpdaterStatus = {
  enabled: boolean
  checking: boolean
  downloading: boolean
  downloaded: boolean
  progress: number | null
  version: string | null
  error: string | null
}

type CheckResult = {
  available: boolean
  version: string | null
  releaseNotes: string | null
  reason?: string
}

export type { CheckResult, UpdaterStatus }
