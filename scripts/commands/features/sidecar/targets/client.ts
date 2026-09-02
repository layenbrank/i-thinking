import { execSync } from 'node:child_process'
import path from 'node:path'

import { REPO_ROOT } from '../../../core/paths.ts'

import { COREX_DAEMON, GOOSE_BINARY } from '../infra/constants.ts'
import { findBinaryName } from '../infra/platform.ts'

import type { StageTarget } from '../infra/stage.ts'

/**
 * Tauri externalBin expects corex-daemon / goose with -<host-triple>[.exe].
 * Other tools keep simple names (pandoc.exe, ffmpeg.exe, pdfium.dll).
 */
const ClientTarget: StageTarget = {
  id: 'client',
  findStagedDir() {
    return path.join(REPO_ROOT, 'apps', 'client', 'src-tauri', 'binaries')
  },
  mapFileName(fileName) {
    const triple = execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim()
    const suffix = process.platform === 'win32' ? '.exe' : ''
    const daemon = findBinaryName(COREX_DAEMON)
    if (fileName === daemon) {
      return `corex-daemon-${triple}${suffix}`
    }
    const goose = findBinaryName(GOOSE_BINARY)
    if (fileName === goose) {
      return `goose-${triple}${suffix}`
    }
    return fileName
  }
}

export { ClientTarget }
