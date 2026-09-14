import { database } from '@/database/database.ts'

/**
 * 首次运行（库里还没有镜像 / 磁贴）时的种子数据。
 *
 * 磁贴只剩 `navigation`：一个指向示例站点的链接。
 */

export const SEED_MIRROR: Mirror = {
  id: 'primary',
  title: '主镜像',
  index: 0,
  mark: '',
  updatedAt: 0,
  createdAt: 0,
  description: '默认镜像',
  background: null,
  backdrop: null,
  overlay: '',
  archivedAt: null
}

function buildSeedTile(mirrorID: string): MagneticTile {
  const now = Date.now()

  return {
    id: crypto.randomUUID(),
    index: 0,
    title: 'GitHub',
    url: 'https://github.com',
    round: '16px',
    mark: null,
    size: 2,
    shape: 'square',
    direction: 'horizontal',
    mirrorID,
    updatedAt: now,
    createdAt: now,
    textColor: '#ffffff',
    component: 'navigation',
    description: '',
    collectionID: null,
    downloadCount: 0,
    background: null,
    backdrop: null,
    archivedAt: null
  }
}

/** 库空时写入种子（镜像 + 一个导航磁贴）；已有数据时不动 */
export async function seedIfEmpty(): Promise<void> {
  const mirrors = await database.mirror.orderBy('index').toArray()
  const [mirror] = mirrors

  if (!mirror) {
    await database.mirror.add(SEED_MIRROR)
    await database.magneticTile.add(buildSeedTile(SEED_MIRROR.id))
    return
  }

  const count = await database.magneticTile.where('mirrorID').equals(mirror.id).count()
  if (count === 0) await database.magneticTile.add(buildSeedTile(mirror.id))
}
