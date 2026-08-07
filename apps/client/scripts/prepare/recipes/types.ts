import type { PrepareContext } from '../command.ts'
import type { ArtifactId, HostKey, RemoteAsset } from '../config.ts'

type MaybePromise<T> = T | Promise<T>

type ArtifactRecipe = {
  id: ArtifactId
  label: string
  isRequired: boolean
  isReady: (ctx: PrepareContext) => MaybePromise<boolean>
  /** 已存在落盘，供 --ask 勾选 */
  hasExisting: () => boolean
  stageLocal?: (ctx: PrepareContext, dirPath: string) => MaybePromise<void>
  stageRemote: (
    ctx: PrepareContext,
    host: HostKey | null,
    asset: RemoteAsset
  ) => MaybePromise<void>
  clearArtifacts?: (ctx: PrepareContext, host: HostKey | null) => void
  missingHint?: string
}

export type { ArtifactRecipe, MaybePromise }
