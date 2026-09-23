import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { findAppRoot } from '../../framework/paths'

/**
 * 怎么找到 corex：**优先用户自己装的那份**。
 *
 * 宿主过去自己复刻一遍 corex 的数据目录规则（`%LOCALAPPDATA%\corex`），于是和用户
 * CLI 的 `~/.corex` 各读一棵树：编辑器里看到、跑起来执行、`corex` 命令行读到的可以是
 * 三份不同的指令。现在改成问 corex 自己（`corex paths --json`）：数据目录、端点、
 * token 文件都由它算，宿主只负责转交。
 *
 * 找不到（没装，或装的那份还不认识 `paths` —— 10.x 及更早）才退回 Studio 自带的那份，
 * 并用私有端点 + 私有数据目录，免得和用户环境互相踩。
 */

const COREX_CLI = 'corex'
const COREX_DAEMON = 'corex-daemon'
const PANDOC_BINARY = 'pandoc'

/** 显式指定 corex 可执行文件；优先于 PATH 与常见安装位置。 */
const COREX_CLI_ENV = 'COREX_CLI'
const COREX_TOKEN_ENV = 'COREX_TOKEN'

/** 探测 `corex paths` 的超时：启动路径上不该被一条命令拖住。 */
const PATHS_TIMEOUT_MS = 5_000

/** 捆绑回退用的私有端点：用户装的 daemon 占着 `\\.\pipe\corex`，两条路互不干扰。 */
const BUNDLED_ENDPOINT = String.raw`\\.\pipe\corex-studio`

/** `corex paths --json` 的字段，由 corex 自己算好，宿主不重新拼。 */
interface CorexPaths {
  version: string
  data_dir: string
  directives_dir: string
  endpoint: string
  /** daemon 的 token 文件；`null` 表示 token 来自 `COREX_TOKEN` 或配置，那两处属于调用方 */
  token_file: string | null
}

/** 一份 corex 装在哪、怎么连。 */
interface CorexInstall {
  cli: string
  daemon: string
  /** 数据目录：指令 / token / 历史都在这 */
  dataDir: string
  directivesDir: string
  endpoint: string
  /** daemon 的 token 文件；`null` 时只能靠 `COREX_TOKEN` */
  tokenFile: string | null
  version: string
  /** true = Studio 自带的那份（用户没装 corex） */
  isBundled: boolean
}

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
    console.warn('[corex] 读 electron.app.isPackaged 失败，按未打包处理', error)
    return false
  }
}

/** Packaged: resources/sidecar；开发: <appRoot>/sidecar/staging/<platform> */
function findSidecarRoot(): string {
  if (isPackagedApp()) {
    return path.join(process.resourcesPath, 'sidecar')
  }
  return path.join(findAppRoot(), 'sidecar', 'staging', findPlatformKey())
}

function findBundledPath(name: string): string {
  return path.join(findSidecarRoot(), findBinaryName(name))
}

function findPandocPath(): string {
  return findBundledPath(PANDOC_BINARY)
}

function hasPandoc(): boolean {
  return existsSync(findPandocPath())
}

/** electron 的 userData；测试等非 electron 环境退回 `~/.corex-studio`。 */
function findUserDataDir(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as { app?: { getPath?: (name: string) => string } }
    const dir = electron.app?.getPath?.('userData')
    if (dir) {
      return dir
    }
  } catch (error) {
    console.warn('[corex] 读 electron userData 失败，改用 ~/.corex-studio', error)
  }
  return path.join(os.homedir(), '.corex-studio')
}

/** 找 corex 的去处：显式指定 → PATH → 各家安装位置；先出现者优先。 */
function findCandidateDirs(): string[] {
  const dirs: string[] = []
  const explicit = process.env[COREX_CLI_ENV]?.trim()
  if (explicit) {
    dirs.push(path.dirname(explicit))
  }
  for (const entry of (process.env.PATH ?? '').split(path.delimiter)) {
    if (entry) {
      dirs.push(entry)
    }
  }
  dirs.push(path.join(os.homedir(), '.corex'))
  if (process.platform === 'win32') {
    const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local')
    dirs.push(path.join(local, 'corex'))
    if (process.env.ProgramFiles) {
      dirs.push(path.join(process.env.ProgramFiles, 'corex'))
    }
  } else {
    dirs.push(path.join(os.homedir(), '.local', 'bin'))
    dirs.push('/usr/local/bin')
  }

  const seen = new Set<string>()
  return dirs.filter(function (dir) {
    const key = process.platform === 'win32' ? dir.toLowerCase() : dir
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

async function findCorexInstall(): Promise<CorexInstall> {
  for (const dir of findCandidateDirs()) {
    const cli = path.join(dir, findBinaryName(COREX_CLI))
    const daemon = path.join(dir, findBinaryName(COREX_DAEMON))
    if (!existsSync(cli) || !existsSync(daemon)) {
      continue
    }
    const paths = await probePaths(cli)
    if (!paths) {
      continue
    }
    return {
      cli,
      daemon,
      dataDir: paths.data_dir,
      directivesDir: paths.directives_dir,
      endpoint: paths.endpoint,
      tokenFile: paths.token_file,
      version: paths.version,
      isBundled: false
    }
  }

  return findBundledInstall()
}

/** 问 corex 自己路径；不认识 `paths`（旧版）或跑挂了一律当没这份安装。 */
function probePaths(cli: string): Promise<CorexPaths | null> {
  return new Promise(function (resolve) {
    execFile(
      cli,
      ['paths', '--json'],
      { timeout: PATHS_TIMEOUT_MS, windowsHide: true, encoding: 'utf8' },
      function (error, stdout) {
        if (error) {
          console.warn('[corex] 探测 corex paths 失败，跳过这份安装', cli, error.message)
          resolve(null)
          return
        }
        resolve(parsePaths(stdout))
      }
    )
  })
}

/** 校验 `paths --json` 的输出：缺了赖以连上的字段就作废。 */
function parsePaths(text: string): CorexPaths | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    console.warn('[corex] corex paths 输出不是 JSON', error)
    return null
  }
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const doc = raw as Record<string, unknown>
  const dataDir = typeof doc.data_dir === 'string' ? doc.data_dir : ''
  const endpoint = typeof doc.endpoint === 'string' ? doc.endpoint : ''
  if (!dataDir || !endpoint) {
    return null
  }

  return {
    version: typeof doc.version === 'string' ? doc.version : '',
    data_dir: dataDir,
    directives_dir:
      typeof doc.directives_dir === 'string' && doc.directives_dir
        ? doc.directives_dir
        : path.join(dataDir, 'directives'),
    endpoint,
    token_file: typeof doc.token_file === 'string' && doc.token_file ? doc.token_file : null
  }
}

/** Studio 自带的那份：私有数据目录 + 私有端点，不与用户环境共享任何东西。 */
function findBundledInstall(): CorexInstall {
  const dataDir = path.join(findUserDataDir(), 'corex')
  return {
    cli: findBundledPath(COREX_CLI),
    daemon: findBundledPath(COREX_DAEMON),
    dataDir,
    directivesDir: path.join(dataDir, 'directives'),
    endpoint: process.platform === 'win32' ? BUNDLED_ENDPOINT : path.join(dataDir, 'corex.sock'),
    tokenFile: path.join(dataDir, 'token'),
    version: '',
    isBundled: true
  }
}

/**
 * 连 daemon 用的 token，与 corex 连接方的顺序一致：`COREX_TOKEN` → 记录里的 token 文件。
 *
 * 每次调用都重读文件：自起的 daemon 是在第一轮 ping 之后才把 token 写下来的。
 * 读不到就是空串 —— 那时该做的是自起一个 daemon，而不是拿别人的 token 硬连。
 */
function resolveAuthToken(install: CorexInstall): string {
  const fromEnv = process.env[COREX_TOKEN_ENV]?.trim()
  if (fromEnv) {
    return fromEnv
  }
  if (!install.tokenFile) {
    return ''
  }
  try {
    return readFileSync(install.tokenFile, 'utf8').trim()
  } catch (error) {
    console.warn('[corex] 读 token 文件失败', install.tokenFile, error)
    return ''
  }
}

export {
  BUNDLED_ENDPOINT,
  COREX_CLI,
  COREX_CLI_ENV,
  COREX_DAEMON,
  COREX_TOKEN_ENV,
  PANDOC_BINARY,
  PATHS_TIMEOUT_MS,
  findBinaryName,
  findBundledPath,
  findCandidateDirs,
  findCorexInstall,
  findPandocPath,
  findPlatformKey,
  findSidecarRoot,
  findUserDataDir,
  hasPandoc,
  parsePaths,
  resolveAuthToken
}
export type { CorexInstall, CorexPaths }
