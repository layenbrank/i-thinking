import { CorexTool } from './corex.ts'
import { FfmpegTool } from './ffmpeg.ts'
import { GooseTool } from './goose.ts'
import { OpencodeTool } from './opencode.ts'
import { PandocTool } from './pandoc.ts'

import type { ToolStrategy } from './types.ts'

/** Registry: add a tool by importing its strategy and registering here. */
const TOOLS: Record<string, ToolStrategy> = {
  corex: CorexTool,
  ffmpeg: FfmpegTool,
  goose: GooseTool,
  opencode: OpencodeTool,
  pandoc: PandocTool
}

function findTool(key: string): ToolStrategy {
  const tool = TOOLS[key]
  if (!tool) throw new Error(`[tools] 未知工具: ${key}`)

  return tool
}

export type { ToolStrategy }
export { TOOLS, findTool }
