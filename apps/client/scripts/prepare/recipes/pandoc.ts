import path from 'node:path'
import { CACHE_DIR, EXE_SUFFIX, PANDOC_DEST } from '../config.ts'
import { stageFromArchive } from '../extract.ts'
import { hasFilledFile, removeFile } from '../file.ts'
import { findArchiveNameFor } from '../parse-sources.ts'
import type { ArtifactRecipe } from './types.ts'

const pandocRecipe: ArtifactRecipe = {
  id: 'pandoc',
  label: `pandoc (${PANDOC_DEST})`,
  isRequired: false,
  hasExisting() {
    return hasFilledFile(PANDOC_DEST)
  },
  isReady() {
    return hasFilledFile(PANDOC_DEST)
  },
  clearArtifacts(_ctx, host) {
    removeFile(PANDOC_DEST)
    const archiveName = findArchiveNameFor('pandoc', host)
    if (archiveName) removeFile(path.join(CACHE_DIR, archiveName))
  },
  async stageRemote(ctx, _host, asset) {
    await stageFromArchive(ctx, asset, 'pandoc', [
      { candidates: [`pandoc${EXE_SUFFIX}`], dest: PANDOC_DEST }
    ])
  },
  missingHint: '当前平台无 pandoc 资产映射（见 sources.ts release.archive）'
}

export { pandocRecipe }
