import { z } from 'zod'

/** Allowed pandoc output formats for convert IPC. */
const OUTPUT_FORMATS = ['markdown', 'html', 'docx', 'pdf', 'plain'] as const

type OutputFormat = (typeof OUTPUT_FORMATS)[number]

interface ConvertP {
  inputPath: string
  outputPath: string
  format: OutputFormat
}

interface ConvertR {
  outputPath: string
  format: OutputFormat
}

const ConvertSchema = z.object({
  inputPath: z.string().min(1).max(4096),
  outputPath: z.string().min(1).max(4096),
  format: z.enum(OUTPUT_FORMATS)
})

export type { ConvertP, ConvertR, OutputFormat }
export { ConvertSchema, OUTPUT_FORMATS }
