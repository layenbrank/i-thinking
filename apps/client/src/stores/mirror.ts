import { invoke } from '@tauri-apps/api/core'
import { isEmpty } from 'lodash-es'
import type { StateCreator } from 'zustand'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

import { BuildMirror } from '@/constants/mirror.ts'

type MirrorWrite = Mirror.Write
type MagneticTileWrite = MagneticTile.Write
type MirrorUpdate = Mirror.Update
type MagneticTileUpdate = MagneticTile.Update

export type { MagneticTileUpdate, MagneticTileWrite, MirrorUpdate, MirrorWrite }

interface MirrorSlice {
  mirrors: Mirror[]
  active: {
    mirror: Mirror | null
    magneticTile: MagneticTile | null
  }

  toReadMirror: (ID: string) => Promise<Mirror | null>
  toInsertMirror: (values: MirrorWrite[]) => Promise<void>
  toUpdateMirror: (values: MirrorUpdate[]) => Promise<void>
  toRemoveMirror: (keys: string[]) => Promise<void>

  toUpdateMirrors: (mirrors: Mirror[]) => void
  toInitialize: () => Promise<void>
}

interface MagneticTileSlice {
  magneticTiles: MagneticTile[]

  toReadMagneticTile: (ID: string) => Promise<MagneticTile | null>
  toInsertMagneticTile: (values: MagneticTileWrite[]) => Promise<void>
  toUpdateMagneticTile: (values: MagneticTileUpdate[]) => Promise<void>
  toRemoveMagneticTile: (keys: string[]) => Promise<void>

  toUpdateMagneticTiles: (magneticTiles: MagneticTile[]) => void
}

/** 完整 Store 类型 */
type MirrorStore = MirrorSlice & MagneticTileSlice

/** 切片创建器类型 */
type SliceCreator<T> = StateCreator<
  MirrorStore,
  [['zustand/devtools', never], ['zustand/immer', never]],
  [],
  T
>

const mirrorSlice: SliceCreator<MirrorSlice> = function (setters, getters) {
  return {
    mirrors: [],
    active: { mirror: null, magneticTile: null },

    async toReadMirror(ID: string) {
      const mirror = getters().mirrors.find((m) => m.id === ID) ?? null
      setters(
        (state) => {
          state.active.mirror = mirror
          state.active.magneticTile = null
        },
        false,
        'toReadMirror'
      )
      if (mirror?.id) {
        const magneticTiles = await invoke<MagneticTile[]>('magnetic-tile:read', {
          params: { mirrorID: mirror.id }
        })
        console.log('mirror magneticTiles', magneticTiles)
        getters().toUpdateMagneticTiles(
          magneticTiles.filter((a) => !a.collectionID).toSorted((a, b) => a.index - b.index)
        )
      }
      return mirror
    },

    async toInsertMirror(values: MirrorWrite[]) {
      const params = values.length === 1 ? values[0] : values
      await invoke('mirror:write', { params })
      const mirrors = await invoke<Mirror[]>('mirror:read', { params: {} })
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))
    },

    async toUpdateMirror(values: MirrorUpdate[]) {
      const params = values.length === 1 ? values[0] : values
      await invoke('mirror:update', { params })
      const mirrors = await invoke<Mirror[]>('mirror:read', { params: {} })
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))
    },

    async toRemoveMirror(keys: string[]) {
      const params = keys.length === 1 ? keys[0] : keys
      await invoke('mirror:remove', { params })
      const mirrors = await invoke<Mirror[]>('mirror:read', { params: {} })
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))
    },

    toUpdateMirrors(mirrors) {
      setters({ mirrors }, false, 'toUpdateMirrors')
    },

    async toInitialize() {
      const { MIRRORS } = BuildMirror()

      let mirrors = await invoke<Mirror[]>('mirror:read', { params: {} })
      if (isEmpty(mirrors)) {
        const writes: MirrorWrite[] = MIRRORS.map((value) => value)
        await invoke('mirror:write', { params: writes })
        mirrors = await invoke<Mirror[]>('mirror:read', { params: {} })
      }
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))

      const [first] = mirrors
      if (!first) return

      if (!getters().active.mirror) {
        await getters().toReadMirror(first.id)
      }

      if (isEmpty(getters().magneticTiles)) {
        // 用实际入库的 first.id 重新构建，确保 mirrorID 匹配
        const { MAGNETIC_TILES } = BuildMirror({ mirrorID: first.id })
        const writes: MagneticTileWrite[] = MAGNETIC_TILES.map((value) => value)
        await invoke('magnetic-tile:write', { params: writes })
        await getters().toReadMirror(first.id)
      }

      const [firstApp] = getters().magneticTiles
      if (firstApp && !getters().active.magneticTile) {
        await getters().toReadMagneticTile(firstApp.id)
      }
    }
  }
}

const magneticTileSlice: SliceCreator<MagneticTileSlice> = function (setters, getters) {
  return {
    magneticTiles: [],

    async toReadMagneticTile(ID: string) {
      const magneticTiles = await invoke<MagneticTile[]>('magnetic-tile:read', {
        params: { id: ID }
      })
      const [magneticTile] = magneticTiles
      setters(
        (state) => {
          state.active.magneticTile = magneticTile ?? null
        },
        false,
        'toReadMagneticTile'
      )
      return magneticTile
    },

    async toInsertMagneticTile(values: MagneticTileWrite[]) {
      const mirrorID = getters().active.mirror?.id
      if (!mirrorID) return
      const params = values.length === 1 ? values[0] : values
      await invoke('magnetic-tile:write', { params })
      await getters().toReadMirror(mirrorID)
    },

    async toUpdateMagneticTile(values: MagneticTileUpdate[]) {
      const mirrorID = getters().active.mirror?.id
      if (!mirrorID) return
      const params = values.length === 1 ? values[0] : values
      await invoke('magnetic-tile:update', { params })
      await getters().toReadMirror(mirrorID)
    },

    async toRemoveMagneticTile(keys: string[]) {
      const mirrorID = getters().active.mirror?.id
      if (!mirrorID) return
      const params = keys.length === 1 ? keys[0] : keys
      await invoke('magnetic-tile:remove', { params })
      await getters().toReadMirror(mirrorID)
    },

    toUpdateMagneticTiles(magneticTiles) {
      setters({ magneticTiles }, false, 'toUpdateMagneticTiles')
    }
  }
}

const useMirrorStore = create<MirrorStore>()(
  devtools(
    immer(function (...args) {
      return {
        ...mirrorSlice(...args),
        ...magneticTileSlice(...args)
      }
    }),
    {
      name: 'MirrorStore',
      enabled: import.meta.env.DEV
    }
  )
)

export { useMirrorStore }
