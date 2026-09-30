import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

/**
 * vendor 缓存命中的判据不是「有文件就算」，而是「有 lock 里那个版本」。
 *
 * 只按文件存在判断的话，改 tools.lock 的 pin 在**已有缓存的机器上会静默失效**：bootstrap 认为
 * 命中了，装上去的还是旧版本。CI 的缓存是空的，所以只有本地开发机看得见这个差别。
 *
 * 「不命中」不等于「要重下」：安装路径里 `fetchVerified` 会先验证缓存里的那份归档，
 * 版本没变的 pin 只会在本地重新解压一次，不走网络。
 */
const VERSION_MARKER = '.version'

/** 装自本机（不是 release）的记号：版本由用户自己负责，pin 变了也不重装。 */
const LOCAL_VENDOR_VERSION = 'local'

function findVersionMarker(vendorDir: string): string {
  return path.join(vendorDir, VERSION_MARKER)
}

/** 目录里记的是哪个版本；没记过、读不出来都算 `null`。 */
function findVendorVersion(vendorDir: string): string | null {
  const marker = findVersionMarker(vendorDir)
  if (!existsSync(marker)) {
    return null
  }
  try {
    const version = readFileSync(marker, 'utf8').trim()
    return version || null
  } catch (error) {
    console.warn('[vendor] 读版本记号失败', marker, error)
    return null
  }
}

/** 这份缓存认不认：版本对得上、主二进制还在。 */
function isVendorReady(vendorDir: string, version: string, binary: string): boolean {
  return findVendorVersion(vendorDir) === version && existsSync(binary)
}

function writeVendorVersion(vendorDir: string, version: string): void {
  writeFileSync(findVersionMarker(vendorDir), `${version}\n`, 'utf8')
}

function clearVendorVersion(vendorDir: string): void {
  rmSync(findVersionMarker(vendorDir), { force: true })
}

export {
  LOCAL_VENDOR_VERSION,
  VERSION_MARKER,
  clearVendorVersion,
  findVendorVersion,
  isVendorReady,
  writeVendorVersion
}
