import manifestJson from '@manifest'
import type { ToolKey } from '@/shared/ipc/specs/tools'
import { TOOL_KEYS, ToolKeySchema } from '@/shared/ipc/specs/tools'
import { findBinaryName, findPlatformKey } from '@/host/framework/binaries'

/**
 * 在线工具（pandoc / ffmpeg / opencode）：**数据在 `sidecar/manifest.json`，本文件只做类型与取值**。
 *
 * 表放 JSON 而不是写在这里，是为了让**两个消费方读同一份**：
 * - 宿主（这个文件）：构建期把 JSON 内联进 main bundle，运行时不读文件；
 * - 仓库 CLI（`pnpm command sidecar manifest`）：发新包后照着它核对 R2 上的东西对不对。
 *
 * 与 `tools.lock.json` 的关系：那份钉的是**完整版落盘**用的归档 —— pandoc / opencode 用
 * GitHub 原包，ffmpeg(win32) 与这份**同一条 R2 制品**；这份一律是 R2 上的重打包包
 * （可执行文件平铺在包根）。两条通路来源不同，所以哈希不逐字镜像 —— 但**版本是同一条线**：
 * opencode 必须与 lock 一致（与 `@opencode/client` 强耦合，漂了症状是协议对不上），
 * pandoc / ffmpeg(win32) 同理，`catalog.test.ts` 守着。
 *
 * 加一个平台 / 换一个包：改 `manifest.json` 即可，代码不用动。
 */

/** manifest.json 里一个工具的静态描述：与平台无关 */
interface ToolInfo {
  label: string
  summary: string
  version: string
  /** 归档里要留下的文件名（不带扩展名，按平台补 .exe；归档里没有的跳过） */
  binaries: string[]
  /** 各平台的在线包；没有该平台的键 = 当前平台没有下载源 */
  packages: Record<string, ToolPackage>
}

/** 在线包：直链 + 哈希 */
interface ToolPackage {
  url: string
  sha256: string
}

/** 静态描述 + 当前平台的包（没有包时为 null） */
interface ToolSpec extends ToolInfo {
  key: ToolKey
  package: ToolPackage | null
}

interface Manifest {
  schemaVersion: number
  tools: Record<string, ToolInfo>
}

function parseManifest(raw: unknown): Manifest {
  const doc = raw as Partial<Manifest>
  if (doc.schemaVersion !== 1 || !doc.tools) {
    throw new Error('[tools] sidecar/manifest.json 形状不对（期望 schemaVersion: 1 + tools）')
  }
  return { schemaVersion: 1, tools: doc.tools }
}

const MANIFEST = parseManifest(manifestJson)

function isToolKey(key: string): key is ToolKey {
  return ToolKeySchema.safeParse(key).success
}

/** 全部工具（含当前平台没有在线包的那些：界面要如实说明，而不是让它们从列表里消失） */
function findTools(platformKey = findPlatformKey()): ToolSpec[] {
  return TOOL_KEYS.map(function (key) {
    const info = MANIFEST.tools[key] as ToolInfo | undefined
    if (!info) {
      throw new Error(`[tools] manifest.json 里没有 ${key}`)
    }
    return { key, ...info, package: info.packages[platformKey] ?? null }
  })
}

function findTool(key: string, platformKey = findPlatformKey()): ToolSpec | null {
  if (!isToolKey(key)) {
    return null
  }
  const info = MANIFEST.tools[key] as ToolInfo | undefined
  if (!info) {
    return null
  }
  return { key, ...info, package: info.packages[platformKey] ?? null }
}

/** 这个工具在当前平台要不要 .exe */
function findToolBinaryNames(spec: ToolSpec, platform = process.platform): string[] {
  return spec.binaries.map(function (name) {
    return findBinaryName(name, platform)
  })
}

export { findTool, findToolBinaryNames, findTools, isToolKey }
export type { ToolInfo, ToolKey, ToolPackage, ToolSpec }
