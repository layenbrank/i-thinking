import path from 'node:path'

import { REPO_ROOT } from '../../../core/paths.ts'

const BROWSER_PACKAGE = path.join(REPO_ROOT, 'apps', 'browser')
const CONFIG_PATH = path.join(BROWSER_PACKAGE, 'config.json')
const OVERLAY_REL = path.join('overlay')
const PATCHES_REL = path.join('patches')
const GN_DIR = path.join(BROWSER_PACKAGE, 'gn')
const INSTALLER_DIR = path.join(BROWSER_PACKAGE, 'installer')
const NSI_PATH = path.join(INSTALLER_DIR, 'i-thinking.nsi')
/** Staged browser binary / installer outputs — never under webui `dist/`. */
const BUILD_ROOT = path.join(BROWSER_PACKAGE, 'build')
const STAGE_DIR = path.join(BUILD_ROOT, 'runtime')

const GIT_CANDIDATES = [
  'D:\\Applications\\Git\\cmd',
  'C:\\Program Files\\Git\\cmd',
  'C:\\Program Files (x86)\\Git\\cmd'
] as const

/** Top-level names under webui dist that must never sync into Chromium resources. */
const WEBUI_SYNC_SKIP_NAMES = [
  'i-thinking-runtime',
  'i-thinking-runtime.zip',
  'i-thinking-setup.exe',
  'node_modules',
  '.cache',
  'runtime',
  'build'
] as const

/** Extensions that are never WebUI assets (stage / installer leftovers). */
const WEBUI_SYNC_SKIP_EXTENSIONS = [
  '.exe',
  '.dll',
  '.zip',
  '.pak',
  '.pdb',
  '.lib',
  '.obj'
] as const

const CLEAN_WEBUI_NAMES = [
  'assets',
  'css',
  'javascript',
  'images',
  'fonts',
  'videos',
  'audios',
  'wasm',
  'workers',
  'index.html',
  'i_thinking.html',
  'main.js',
  // Contaminants from older stage-into-dist layout
  'i-thinking-runtime',
  'i-thinking-runtime.zip',
  'i-thinking-setup.exe'
] as const
const RUNTIME_GLOBS = [
  '*.exe',
  '*.dll',
  '*.pak',
  '*.bin',
  '*.dat',
  '*.json',
  '*.ico',
  '*.manifest',
  '*.xml'
] as const

const STAGE_SUBDIRS = ['Locales', 'locales', 'MEIPreload', 'IwaKeyDistribution'] as const

export {
  BROWSER_PACKAGE,
  BUILD_ROOT,
  CLEAN_WEBUI_NAMES,
  CONFIG_PATH,
  GIT_CANDIDATES,
  GN_DIR,
  INSTALLER_DIR,
  NSI_PATH,
  OVERLAY_REL,
  PATCHES_REL,
  RUNTIME_GLOBS,
  STAGE_DIR,
  STAGE_SUBDIRS,
  WEBUI_SYNC_SKIP_EXTENSIONS,
  WEBUI_SYNC_SKIP_NAMES
}
