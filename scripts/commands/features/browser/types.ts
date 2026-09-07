import type { Command } from 'commander'

interface BrowserConfig {
  productName: string
  webuiHost: string
  webuiUrl: string
  userDataDirName: string
  executableName: string
  chromiumMilestone: string
  workspaceRoot: string
  depotTools: string
  chromiumCheckout: string
  chromiumRoot: string
  gitCache: string
  webuiDist: string
  outDir: string
  urls: {
    depotToolsArchive: string
    depotToolsRepo: string
    chromiumSrc: string
    chromiumDocsWindows: string
    cipdClient: string
  }
}

interface BrowserContext {
  browserRoot: string
  workspaceRoot: string
  depotTools: string
  chromiumCheckout: string
  chromiumRoot: string
  gitCache: string
  outDir: string
  outRel: string
  webuiDist: string
  overlayRoot: string
  patchesDir: string
  config: BrowserConfig
}

interface BrowserAction {
  name: string
  description: string
  register(parent: Command, ctx: BrowserContext): void
}

interface GnProfile {
  id: string
  description: string
  argsFile: string
  localArgsFile?: string
}

interface WireStep {
  id: string
  description: string
  apply(ctx: BrowserContext): void
}

export type { BrowserAction, BrowserConfig, BrowserContext, GnProfile, WireStep }
