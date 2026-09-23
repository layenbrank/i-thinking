import { randomUUID } from 'node:crypto'

import { and, asc, eq, isNull, type SQL } from 'drizzle-orm'

import { magneticTile, mirror } from '../../../drizzle/schema'
import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type In, type Out } from '../../shared/ipc/specs'
import { findClient } from './database'

/**
 * 镜像桌面与磁贴的仓储。表结构对齐 client（Tauri）版，数据可互切复用；
 * 时间戳列为毫秒整数（integer 无 mode），读写直接用 number。
 * background / backdrop 落库为 JSON 文本，边界层负责序列化。
 */

type TileReadR = Out<typeof CHANNELS.MIRROR.TILE.READ>[number]
type TileReadP = In<typeof CHANNELS.MIRROR.TILE.READ>
type TileWriteP = In<typeof CHANNELS.MIRROR.TILE.WRITE>
type TileUpdateP = In<typeof CHANNELS.MIRROR.TILE.UPDATE>
type TileRemoveP = In<typeof CHANNELS.MIRROR.TILE.REMOVE>
type MirrorReadR = Out<typeof CHANNELS.MIRROR.READ>[number]
type MirrorReadP = In<typeof CHANNELS.MIRROR.READ>
type MirrorWriteP = In<typeof CHANNELS.MIRROR.WRITE>
type MirrorUpdateP = In<typeof CHANNELS.MIRROR.UPDATE>
type MirrorRemoveP = In<typeof CHANNELS.MIRROR.REMOVE>

function parseSurface(value: string | null): object | null {
  if (!value) return null
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch (error) {
    console.warn('[magnetic-tile] surface JSON 非法，按 null 处理', error)
    return null
  }
}

function serializeSurface(value: object | null | undefined): string | null {
  return value ? JSON.stringify(value) : null
}

function toTile(row: typeof magneticTile.$inferSelect): TileReadR {
  return {
    id: row.id,
    index: row.index,
    title: row.title,
    url: row.url,
    round: row.round,
    mark: row.mark,
    size: row.size as TileReadR['size'],
    shape: row.shape,
    direction: row.direction,
    mirrorID: row.mirrorID,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    textColor: row.textColor,
    component: row.component as TileReadR['component'],
    description: row.description ?? '',
    collectionID: row.collectionID,
    downloadCount: row.downloadCount,
    background: parseSurface(row.background) as TileReadR['background'],
    backdrop: parseSurface(row.backdrop) as TileReadR['backdrop'],
    archivedAt: row.archivedAt
  }
}

function toMirror(row: typeof mirror.$inferSelect): MirrorReadR {
  return {
    id: row.id,
    title: row.title,
    index: row.index,
    mark: row.mark,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    description: row.description,
    background: parseSurface(row.background) as MirrorReadR['background'],
    backdrop: parseSurface(row.backdrop) as MirrorReadR['backdrop'],
    overlay: row.overlay,
    archivedAt: row.archivedAt
  }
}

function buildTileWhere(filter: TileReadP) {
  if (!filter) return undefined
  const conditions: SQL[] = []
  if (filter.id !== undefined) conditions.push(eq(magneticTile.id, filter.id))
  if (filter.title !== undefined) conditions.push(eq(magneticTile.title, filter.title))
  if (filter.url !== undefined) {
    // SQL 语义：NULL != NULL；drizzle eq 不接 null，null 过滤改用 isNull
    conditions.push(
      filter.url === null ? isNull(magneticTile.url) : eq(magneticTile.url, filter.url)
    )
  }
  if (filter.description !== undefined)
    conditions.push(eq(magneticTile.description, filter.description))
  if (filter.mirrorID !== undefined) conditions.push(eq(magneticTile.mirrorID, filter.mirrorID))
  if (filter.downloadCount !== undefined)
    conditions.push(eq(magneticTile.downloadCount, filter.downloadCount))
  if (filter.size !== undefined) conditions.push(eq(magneticTile.size, filter.size))
  if (filter.shape !== undefined) conditions.push(eq(magneticTile.shape, filter.shape))
  if (filter.direction !== undefined) conditions.push(eq(magneticTile.direction, filter.direction))
  if (filter.updatedAt !== undefined) conditions.push(eq(magneticTile.updatedAt, filter.updatedAt))
  if (filter.collectionID !== undefined) {
    conditions.push(
      filter.collectionID === null
        ? isNull(magneticTile.collectionID)
        : eq(magneticTile.collectionID, filter.collectionID)
    )
  }
  if (conditions.length === 0) return undefined
  return and(...conditions)
}

function buildMirrorWhere(filter: MirrorReadP) {
  if (!filter) return undefined
  const conditions: SQL[] = []
  if (filter.id !== undefined) conditions.push(eq(mirror.id, filter.id))
  if (filter.title !== undefined) conditions.push(eq(mirror.title, filter.title))
  if (filter.mark !== undefined) conditions.push(eq(mirror.mark, filter.mark))
  if (conditions.length === 0) return undefined
  return and(...conditions)
}

async function requireTile(id: string): Promise<TileReadR> {
  const rows = await findClient()
    .select()
    .from(magneticTile)
    .where(eq(magneticTile.id, id))
    .limit(1)
  const [row] = rows
  if (!row) {
    throw new IpcError('MAGNETIC_TILE_NOT_FOUND', `磁贴不存在: ${id}`)
  }
  return toTile(row)
}

async function requireMirror(id: string): Promise<MirrorReadR> {
  const rows = await findClient().select().from(mirror).where(eq(mirror.id, id)).limit(1)
  const [row] = rows
  if (!row) {
    throw new IpcError('MIRROR_NOT_FOUND', `镜像不存在: ${id}`)
  }
  return toMirror(row)
}

class MagneticTileService {
  async toRead(filter?: TileReadP): Promise<TileReadR[]> {
    const db = findClient()
    const where = buildTileWhere(filter)
    const rows = where
      ? await db.select().from(magneticTile).where(where).orderBy(asc(magneticTile.index))
      : await db.select().from(magneticTile).orderBy(asc(magneticTile.index))
    return rows.map(toTile)
  }

  async toWrite(input: TileWriteP): Promise<TileReadR> {
    const db = findClient()
    const now = Date.now()
    const id = randomUUID()
    await db.insert(magneticTile).values({
      id,
      index: input.index,
      title: input.title,
      url: input.url,
      round: input.round,
      mark: input.mark,
      size: input.size,
      shape: input.shape,
      direction: input.direction,
      mirrorID: input.mirrorID,
      textColor: input.textColor,
      component: input.component,
      description: input.description,
      collectionID: input.collectionID,
      background: serializeSurface(input.background),
      backdrop: serializeSurface(input.backdrop),
      downloadCount: 0,
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    })
    return requireTile(id)
  }

  async toUpdate(input: TileUpdateP): Promise<TileReadR> {
    const db = findClient()
    await db
      .update(magneticTile)
      .set({
        ...(input.index !== undefined ? { index: input.index } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.url !== undefined ? { url: input.url } : {}),
        ...(input.round !== undefined ? { round: input.round } : {}),
        ...(input.mark !== undefined ? { mark: input.mark } : {}),
        ...(input.size !== undefined ? { size: input.size } : {}),
        ...(input.shape !== undefined ? { shape: input.shape } : {}),
        ...(input.direction !== undefined ? { direction: input.direction } : {}),
        ...(input.mirrorID !== undefined ? { mirrorID: input.mirrorID } : {}),
        ...(input.textColor !== undefined ? { textColor: input.textColor } : {}),
        ...(input.component !== undefined ? { component: input.component } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.collectionID !== undefined ? { collectionID: input.collectionID } : {}),
        ...(input.downloadCount !== undefined ? { downloadCount: input.downloadCount } : {}),
        ...(input.background !== undefined
          ? { background: serializeSurface(input.background) }
          : {}),
        ...(input.backdrop !== undefined ? { backdrop: serializeSurface(input.backdrop) } : {}),
        ...(input.archivedAt !== undefined ? { archivedAt: input.archivedAt } : {}),
        updatedAt: Date.now()
      })
      .where(eq(magneticTile.id, input.id))
    return requireTile(input.id)
  }

  async toRemove(input: TileRemoveP): Promise<void> {
    const rows = await findClient()
      .delete(magneticTile)
      .where(eq(magneticTile.id, input.id))
      .returning()
    if (rows.length === 0) {
      throw new IpcError('MAGNETIC_TILE_NOT_FOUND', `磁贴不存在: ${input.id}`)
    }
  }
}

class MirrorService {
  async toRead(filter?: MirrorReadP): Promise<MirrorReadR[]> {
    const db = findClient()
    const where = buildMirrorWhere(filter)
    const rows = where
      ? await db.select().from(mirror).where(where).orderBy(asc(mirror.index))
      : await db.select().from(mirror).orderBy(asc(mirror.index))
    return rows.map(toMirror)
  }

  async toWrite(input: MirrorWriteP): Promise<MirrorReadR> {
    const db = findClient()
    const now = Date.now()
    const id = randomUUID()
    await db.insert(mirror).values({
      id,
      title: input.title,
      index: input.index,
      mark: input.mark,
      description: input.description,
      overlay: input.overlay,
      background: serializeSurface(input.background),
      backdrop: serializeSurface(input.backdrop),
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    })
    return requireMirror(id)
  }

  async toUpdate(input: MirrorUpdateP): Promise<MirrorReadR> {
    const db = findClient()
    await db
      .update(mirror)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.index !== undefined ? { index: input.index } : {}),
        ...(input.mark !== undefined ? { mark: input.mark } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.background !== undefined
          ? { background: serializeSurface(input.background) }
          : {}),
        ...(input.backdrop !== undefined ? { backdrop: serializeSurface(input.backdrop) } : {}),
        ...(input.overlay !== undefined ? { overlay: input.overlay } : {}),
        updatedAt: Date.now()
      })
      .where(eq(mirror.id, input.id))
    return requireMirror(input.id)
  }

  async toRemove(input: MirrorRemoveP): Promise<void> {
    const rows = await findClient().delete(mirror).where(eq(mirror.id, input.id)).returning()
    if (rows.length === 0) {
      throw new IpcError('MIRROR_NOT_FOUND', `镜像不存在: ${input.id}`)
    }
  }
}

export { MagneticTileService, MirrorService }
