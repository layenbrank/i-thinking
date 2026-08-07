import path from 'node:path'
import {
  BINARIES_DIR,
  CACHE_DIR,
  EXE_SUFFIX,
  FFMPEG_DEST,
  FFPROBE_DEST
} from '../config.ts'
import { stageFromArchive } from '../extract.ts'
import { hasFilledFile, removeFile } from '../file.ts'
import { findArchiveNameFor } from '../parse-sources.ts'
import type { ArtifactRecipe } from './types.ts'

const ffmpegRecipe: ArtifactRecipe = {
  id: 'ffmpeg',
  label: `ffmpeg / ffprobe (${FFMPEG_DEST})`,
  isRequired: false,
  hasExisting() {
    return hasFilledFile(FFMPEG_DEST) || hasFilledFile(FFPROBE_DEST)
  },
  isReady() {
    return hasFilledFile(FFMPEG_DEST) && hasFilledFile(FFPROBE_DEST)
  },
  clearArtifacts(_ctx, host) {
    removeFile(FFMPEG_DEST)
    removeFile(FFPROBE_DEST)
    const archiveName = findArchiveNameFor('ffmpeg', host)
    if (archiveName) removeFile(path.join(CACHE_DIR, archiveName))
  },
  async stageRemote(ctx, _host, asset) {
    const copies = []
    if (!hasFilledFile(FFMPEG_DEST)) {
      copies.push({ candidates: [`ffmpeg${EXE_SUFFIX}`], dest: FFMPEG_DEST })
    }
    if (!hasFilledFile(FFPROBE_DEST)) {
      copies.push({ candidates: [`ffprobe${EXE_SUFFIX}`], dest: FFPROBE_DEST })
    }
    if (copies.length === 0) return
    await stageFromArchive(ctx, asset, 'ffmpeg', copies, [
      `ffmpeg${EXE_SUFFIX}`,
      `ffprobe${EXE_SUFFIX}`
    ])
  },
  missingHint: `当前平台无 BtbN FFmpeg 资产（macOS 需自行安装）；目标目录 ${BINARIES_DIR}`
}

export { ffmpegRecipe }
