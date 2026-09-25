import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { findAppRoot } from '../../framework/paths'

/**
 * opencode 二进制的落点与**私有数据目录**。
 *
 * 二进制与 studio 强耦合（SDK 版本必须与服务端一致），所以只认两个来源：
 * 1. 显式 `OPENCODE_BINARY`（开发期指向自建/自编的那份）；
 * 2. sidecar staging（`scripts sidecar opencode` 落盘、打包时随包发出）。
 * **不扫 PATH** —— 用户自己装的 opencode 版本未知，连上去会以奇怪的协议错误失败。
 *
 * 数据目录必须隔离到 `<userData>/opencode`：opencode 默认数据目录是
 * `~/.local/share/opencode`，那可能是用户自己的会话库（实测直接启动会因
 * `Database is not empty and has no session table` 失败）。
 */

const OPENCODE_BINARY = 'opencode'

/** 显式指定 opencode 二进制的环境变量名 */
const OPENCODE_BINARY_ENV = 'OPENCODE_BINARY'

function findPlatformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

function findBinaryName(name: string, platform = process.platform): string {
  return platform === 'win32' ? `${name}.exe` : name
}

function isPackagedApp(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as { app?: { isPackaged?: boolean } }
    return Boolean(electron.app?.isPackaged)
  } catch (error) {
    console.warn('[opencode] 读 electron.app.isPackaged 失败，按未打包处理', error)
    return false
  }
}

function findUserDataDir(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as { app?: { getPath?: (name: string) => string } }
    const dir = electron.app?.getPath?.('userData')
    if (dir) return dir
  } catch (error) {
    console.warn('[opencode] 读 electron userData 失败，改用 ~/.i-thinking', error)
  }
  return path.join(os.homedir(), '.i-thinking')
}

/** Packaged: resources/sidecar；开发: <appRoot>/sidecar/staging/<platform> */
function findSidecarRoot(): string {
  if (isPackagedApp()) {
    return path.join(process.resourcesPath, 'sidecar')
  }
  return path.join(findAppRoot(), 'sidecar', 'staging', findPlatformKey())
}

/** 返回 null 表示「这份没装」：调用方给出可读的报错，而不是启动一个不存在的进程 */
function findOpencodeBinary(): string | null {
  const explicit = process.env[OPENCODE_BINARY_ENV]?.trim()
  if (explicit) {
    const resolved = path.resolve(explicit)
    if (existsSync(resolved)) return resolved
    console.warn(`[opencode] ${OPENCODE_BINARY_ENV} 指向的文件不存在: ${resolved}`)
  }

  const bundled = path.join(findSidecarRoot(), findBinaryName(OPENCODE_BINARY))
  return existsSync(bundled) ? bundled : null
}

/** opencode 私有数据根：下面再分 data/config/cache/state 四个 XDG 目录 */
function findOpencodeRoot(): string {
  return path.join(findUserDataDir(), 'opencode')
}

/**
 * opencode 在 Windows 上也遵守 XDG 变量（实测），四个目录全部指向私有根下，
 * 用户自己的 `~/.local/share/opencode` 一点都不会被碰到。
 */
function buildOpencodeEnv(root: string): Record<string, string> {
  return {
    XDG_DATA_HOME: path.join(root, 'data'),
    XDG_CONFIG_HOME: path.join(root, 'config'),
    XDG_CACHE_HOME: path.join(root, 'cache'),
    XDG_STATE_HOME: path.join(root, 'state'),
    // opencode 访问平台网关（127.0.0.1）时必须绕过本机系统代理，否则会被代理吞掉
    NO_PROXY: '127.0.0.1,localhost,::1',
    no_proxy: '127.0.0.1,localhost,::1'
  }
}

/** electron-store 里记「studio 会话 → opencode 会话」的文件名 */
const OPENCODE_SESSION_STORE = 'opencode-sessions'

export {
  buildOpencodeEnv,
  findBinaryName,
  findOpencodeBinary,
  findOpencodeRoot,
  findPlatformKey,
  findSidecarRoot,
  findUserDataDir,
  isPackagedApp,
  OPENCODE_BINARY,
  OPENCODE_BINARY_ENV,
  OPENCODE_SESSION_STORE
}
