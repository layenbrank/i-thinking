/** Windows 侧车可执行文件名 */
const WIN_SIDECARS = ['corex.exe', 'generate.exe', 'service.exe'] as const

/** POSIX 侧车可执行文件名 */
const UNIX_SIDECARS = ['corex', 'generate', 'service'] as const

const ALLOWED_SIDECARS = new Set<string>([...WIN_SIDECARS, ...UNIX_SIDECARS])

function isAllowedSidecarName(name: string): boolean {
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return false
  }
  return ALLOWED_SIDECARS.has(name)
}

/** 当前进程平台对应的允许可执行文件名 */
function findPlatformSidecars(platform = process.platform): readonly string[] {
  return platform === 'win32' ? WIN_SIDECARS : UNIX_SIDECARS
}

export { ALLOWED_SIDECARS, findPlatformSidecars, isAllowedSidecarName }
