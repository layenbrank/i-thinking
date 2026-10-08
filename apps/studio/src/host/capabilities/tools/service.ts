import type { DownloadProgress } from './download'
import { findStatuses, installTool, removeTool, type ToolStatus } from './install'

/**
 * 在线工具（pandoc / ffmpeg / opencode）这一域的宿主服务。
 *
 * 薄薄一层：能力都在 `install.ts`（落点 / 下载 / 校验）与 `catalog.ts`（版本与在线源）里，
 * 这里只负责把进度往调用方（窗口）递。
 */

type ToolPhase = 'download' | 'extract'

interface ToolProgress extends DownloadProgress {
  key: string
  phase: ToolPhase
}

class Service {
  findStatuses(): ToolStatus[] {
    return findStatuses()
  }

  install(key: string, onProgress?: (progress: ToolProgress) => void): Promise<void> {
    return installTool(
      key,
      onProgress
        ? function (progress) {
            onProgress({ ...progress, key })
          }
        : undefined
    )
  }

  remove(key: string): void {
    removeTool(key)
  }
}

export { Service }
export type { ToolPhase, ToolProgress, ToolStatus }
