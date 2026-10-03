import { z } from 'zod'

import type { ChannelOfDomain } from '../channels'
import { CHANNELS } from '../channels'
import type { ChannelSpec } from '../spec'

/** 完整资产行（对齐 drizzle `asset` / client entity） */
const Asset = z.object({
  id: z.string(),
  tenantID: z.string().nullable(),
  kind: z.string().nullable(),
  hash: z.string().nullable(),
  sha: z.string(),
  size: z.number().int().nullable(),
  index: z.number().int(),
  mime: z.string(),
  extension: z.string().nullable(),
  fileName: z.string(),
  filePath: z.string(),
  metadata: z.string().nullable(),
  status: z.string(),
  version: z.number().int(),
  deviceID: z.string().nullable(),
  archivedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number()
})

const AssetRead = z
  .object({
    id: z.string().optional(),
    kind: z.string().optional(),
    hash: z.string().optional(),
    mime: z.string().optional(),
    status: z.string().optional(),
    tenantID: z.string().optional(),
    filePath: z.string().optional()
  })
  .optional()

/** insert 体：id / 时间戳由主进程生成；可空字段对齐 client pinTexture */
const AssetWrite = z.object({
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mime: z.string().min(1),
  kind: z.string().nullable().optional(),
  hash: z.string().nullable().optional(),
  sha: z.string().nullable().optional(),
  size: z.number().int().nullable().optional(),
  index: z.number().int().nullable().optional(),
  extension: z.string().nullable().optional(),
  metadata: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  version: z.number().int().nullable().optional(),
  deviceID: z.string().nullable().optional(),
  archivedAt: z.number().nullable().optional(),
  tenantID: z.string().nullable().optional()
})

const AssetUpdate = AssetWrite.partial().extend({
  id: z.string()
})

const AssetRemove = z.object({ id: z.string() })

const AssetPin = z.object({
  dataUrl: z.string().min(1)
})

const AssetPinResult = z.object({
  id: z.string(),
  filePath: z.string(),
  fileName: z.string(),
  size: z.number().int()
})

const AssetExport = z.object({
  dataUrl: z.string().min(1),
  filePath: z.string().min(1)
})

export const assetSpecs = {
  [CHANNELS.ASSET.READ]: { in: AssetRead, out: z.array(Asset) },
  [CHANNELS.ASSET.WRITE]: { in: AssetWrite, out: Asset },
  [CHANNELS.ASSET.UPDATE]: { in: AssetUpdate, out: Asset },
  [CHANNELS.ASSET.REMOVE]: { in: AssetRemove, out: z.void() },
  [CHANNELS.ASSET.PIN]: { in: AssetPin, out: AssetPinResult },
  [CHANNELS.ASSET.EXPORT]: { in: AssetExport, out: z.void() }
} as const satisfies Record<ChannelOfDomain<'asset'>, ChannelSpec>
