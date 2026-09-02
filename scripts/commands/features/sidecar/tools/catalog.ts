import { CorexTool } from './corex.ts'
import { FfmpegTool } from './ffmpeg.ts'
import { GooseTool } from './goose.ts'
import { PandocTool } from './pandoc.ts'

import type { ToolStrategy } from './types.ts'

/** Registry: add a tool by importing its strategy and registering here. */
const TOOLS: Record<string, ToolStrategy> = {
  corex: CorexTool,
  ffmpeg: FfmpegTool,
  goose: GooseTool,
  pandoc: PandocTool
}

function findTool(id: string): ToolStrategy {
  const tool = TOOLS[id]
  if (!tool) throw new Error(`[tools] 未知工具: ${id}`)

  return tool
}

export type { ToolStrategy }
export { TOOLS, findTool }
