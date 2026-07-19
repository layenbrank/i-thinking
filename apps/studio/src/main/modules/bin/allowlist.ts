/** 仅允许预定义可执行文件名（不含路径分隔符） */
export const ALLOWED_BINS = new Set<string>([
  'corex.exe',
  'generate.exe',
  'service.exe'
])

export function isAllowedBinName(exeName: string): boolean {
  if (!exeName || exeName.includes('..') || exeName.includes('/') || exeName.includes('\\')) {
    return false
  }
  return ALLOWED_BINS.has(exeName)
}
