/** Allowed pandoc output formats for convert IPC. */
const OUTPUT_FORMATS = ['markdown', 'html', 'docx', 'pdf', 'plain'] as const

type OutputFormat = (typeof OUTPUT_FORMATS)[number]

const CONVERT_TIMEOUT_MS = 120_000

export type { OutputFormat }
export { CONVERT_TIMEOUT_MS, OUTPUT_FORMATS }
