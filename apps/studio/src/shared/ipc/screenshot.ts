import { z } from 'zod'

interface CaptureR {
  path: string
  width: number
  height: number
}

/** 截屏 IPC 无业务入参；路径由 Main 生成 */
const CaptureSchema = z.object({}).optional()

export type { CaptureR }
export { CaptureSchema }
