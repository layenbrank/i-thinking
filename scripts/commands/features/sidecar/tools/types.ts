interface ToolStrategy {
  id: string
  /** 下载 + 校验 + 解压到缓存 <id>/<platform>/ */
  ensure(platformKey: string): Promise<void>
  /** Absolute paths of files that should be copied into staging */
  findRuntimeFiles(platformKey: string): string[]
}

export type { ToolStrategy }
