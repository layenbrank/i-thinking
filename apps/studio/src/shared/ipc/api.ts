import type { CHANNELS, InvokeChannel } from './channels'
import type { ArgsOf, Out, PushOut } from './specs'

/** 一次 invoke 的签名：参数元组与返回类型都由契约推导 */
export type IpcFn<K extends InvokeChannel> = (...args: ArgsOf<K>) => Promise<Out<K>>

export type Unsubscribe = () => void

/** 推送通道在渲染侧的形态：订阅返回退订函数，事件对象一律不外传 */
export type Subscribe<T> = (callback: (payload: T) => void) => Unsubscribe

/**
 * 渲染进程可见的**唯一宿主面**。
 *
 * 嵌套形状是手写的（纯结构），但**每个叶子签名都由契约推导** ——
 * 没有一处手写 DTO。形状不会静默漂移：preload 侧的 `satisfies Api`
 * 会在任何一个键对不上时编译报错。
 */
export interface Api {
  store: {
    toRead: IpcFn<typeof CHANNELS.STORE.READ>
    toWrite: IpcFn<typeof CHANNELS.STORE.WRITE>
    has: IpcFn<typeof CHANNELS.STORE.HAS>
    toRemove: IpcFn<typeof CHANNELS.STORE.REMOVE>
    clear: IpcFn<typeof CHANNELS.STORE.CLEAR>
    keys: IpcFn<typeof CHANNELS.STORE.KEYS>
  }

  dialog: {
    open: IpcFn<typeof CHANNELS.DIALOG.OPEN>
    save: IpcFn<typeof CHANNELS.DIALOG.SAVE>
  }

  user: {
    toRead: IpcFn<typeof CHANNELS.USER.READ>
    toWrite: IpcFn<typeof CHANNELS.USER.WRITE>
    toUpdate: IpcFn<typeof CHANNELS.USER.UPDATE>
    toRemove: IpcFn<typeof CHANNELS.USER.REMOVE>
  }

  sidecar: {
    toRead: IpcFn<typeof CHANNELS.SIDECAR.READ>
    actions: IpcFn<typeof CHANNELS.SIDECAR.ACTIONS>
    directives: IpcFn<typeof CHANNELS.SIDECAR.DIRECTIVES>
    directive: IpcFn<typeof CHANNELS.SIDECAR.DIRECTIVE>
    saveDirective: IpcFn<typeof CHANNELS.SIDECAR.SAVE>
    invoke: IpcFn<typeof CHANNELS.SIDECAR.INVOKE>
    run: IpcFn<typeof CHANNELS.SIDECAR.RUN>
    onProgress: Subscribe<PushOut<typeof CHANNELS.SIDECAR.PROGRESS>>
  }

  doc: {
    convert: IpcFn<typeof CHANNELS.DOC.CONVERT>
  }

  screenshot: {
    capture: IpcFn<typeof CHANNELS.SCREENSHOT.CAPTURE>
  }

  devtools: {
    toUpdate: IpcFn<typeof CHANNELS.DEVTOOLS.UPDATE>
  }

  updater: {
    toRead: IpcFn<typeof CHANNELS.UPDATER.READ>
    check: IpcFn<typeof CHANNELS.UPDATER.CHECK>
    download: IpcFn<typeof CHANNELS.UPDATER.DOWNLOAD>
    install: IpcFn<typeof CHANNELS.UPDATER.INSTALL>
    /** 推送：订阅更新事件 */
    onEvent: Subscribe<PushOut<typeof CHANNELS.UPDATER.EVENT>>
  }

  overlay: {
    toRead: IpcFn<typeof CHANNELS.OVERLAY.READ>
    toUpdate: IpcFn<typeof CHANNELS.OVERLAY.UPDATE>
  }

  mirror: {
    toRead: IpcFn<typeof CHANNELS.MIRROR.READ>
    toWrite: IpcFn<typeof CHANNELS.MIRROR.WRITE>
    toUpdate: IpcFn<typeof CHANNELS.MIRROR.UPDATE>
    toRemove: IpcFn<typeof CHANNELS.MIRROR.REMOVE>
    tile: {
      toRead: IpcFn<typeof CHANNELS.MIRROR.TILE.READ>
      toWrite: IpcFn<typeof CHANNELS.MIRROR.TILE.WRITE>
      toUpdate: IpcFn<typeof CHANNELS.MIRROR.TILE.UPDATE>
      toRemove: IpcFn<typeof CHANNELS.MIRROR.TILE.REMOVE>
    }
  }

  window: {
    /** 开某个按需窗口，键即 shared/windows.ts 的 LAZY_WINDOW_KEYS */
    toOpen: IpcFn<typeof CHANNELS.WINDOW.OPEN>
  }

  workspace: {
    toRead: IpcFn<typeof CHANNELS.WORKSPACE.READ>
    toWrite: IpcFn<typeof CHANNELS.WORKSPACE.WRITE>
    toUpdate: IpcFn<typeof CHANNELS.WORKSPACE.UPDATE>
    toRemove: IpcFn<typeof CHANNELS.WORKSPACE.REMOVE>
    toArchive: IpcFn<typeof CHANNELS.WORKSPACE.ARCHIVE>
    folders: {
      toWrite: IpcFn<typeof CHANNELS.WORKSPACE.FOLDERS.WRITE>
      toUpdate: IpcFn<typeof CHANNELS.WORKSPACE.FOLDERS.UPDATE>
      toRemove: IpcFn<typeof CHANNELS.WORKSPACE.FOLDERS.REMOVE>
    }
    listDir: IpcFn<typeof CHANNELS.WORKSPACE.LIST_DIR>
    search: IpcFn<typeof CHANNELS.WORKSPACE.SEARCH>
    readFile: IpcFn<typeof CHANNELS.WORKSPACE.READ_FILE>
    listSkills: IpcFn<typeof CHANNELS.WORKSPACE.LIST_SKILLS>
    git: {
      probe: IpcFn<typeof CHANNELS.WORKSPACE.GIT.PROBE>
      branches: IpcFn<typeof CHANNELS.WORKSPACE.GIT.BRANCHES>
      checkout: IpcFn<typeof CHANNELS.WORKSPACE.GIT.CHECKOUT>
    }
    changes: {
      toRead: IpcFn<typeof CHANNELS.WORKSPACE.CHANGES.READ>
      toPatch: IpcFn<typeof CHANNELS.WORKSPACE.CHANGES.PATCH>
      toUndo: IpcFn<typeof CHANNELS.WORKSPACE.CHANGES.UNDO>
    }
  }

  chat: {
    provider: {
      toRead: IpcFn<typeof CHANNELS.CHAT.PROVIDER.READ>
      toWrite: IpcFn<typeof CHANNELS.CHAT.PROVIDER.WRITE>
      toUpdate: IpcFn<typeof CHANNELS.CHAT.PROVIDER.UPDATE>
      toRemove: IpcFn<typeof CHANNELS.CHAT.PROVIDER.REMOVE>
    }
    session: {
      toRead: IpcFn<typeof CHANNELS.CHAT.SESSION.READ>
      toWrite: IpcFn<typeof CHANNELS.CHAT.SESSION.WRITE>
      toUpdate: IpcFn<typeof CHANNELS.CHAT.SESSION.UPDATE>
      toRemove: IpcFn<typeof CHANNELS.CHAT.SESSION.REMOVE>
    }
    message: {
      toRead: IpcFn<typeof CHANNELS.CHAT.MESSAGE.READ>
      toAppend: IpcFn<typeof CHANNELS.CHAT.MESSAGE.APPEND>
      toUpdate: IpcFn<typeof CHANNELS.CHAT.MESSAGE.UPDATE>
      toRemove: IpcFn<typeof CHANNELS.CHAT.MESSAGE.REMOVE>
    }
    usage: {
      toRead: IpcFn<typeof CHANNELS.CHAT.USAGE.READ>
    }
  }

  assistant: {
    connect: IpcFn<typeof CHANNELS.ASSISTANT.CONNECT>
    key: {
      toWrite: IpcFn<typeof CHANNELS.ASSISTANT.KEY.WRITE>
      has: IpcFn<typeof CHANNELS.ASSISTANT.KEY.HAS>
      toRemove: IpcFn<typeof CHANNELS.ASSISTANT.KEY.REMOVE>
    }
  }
}
