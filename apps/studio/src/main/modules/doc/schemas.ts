import { z } from 'zod'

import { OUTPUT_FORMATS, type OutputFormat } from './constants'

interface ConvertInput {
  inputPath: string
  outputPath: string
  format: OutputFormat
}

interface ConvertResult {
  outputPath: string
  format: OutputFormat
}

const convertSchema = z.object({
  inputPath: z.string().min(1).max(4096),
  outputPath: z.string().min(1).max(4096),
  format: z.enum(OUTPUT_FORMATS)
})

export type { ConvertInput, ConvertResult }
export { convertSchema }
