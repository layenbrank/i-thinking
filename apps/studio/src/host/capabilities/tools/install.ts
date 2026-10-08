import { createHash } from 'node:crypto'
import {
  chmodSync,
  cpSync,
  createReadStream,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync
} from 'node:fs'
import path from 'node:path'

import { findBinary, findBundledRoot, findRuntimeRoot } from '@/host/framework/binaries'
import type { CHANNELS } from '@/shared/ipc/channels'
import { IpcError, type IpcErrorCode } from '@/shared/ipc/error'
import type { Out } from '@/shared/ipc/specs'
import { extractArchive, findFileInTree } from './archive'
import { findTool, findToolBinaryNames, findTools, isToolKey, type ToolSpec } from './catalog'
import { download, type DownloadProgress } from './download'

/**
 * 在线工具在宿主这一侧的**落点与安装**。
 *
 * 落点固定 `<userData>/sidecar/<tool>/<version>/`：版本进路径，升级就是换个目录，
 * 不用比对版本号，删掉旧目录即可。Dev/打包都一样 —— 只有「随包那份」的位置随打包态变
 * （见 `host/framework/binaries.ts`）。
 *
 * 取用顺序一律 **运行时下载的那份 → 随包那份**：用户显式下过就以他为准，完整版内置的那些
 * 只是兜底。
 */

/** 状态行就是契约里的那条：四档不在这里再抄一遍，漂了编译不过 */
type ToolStatus = Out<typeof CHANNELS.TOOL.READ>[number]

/** 下载中途抛错时的用户向文案：都带上工具名，界面上不必再拼 */
function toToolError(key: string, code: IpcErrorCode, message: string): IpcError {
  return new IpcError(code, `${key}: ${message}`)
}

function findToolRoot(): string {
  return findRuntimeRoot()
}

function findToolVersionDir(spec: ToolSpec): string {
  return path.join(findToolRoot(), spec.key, spec.version)
}

/**
 * 某个来源里这个工具的二进制；**不跨来源混合**（`ffmpeg` 与 `ffprobe` 版本错配会以奇怪的解码错误失败）。
 * 名字传 manifest 里那份不带扩展名的，补后缀交给 framework。
 */
function findBinaryIn(dir: string, spec: ToolSpec): string | null {
  return findBinary({ dirs: [dir], names: spec.binaries })?.path ?? null
}

async function hashFile(filePath: string): Promise<string> {
  const hash = createHash('sha256')
  await new Promise<void>(function (resolve, reject) {
    const stream = createReadStream(filePath)
    stream.on('data', function (chunk) {
      hash.update(chunk)
    })
    stream.on('error', reject)
    stream.on('end', function () {
      resolve()
    })
  })
  return hash.digest('hex')
}

/** 已装好那份的二进制；主二进制在 = 这份算装上。
 *
 * 与取用路径分开探：状态要如实说「这份是下载的还是随包内置的」，合并成一次查找就说不清了。
 */
function findInstalledBinary(spec: ToolSpec): string | null {
  return findBinaryIn(findToolVersionDir(spec), spec)
}

/** 随包那份（完整版内置；开发态是 staging/）；缺它就说明这个工具没内置 */
function findBundledToolBinary(spec: ToolSpec): string | null {
  return findBinaryIn(findBundledRoot(), spec)
}

/**
 * 二进制路径：显式指定 → 运行时那份 → 随包那份；都没有返回 null（调用方给可读的报错）。
 *
 * `explicit` 由调用方从环境变量取（如 opencode 的 `OPENCODE_BINARY`）—— 「哪个变量说了算」
 * 属于各域，这里只管把它的优先级排在最前。
 */
function findToolBinary(key: string, explicit?: string): string | null {
  const spec = findTool(key)
  if (!spec) {
    return null
  }
  return (
    findBinary({
      explicit,
      dirs: [findToolVersionDir(spec), findBundledRoot()],
      names: spec.binaries
    })?.path ?? null
  )
}

function hasTool(key: string): boolean {
  return findToolBinary(key) !== null
}

/**
 * 已经装好的工具目录们，供 corex daemon 拼 PATH。
 *
 * 指令里的 `ffmpeg …` 就是这么找到的：宿主自己不用 ffmpeg，但指令要用；
 * 不把目录递进 PATH，用户就得自己去装一份（版本还不可控）。
 */
function findToolPathEntries(): string[] {
  const entries: string[] = []
  for (const spec of findTools()) {
    if (findInstalledBinary(spec)) {
      entries.push(findToolVersionDir(spec))
    }
  }
  return entries
}

/**
 * 目录体积：递归扫一遍目录树在 Windows 上要跑几十毫秒，而 400 MB 的 ffmpeg 目录
 * 每次 `tool:toRead` 都会重扫（设置页刷新、安装完失效重读）。
 * 目录名里带版本，所以缓存命中即内容不变；安装/卸载时整表清掉即可。
 */
const SIZES = new Map<string, number>()

function findDirBytes(dir: string): number {
  const cached = SIZES.get(dir)
  if (cached !== undefined) {
    return cached
  }

  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += findDirBytes(full)
    } else {
      try {
        total += statSync(full).size
      } catch (error) {
        console.warn('[tools] 统计体积失败', full, error)
      }
    }
  }

  SIZES.set(dir, total)
  return total
}

function findStatus(spec: ToolSpec): ToolStatus {
  const installed = findInstalledBinary(spec)
  if (installed) {
    return {
      key: spec.key,
      label: spec.label,
      summary: spec.summary,
      version: spec.version,
      state: 'installed',
      bytes: findDirBytes(findToolVersionDir(spec)),
      path: installed
    }
  }

  const bundled = findBundledToolBinary(spec)
  if (bundled) {
    return {
      key: spec.key,
      label: spec.label,
      summary: spec.summary,
      version: spec.version,
      state: 'bundled',
      bytes: statSync(bundled).size,
      path: bundled
    }
  }

  return {
    key: spec.key,
    label: spec.label,
    summary: spec.summary,
    version: spec.version,
    state: 'missing',
    bytes: 0,
    path: ''
  }
}

/** 状态表：每个工具都要有一行 —— 当前平台没有在线包也要如实说，而不是从列表里消失 */
function findStatuses(): ToolStatus[] {
  return findTools().map(function (spec) {
    if (!spec.package) {
      return {
        key: spec.key,
        label: spec.label,
        summary: spec.summary,
        version: spec.version,
        state: 'unsupported' as const,
        bytes: 0,
        path: ''
      }
    }
    return findStatus(spec)
  })
}

/** 同一个工具同时只允许一个安装；并发请求给出明确的拒绝，而不是两个进程抢同一个目录 */
const INSTALLING_TOOLS = new Set<string>()

/**
 * 安装（下载 → 校验 → 解压 → 落盘）。
 *
 * 全程在 `<tool>/<version>.tmp` 里做，最后一步才 rename 上位：中途失败、断网、断电都不会
 * 在正式目录里留下半份。已经装好的直接返回（幂等）。
 */
async function installTool(
  key: string,
  onProgress?: (progress: DownloadProgress & { phase: 'download' | 'extract' }) => void
): Promise<void> {
  const spec = findTool(key)
  // 两个「没有」要分开：key 不认识是调用方写错了，本平台没包是客观情况
  if (!spec) {
    throw toToolError(key, 'TOOL_UNKNOWN', '未知工具')
  }
  if (!spec.package) {
    throw toToolError(key, 'TOOL_UNSUPPORTED', '当前平台没有可下载的版本')
  }
  if (findInstalledBinary(spec)) {
    return
  }
  if (INSTALLING_TOOLS.has(spec.key)) {
    throw toToolError(spec.key, 'TOOL_DOWNLOAD_FAILED', '正在下载中')
  }

  INSTALLING_TOOLS.add(spec.key)
  const destDir = findToolVersionDir(spec)
  const workDir = `${destDir}.tmp`
  const url = spec.package.url

  try {
    rmSync(workDir, { recursive: true, force: true })
    mkdirSync(workDir, { recursive: true })

    const archivePath = path.join(workDir, path.basename(new URL(spec.package.url).pathname))
    await download(url, archivePath, function (progress) {
      onProgress?.({ ...progress, phase: 'download' })
    })

    const actual = await hashFile(archivePath)
    if (actual.toLowerCase() !== spec.package.sha256.toLowerCase()) {
      throw new IpcError(
        'TOOL_CHECKSUM_MISMATCH',
        `${spec.key}: 校验不通过（期望 ${spec.package.sha256.slice(0, 12)}…，实际 ${actual.slice(0, 12)}…）`
      )
    }

    onProgress?.({ received: 1, total: 1, phase: 'extract' })
    const extractDir = path.join(workDir, 'extract')
    try {
      extractArchive(archivePath, extractDir)
    } catch (error) {
      // 解压失败是「包坏了/系统没 tar」，不是下载失败 —— 分开报，排查时少走一步
      throw toToolError(
        spec.key,
        'TOOL_EXTRACT_FAILED',
        error instanceof Error ? error.message : String(error)
      )
    }

    const outDir = path.join(workDir, 'out')
    mkdirSync(outDir, { recursive: true })
    let found = 0
    for (const name of findToolBinaryNames(spec)) {
      const source = findFileInTree(extractDir, name)
      if (!source) {
        continue
      }
      const target = path.join(outDir, name)
      cpSync(source, target)
      if (process.platform !== 'win32') {
        chmodSync(target, 0o755)
      }
      found += 1
    }
    if (found === 0) {
      throw new IpcError('TOOL_EXTRACT_FAILED', `${spec.key}: 归档里没找到可执行文件`)
    }

    rmSync(archivePath, { force: true })
    rmSync(extractDir, { recursive: true, force: true })
    rmSync(destDir, { recursive: true, force: true })
    mkdirSync(path.dirname(destDir), { recursive: true })
    renameSync(outDir, destDir)
    SIZES.clear()
  } catch (error) {
    if (error instanceof IpcError) {
      throw error
    }
    throw toToolError(
      spec.key,
      'TOOL_DOWNLOAD_FAILED',
      error instanceof Error ? error.message : String(error)
    )
  } finally {
    rmSync(workDir, { recursive: true, force: true })
    INSTALLING_TOOLS.delete(spec.key)
  }
}

/** 卸载：整个工具目录删掉。正在运行的东西不在这个目录里，删了不影响已启动的进程 */
function removeTool(key: string): void {
  // 只认 key：本平台没在线包也允许卸载本地已装的那份
  if (!isToolKey(key)) {
    throw toToolError(key, 'TOOL_UNKNOWN', '未知工具')
  }
  if (INSTALLING_TOOLS.has(key)) {
    throw toToolError(key, 'TOOL_DOWNLOAD_FAILED', '正在下载中，先等它结束')
  }
  rmSync(path.join(findToolRoot(), key), { recursive: true, force: true })
  SIZES.clear()
}

export {
  findStatuses,
  findToolBinary,
  findToolPathEntries,
  findToolRoot,
  findToolVersionDir,
  hasTool,
  installTool,
  removeTool
}
export type { ToolStatus }
