interface SidecarStatus {
  isReady: boolean
  version: string
  modules: string[]
  hasCorex: boolean
  hasPandoc: boolean
}

export type { SidecarStatus }
