import { toast } from 'sonner'
import { create } from 'zustand'

/**
 * 镜像桌面与磁贴的运行数据（谁的功能谁维护）。
 *
 * 数据落在主进程 drizzle（`itc.mirror` / `itc.mirror.tile`），这里只缓存当前
 * 视图需要的列表与「活动镜像」指针；增删改一律走主进程，成功后按需重读。
 *
 * 镜像切换 UI 尚未接入（controller 暂用第一个镜像），因此本 store 只暴露
 * 数据读写与顺序持久化，不包含切换视图的编排。
 */

interface MirrorStore {
  mirrors: Mirror[]
  activeMirrorID: string | null
  magneticTiles: MagneticTile[]
  /** 读过一次镜像与磁贴。失败时仍是 `false`，下次进页面会整体重试 */
  loaded: boolean
  /** 正在读，防住同时挂载的多个调用点重复全量重读 */
  isLoading: boolean

  initialize: () => Promise<void>
  toSelectMirror: (id: string) => Promise<void>
  toUpdateTile: (id: string, change: Partial<Omit<MagneticTile, 'id'>>) => Promise<void>
  toRemoveTile: (id: string) => Promise<void>
  /** 拖拽重排：本地已按 ids 排好序的磁贴，持久化每个 index */
  toApplyOrder: (tiles: MagneticTile[]) => Promise<void>
}

function toVisibleTiles(tiles: MagneticTile[]): MagneticTile[] {
  return tiles.filter(function (tile) {
    return !tile.collectionID
  })
}

export const useMirrorStore = create<MirrorStore>(function (setter, getter) {
  async function toSelectMirror(id: string) {
    const tiles = await itc.mirror.tile.toRead({ mirrorID: id })
    setter({
      activeMirrorID: id,
      magneticTiles: toVisibleTiles(tiles)
    })
  }

  return {
    mirrors: [],
    activeMirrorID: null,
    magneticTiles: [],
    loaded: false,
    isLoading: false,

    async initialize() {
      if (getter().loaded || getter().isLoading) return
      setter({ isLoading: true })

      // 两份数据一起拿到才落库：只写进 `mirrors` 就抛的话，`loaded` 会停在 `true`、
      // 磁贴却永远是空的，而早退判定让重试再也不会发生 —— 状态半截比整体失败更难查。
      try {
        const mirrors = await itc.mirror.toRead()
        const [first] = mirrors
        const tiles = first
          ? toVisibleTiles(await itc.mirror.tile.toRead({ mirrorID: first.id }))
          : []
        setter({
          mirrors,
          activeMirrorID: first?.id ?? null,
          magneticTiles: tiles,
          loaded: true,
          isLoading: false
        })
      } catch (error) {
        // 往外抛会变成 unhandled rejection（调用点都是 `void initialize()`）：
        // 这里自己报出来，`loaded` 留在 `false`，下次进页面还能整体重试。
        console.error('[mirror] 初始化失败', error)
        const message = error instanceof Error ? error.message : String(error)
        setter({ isLoading: false })
        toast.error('读取镜像数据失败', { description: message })
      }
    },

    toSelectMirror,

    async toUpdateTile(id, change) {
      await itc.mirror.tile.toUpdate({ id, ...change })

      // index-only（拖拽重排）乐观序已是真相，跳过全量重读避免松手二次抖动
      const keys = Object.keys(change)
      const isIndexOnly =
        keys.length > 0 &&
        keys.every(function (key) {
          return key === 'index'
        })
      if (isIndexOnly) return

      const activeID = getter().activeMirrorID
      if (activeID) {
        await toSelectMirror(activeID)
      }
    },

    async toRemoveTile(id) {
      await itc.mirror.tile.toRemove({ id })

      const activeID = getter().activeMirrorID
      if (activeID) {
        await toSelectMirror(activeID)
      }
    },

    async toApplyOrder(tiles) {
      const normalized = tiles.map(function (tile, index) {
        return { ...tile, index }
      })
      setter({ magneticTiles: normalized })

      try {
        for (const tile of normalized) {
          await itc.mirror.tile.toUpdate({ id: tile.id, index: tile.index })
        }
      } catch (error) {
        // 逐条写入没有事务：中途失败时库里是「一半新序一半旧序」，本地却已经是新序。
        // 保留用户的拖拽结果没意义（它并不存在于库里），重读一次让界面回到真值。
        console.error('[mirror] 持久化磁贴顺序失败', error)
        const message = error instanceof Error ? error.message : String(error)
        toast.error('磁贴顺序没能保存', { description: message })

        const activeID = getter().activeMirrorID
        if (activeID) {
          await toSelectMirror(activeID).catch(function (readError) {
            console.error('[mirror] 重读磁贴顺序失败', readError)
          })
        }
      }
    }
  }
})
