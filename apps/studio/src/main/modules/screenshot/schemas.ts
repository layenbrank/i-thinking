import { z } from 'zod'

type CaptureResult = {
  path: string
  width: number
  height: number
}

type RecordStopResult = {
  path: string
  frameCount: number
  durationMs: number
}

/** 截屏/录屏 IPC 无业务入参；路径由 Main 生成 */
const captureSchema = z.object({}).optional()
const recordSchema = z.object({}).optional()

export type { CaptureResult, RecordStopResult }
export { captureSchema, recordSchema }
