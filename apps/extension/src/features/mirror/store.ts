import { liveQuery } from 'dexie'
import { create } from 'zustand'

import { database } from '@/database/database.ts'
import { seedIfEmpty } from '@/features/mirror/seed.ts'

/**
 * 镜像 / 磁贴的 React 状态源（替换原 Pinia 的 `stores/mirror.ts`）。
 *
 * Dexie 的 `liveQuery` 负责把库里的变化推回来；这里只做「订阅一次 + 增删改」，
 * 不再维护 Pinia / vueuse 那套响应式。
 */

/** 新增/编辑磁贴时用到的表单字段 */
export interface MagneticTileInput {
  title: string
  url: string
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
}

interface MirrorState {
  isReady: boolean
  mirror: Mirror | null
  tiles: MagneticTile[]
  initialize: () => void
  toAppendTile: (input: MagneticTileInput) => Promise<void>
  toUpdateTile: (id: string, input: MagneticTileInput) => Promise<void>
  toRemoveTile: (id: string) => Promise<void>
}

let subscriptionReady = false

export const useMirrorStore = create<MirrorState>(function (set, getter) {
  function findByMirror(mirrorID: string) {
    return liveQuery(function () {
      return database.magneticTile.where('mirrorID').equals(mirrorID).sortBy('index')
    })
  }

  return {
    isReady: false,
    mirror: null,
    tiles: [],

    initialize() {
      if (subscriptionReady) return
      subscriptionReady = true

      void seedIfEmpty()

      liveQuery(function () {
        return database.mirror.orderBy('index').toArray()
      }).subscribe({
        next: function (mirrors) {
          const [mirror] = mirrors
          set({ mirror: mirror ?? null, isReady: Boolean(mirror) })

          if (mirror) {
            findByMirror(mirror.id).subscribe({
              next: function (tiles) {
                set({ tiles: tiles.filter(function (tile) { return !tile.archivedAt }) })
              }
            })
          }
        },
        error: function (error) {
          console.error('[mirror] 订阅镜像失败', error)
        }
      })
    },

    async toAppendTile(input) {
      const { mirror, tiles } = getter()
      if (!mirror) return

      const now = Date.now()

      await database.magneticTile.add({
        id: crypto.randomUUID(),
        index: tiles.length,
        title: input.title,
        url: input.url,
        round: '16px',
        mark: null,
        size: input.size,
        shape: input.shape,
        direction: input.direction,
        mirrorID: mirror.id,
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
      })
    },

    async toUpdateTile(id, input) {
      await database.magneticTile.update(id, {
        title: input.title,
        url: input.url,
        size: input.size,
        shape: input.shape,
        direction: input.direction,
        updatedAt: Date.now()
      })
    },

    async toRemoveTile(id) {
      await database.magneticTile.delete(id)
    }
  }
})
