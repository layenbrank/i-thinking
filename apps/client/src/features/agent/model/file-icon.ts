/**
 * 按文件名 / 扩展名解析 Iconify 图标（本地 mdi 集）
 */

const FOLDER_ICON = 'mdi:folder-outline'
const FILE_ICON = 'mdi:file-document-outline'

const EXT_ICONS: Record<string, string> = {
  ts: 'mdi:language-typescript',
  tsx: 'mdi:react',
  js: 'mdi:language-javascript',
  jsx: 'mdi:react',
  mjs: 'mdi:language-javascript',
  cjs: 'mdi:language-javascript',
  json: 'mdi:code-json',
  md: 'mdi:language-markdown',
  mdx: 'mdi:language-markdown',
  css: 'mdi:language-css3',
  scss: 'mdi:sass',
  sass: 'mdi:sass',
  less: 'mdi:language-css3',
  html: 'mdi:language-html5',
  htm: 'mdi:language-html5',
  rs: 'mdi:language-rust',
  py: 'mdi:language-python',
  go: 'mdi:language-go',
  java: 'mdi:language-java',
  kt: 'mdi:language-kotlin',
  toml: 'mdi:file-code-outline',
  yaml: 'mdi:code-json',
  yml: 'mdi:code-json',
  xml: 'mdi:file-code-outline',
  svg: 'mdi:svg',
  png: 'mdi:file-image-outline',
  jpg: 'mdi:file-image-outline',
  jpeg: 'mdi:file-image-outline',
  gif: 'mdi:file-image-outline',
  webp: 'mdi:file-image-outline',
  ico: 'mdi:file-image-outline',
  sql: 'mdi:database-outline',
  sh: 'mdi:bash',
  bash: 'mdi:bash',
  ps1: 'mdi:powershell',
  bat: 'mdi:console',
  txt: 'mdi:file-document-outline',
  log: 'mdi:text-box-outline',
  lock: 'mdi:lock-outline',
  env: 'mdi:cog-outline',
  gitignore: 'mdi:git',
  dockerfile: 'mdi:docker',
  vue: 'mdi:vuejs',
  svelte: 'mdi:file-code-outline'
}

const NAME_ICONS: Record<string, string> = {
  'skill.md': 'mdi:hammer-wrench',
  'readme.md': 'mdi:book-open-page-variant-outline',
  'license': 'mdi:scale-balance',
  'package.json': 'mdi:npm',
  'pnpm-lock.yaml': 'mdi:npm',
  'cargo.toml': 'mdi:language-rust',
  'tsconfig.json': 'mdi:language-typescript',
  dockerfile: 'mdi:docker',
  'docker-compose.yml': 'mdi:docker',
  'docker-compose.yaml': 'mdi:docker'
}

const IMAGE_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'avif'
])

function parseExtension(name: string) {
  const lower = name.toLowerCase()
  const dot = lower.lastIndexOf('.')
  if (dot <= 0 || dot === lower.length - 1) return ''
  return lower.slice(dot + 1)
}

function isImageFile(name: string) {
  return IMAGE_EXTS.has(parseExtension(name))
}

function findFolderIcon() {
  return FOLDER_ICON
}

function findFileIcon(name: string) {
  const lower = name.toLowerCase()
  const byName = NAME_ICONS[lower]
  if (byName) return byName

  const ext = parseExtension(lower)
  if (ext && EXT_ICONS[ext]) return EXT_ICONS[ext]

  if (lower.startsWith('.') && EXT_ICONS[lower.slice(1)]) {
    return EXT_ICONS[lower.slice(1)]
  }

  return FILE_ICON
}

function findEntryIcon(name: string, kind: 'file' | 'dir' | string) {
  if (kind === 'dir') return findFolderIcon()
  return findFileIcon(name)
}

export { FOLDER_ICON, FILE_ICON, findFolderIcon, findFileIcon, findEntryIcon, isImageFile }
