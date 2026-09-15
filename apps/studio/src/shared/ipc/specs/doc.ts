import { z } from 'zod'

import { CHANNELS } from '../channels'
import type { ChannelOfDomain } from '../channels'
import type { ChannelSpec } from '../spec'

/** pandoc 允许的输出格式 */
const OUTPUT_FORMATS = ['markdown', 'html', 'docx', 'pdf', 'plain'] as const

type OutputFormat = (typeof OUTPUT_FORMATS)[number]

const ConvertSchema = z.object({
  inputPath: z.string().min(1).max(4096),
  outputPath: z.string().min(1).max(4096),
  format: z.enum(OUTPUT_FORMATS)
})

export const docSpecs = {
  [CHANNELS.DOC.CONVERT]: {
    in: ConvertSchema,
    out: z.object({ outputPath: z.string(), format: z.enum(OUTPUT_FORMATS) })
  }
} as const satisfies Record<ChannelOfDomain<'doc'>, ChannelSpec>

export { ConvertSchema, OUTPUT_FORMATS }
export type { OutputFormat }
