import { z } from 'zod'

import type { ChannelOfDomain } from '../channels'
import { CHANNELS } from '../channels'
import type { ChannelSpec } from '../spec'

const FilterSchema = z.object({
  name: z.string(),
  extensions: z.array(z.string())
})

const OpenSchema = z
  .object({
    multiple: z.boolean().optional(),
    /** true = 选目录（工作区根），false/省略 = 选文件 */
    directory: z.boolean().optional(),
    filters: z.array(FilterSchema).optional()
  })
  .optional()

const SaveSchema = z
  .object({
    defaultPath: z.string().optional(),
    filters: z.array(FilterSchema).optional()
  })
  .optional()

export const dialogSpecs = {
  [CHANNELS.DIALOG.OPEN]: { in: OpenSchema, out: z.array(z.string()).nullable() },
  [CHANNELS.DIALOG.SAVE]: { in: SaveSchema, out: z.string().nullable() }
} as const satisfies Record<ChannelOfDomain<'dialog'>, ChannelSpec>

type Filter = z.infer<typeof FilterSchema>

export { FilterSchema, OpenSchema, SaveSchema }
export type { Filter }
