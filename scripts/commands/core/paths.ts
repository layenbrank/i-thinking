import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CORE_DIR = path.dirname(fileURLToPath(import.meta.url))
const COMMANDS_ROOT = path.resolve(CORE_DIR, '..')
const SCRIPTS_ROOT = path.resolve(COMMANDS_ROOT, '..')
const REPO_ROOT = path.resolve(SCRIPTS_ROOT, '..')
const SCRIPTS_INFRA = path.join(SCRIPTS_ROOT, 'infra')

/** Sidecar 归档与解压产物：`.cache/sidecar/<tool>/<platform>/` */
const DOWNLOADS_CACHE = path.join(REPO_ROOT, '.cache', 'sidecar')
/** Fuses 等杂项临时：`.cache/fuses/` */
const FUSES_CACHE = path.join(REPO_ROOT, '.cache', 'fuses')
/** corex：`.cache/corex/directives` 指令，`captures/{qoder,studio}` 截图，`probes` 文本 */
const COREX_CACHE = path.join(REPO_ROOT, '.cache', 'corex')

export {
  COMMANDS_ROOT,
  CORE_DIR,
  COREX_CACHE,
  DOWNLOADS_CACHE,
  FUSES_CACHE,
  REPO_ROOT,
  SCRIPTS_INFRA,
  SCRIPTS_ROOT
}
