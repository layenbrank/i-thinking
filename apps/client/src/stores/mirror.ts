import { invoke } from '@tauri-apps/api/core'
import { isEmpty } from 'lodash-es'
import type { StateCreator } from 'zustand'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { cloneDeep } from 'lodash-es'

import { BuildMirror } from '@/constants/mirror.ts'

type MirrorWrite = Mirror.Write
type ApplicationWrite = Application.Write
type MirrorUpdate = Mirror.Update
type ApplicationUpdate = Application.Update

export type { ApplicationUpdate, ApplicationWrite, MirrorUpdate, MirrorWrite }

interface MirrorSlice {
  mirrors: Mirror[]
  active: {
    mirror: Mirror | null
    application: Application | null
  }

  toReadMirror: (ID: string) => Promise<Mirror | null>
  toInsertMirror: (values: MirrorWrite[]) => Promise<void>
  toUpdateMirror: (values: MirrorUpdate[]) => Promise<void>
  toRemoveMirror: (keys: string[]) => Promise<void>

  toUpdateMirrors: (mirrors: Mirror[]) => void
  toInitialize: () => Promise<void>
}

interface ApplicationSlice {
  applications: Application[]

  toReadApplication: (ID: string) => Application | null
  toInsertApplication: (values: ApplicationWrite[]) => Promise<void>
  toUpdateApplication: (values: ApplicationUpdate[]) => Promise<void>
  toRemoveApplication: (keys: string[]) => Promise<void>

  toUpdateApplications: (applications: Application[]) => void
}

/** 完整 Store 类型 */
type MirrorStore = MirrorSlice & ApplicationSlice

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
    active: { mirror: null, application: null },

    async toReadMirror(ID: string) {
      const mirror = getters().mirrors.find((m) => m.id === ID) ?? null
      setters(
        (state) => {
          state.active.mirror = mirror
          state.active.application = null
        },
        false,
        'toReadMirror'
      )
      if (mirror?.id) {
        const applications = await invoke<Application[]>('application_read', {
          params: { mirrorID: mirror.id }
        })
        console.log('mirror application', applications)
        getters().toUpdateApplications(
          applications.filter((a) => !a.collectionID).toSorted((a, b) => a.index - b.index)
        )
      }
      return mirror
    },

    async toInsertMirror(values: MirrorWrite[]) {
      const params = values.length === 1 ? values[0] : values
      await invoke('mirror_write', { params })
      const mirrors = await invoke<Mirror[]>('mirror_read', { params: {} })
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))
    },

    async toUpdateMirror(values: MirrorUpdate[]) {
      const params = values.length === 1 ? values[0] : values
      await invoke('mirror_update', { params })
      const mirrors = await invoke<Mirror[]>('mirror_read', { params: {} })
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))
    },

    async toRemoveMirror(keys: string[]) {
      const params = keys.length === 1 ? keys[0] : keys
      await invoke('mirror_remove', { params })
      const mirrors = await invoke<Mirror[]>('mirror_read', { params: {} })
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))
    },

    toUpdateMirrors(mirrors) {
      setters({ mirrors }, false, 'toUpdateMirrors')
    },

    async toInitialize() {
      const { MIRRORS } = BuildMirror()

      let mirrors = await invoke<Mirror[]>('mirror_read', { params: {} })
      if (isEmpty(mirrors)) {
        const writes: MirrorWrite[] = MIRRORS.map((value) => value)
        await invoke('mirror_write', { params: writes })
        mirrors = await invoke<Mirror[]>('mirror_read', { params: {} })
      }
      getters().toUpdateMirrors(mirrors.toSorted((a, b) => a.index - b.index))

      const [first] = mirrors
      if (!first) return

      if (!getters().active.mirror) {
        await getters().toReadMirror(first.id)
      }

      if (isEmpty(getters().applications)) {
        // 用实际入库的 first.id 重新构建，确保 mirrorID 匹配
        const { APPLICATIONS } = BuildMirror({ mirrorID: first.id })
        const writes: ApplicationWrite[] = APPLICATIONS.map((value) => value)
        await invoke('application_write', { params: writes })
        await getters().toReadMirror(first.id)
      }

      const [firstApp] = getters().applications
      if (firstApp && !getters().active.application) {
        getters().toReadApplication(firstApp.id)
      }
    }
  }
}

const applicationSlice: SliceCreator<ApplicationSlice> = function (setters, getters) {
  return {
    applications: [],

    toReadApplication(ID: string) {
      const application = getters().applications.find((v) => v.id === ID) ?? null
      setters(
        (state) => {
          state.active.application = application
        },
        false,
        'toReadApplication'
      )
      return application
    },

    async toInsertApplication(values: ApplicationWrite[]) {
      const mirrorID = getters().active.mirror?.id
      if (!mirrorID) return
      const params = values.length === 1 ? values[0] : values
      await invoke('application_write', { params })
      const applications = await invoke<Application[]>('application_read', { params: { mirrorID } })
      getters().toUpdateApplications(
        applications.filter((a) => !a.collectionID).toSorted((a, b) => a.index - b.index)
      )
    },

    async toUpdateApplication(values: ApplicationUpdate[]) {
      const mirrorID = getters().active.mirror?.id
      if (!mirrorID) return
      const params = values.length === 1 ? values[0] : values
      await invoke('application_update', { params })
      const applications = await invoke<Application[]>('application_read', { params: { mirrorID } })
      getters().toUpdateApplications(
        applications.filter((a) => !a.collectionID).toSorted((a, b) => a.index - b.index)
      )
    },

    async toRemoveApplication(keys: string[]) {
      const mirrorID = getters().active.mirror?.id
      if (!mirrorID) return
      const params = keys.length === 1 ? keys[0] : keys
      await invoke('application_remove', { params })
      const applications = await invoke<Application[]>('application_read', { params: { mirrorID } })
      getters().toUpdateApplications(
        applications.filter((a) => !a.collectionID).toSorted((a, b) => a.index - b.index)
      )
    },

    toUpdateApplications(applications) {
      setters({ applications }, false, 'toUpdateApplications')
    }
  }
}

const useMirrorStore = create<MirrorStore>()(
  devtools(
    immer(function (...args) {
      return {
        ...mirrorSlice(...args),
        ...applicationSlice(...args)
      }
    }),
    {
      name: 'MirrorStore',
      enabled: import.meta.env.DEV
    }
  )
)

export { useMirrorStore }
