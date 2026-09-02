/**
 * 按文件名 / 扩展名解析 Iconify 图标与色调（本地 mdi 集）
 */

const FOLDER_ICON = 'mdi:folder-outline'
const FILE_ICON = 'mdi:file-document-outline'

type FileIconTone =
  | 'ts'
  | 'js'
  | 'react'
  | 'json'
  | 'md'
  | 'css'
  | 'html'
  | 'rs'
  | 'py'
  | 'go'
  | 'java'
  | 'image'
  | 'sql'
  | 'shell'
  | 'vue'
  | 'docker'
  | 'npm'
  | 'skill'
  | 'folder'
  | 'file'

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
  png: 'mdi:file-png-box',
  jpg: 'mdi:file-jpg-box',
  jpeg: 'mdi:file-jpg-box',
  gif: 'mdi:file-image-outline',
  webp: 'mdi:file-image-outline',
  ico: 'mdi:file-image-outline',
  bmp: 'mdi:file-image-outline',
  avif: 'mdi:file-image-outline',
  doc: 'mdi:file-word-box',
  docx: 'mdi:file-word-box',
  xls: 'mdi:file-excel-box',
  xlsx: 'mdi:file-excel-box',
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

const EXT_TONES: Record<string, FileIconTone> = {
  ts: 'ts',
  tsx: 'react',
  js: 'js',
  jsx: 'react',
  mjs: 'js',
  cjs: 'js',
  json: 'json',
  md: 'md',
  mdx: 'md',
  css: 'css',
  scss: 'css',
  sass: 'css',
  less: 'css',
  html: 'html',
  htm: 'html',
  rs: 'rs',
  py: 'py',
  go: 'go',
  java: 'java',
  kt: 'java',
  toml: 'rs',
  yaml: 'json',
  yml: 'json',
  xml: 'file',
  svg: 'image',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  ico: 'image',
  bmp: 'image',
  avif: 'image',
  doc: 'ts',
  docx: 'ts',
  xls: 'vue',
  xlsx: 'vue',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  ps1: 'shell',
  bat: 'shell',
  txt: 'file',
  log: 'file',
  lock: 'file',
  env: 'file',
  gitignore: 'shell',
  dockerfile: 'docker',
  vue: 'vue',
  svelte: 'css'
}

const NAME_ICONS: Record<string, string> = {
  'skill.md': 'mdi:hammer-wrench',
  'readme.md': 'mdi:book-open-page-variant-outline',
  license: 'mdi:scale-balance',
  'package.json': 'mdi:npm',
  'pnpm-lock.yaml': 'mdi:npm',
  'cargo.toml': 'mdi:language-rust',
  'tsconfig.json': 'mdi:language-typescript',
  dockerfile: 'mdi:docker',
  'docker-compose.yml': 'mdi:docker',
  'docker-compose.yaml': 'mdi:docker'
}

const NAME_TONES: Record<string, FileIconTone> = {
  'skill.md': 'skill',
  'readme.md': 'md',
  license: 'file',
  'package.json': 'npm',
  'pnpm-lock.yaml': 'npm',
  'cargo.toml': 'rs',
  'tsconfig.json': 'ts',
  dockerfile: 'docker',
  'docker-compose.yml': 'docker',
  'docker-compose.yaml': 'docker'
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

function findFileIconTone(name: string, kind?: 'file' | 'dir' | 'skill' | string): FileIconTone {
  if (kind === 'dir') return 'folder'
  if (kind === 'skill') return 'skill'

  const lower = name.toLowerCase()
  const byName = NAME_TONES[lower]
  if (byName) return byName

  const ext = parseExtension(lower)
  if (ext && EXT_TONES[ext]) return EXT_TONES[ext]

  if (lower.startsWith('.') && EXT_TONES[lower.slice(1)]) {
    return EXT_TONES[lower.slice(1)]
  }

  return 'file'
}

function findEntryIcon(name: string, kind: 'file' | 'dir' | string) {
  if (kind === 'dir') return findFolderIcon()
  return findFileIcon(name)
}

export {
  FOLDER_ICON,
  FILE_ICON,
  findFolderIcon,
  findFileIcon,
  findFileIconTone,
  findEntryIcon,
  isImageFile
}
export type { FileIconTone }
