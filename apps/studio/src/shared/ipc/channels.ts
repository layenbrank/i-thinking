/**
 * IPC channel 单源；格式 namespace:action，按域分层。
 *
 * 本模块（以及整个 `src/shared/**`）**框架无关**：禁止 import `electron`、`node:*`、DOM。
 * 它被主进程、preload、渲染进程三端同时引入，任何运行时依赖都会被带进渲染包。
 */
export const CHANNELS = {
  STORE: {
    READ: 'store:toRead',
    WRITE: 'store:toWrite',
    HAS: 'store:has',
    REMOVE: 'store:toRemove',
    CLEAR: 'store:clear',
    KEYS: 'store:keys'
  },
  DIALOG: {
    OPEN: 'dialog:open',
    SAVE: 'dialog:save'
  },
  USER: {
    READ: 'user:toRead',
    WRITE: 'user:toWrite',
    UPDATE: 'user:toUpdate',
    REMOVE: 'user:toRemove'
  },
  SIDECAR: {
    READ: 'sidecar:toRead',
    ACTIONS: 'sidecar:actions',
    DIRECTIVES: 'sidecar:directives',
    DIRECTIVE: 'sidecar:directive',
    SAVE: 'sidecar:saveDirective',
    INVOKE: 'sidecar:invoke',
    RUN: 'sidecar:run',
    PROGRESS: 'sidecar:progress'
  },
  DOC: {
    CONVERT: 'doc:convert'
  },
  SCREENSHOT: {
    CAPTURE: 'screenshot:capture'
  },
  DEVTOOLS: {
    UPDATE: 'devtools:toUpdate'
  },
  UPDATER: {
    READ: 'updater:toRead',
    CHECK: 'updater:check',
    DOWNLOAD: 'updater:download',
    INSTALL: 'updater:install',
    EVENT: 'updater:event'
  },
  OVERLAY: {
    READ: 'overlay:toRead',
    UPDATE: 'overlay:toUpdate'
  },
  MIRROR: {
    READ: 'mirror:toRead',
    WRITE: 'mirror:toWrite',
    UPDATE: 'mirror:toUpdate',
    REMOVE: 'mirror:toRemove',
    TILE: {
      READ: 'mirror:tile.toRead',
      WRITE: 'mirror:tile.toWrite',
      UPDATE: 'mirror:tile.toUpdate',
      REMOVE: 'mirror:tile.toRemove'
    }
  },
  WINDOW: {
    /** 开一个按需窗口；窗口键见 shared/windows.ts，新增窗口不需要新频道 */
    OPEN: 'window:toOpen'
  },
  WORKSPACE: {
    READ: 'workspace:toRead',
    WRITE: 'workspace:toWrite',
    UPDATE: 'workspace:toUpdate',
    REMOVE: 'workspace:toRemove',
    ARCHIVE: 'workspace:toArchive',
    FOLDERS: {
      WRITE: 'workspace:folders.toWrite',
      UPDATE: 'workspace:folders.toUpdate',
      REMOVE: 'workspace:folders.toRemove'
    },
    LIST_DIR: 'workspace:listDir',
    SEARCH: 'workspace:search',
    READ_FILE: 'workspace:readFile',
    LIST_SKILLS: 'workspace:listSkills',
    GIT: {
      PROBE: 'workspace:git.probe',
      BRANCHES: 'workspace:git.branches',
      CHECKOUT: 'workspace:git.checkout'
    },
    CHANGES: {
      READ: 'workspace:changes.toRead',
      PATCH: 'workspace:changes.toPatch',
      UNDO: 'workspace:changes.toUndo'
    }
  },
  CHAT: {
    PROVIDER: {
      READ: 'chat:provider.toRead',
      WRITE: 'chat:provider.toWrite',
      UPDATE: 'chat:provider.toUpdate',
      REMOVE: 'chat:provider.toRemove'
    },
    SESSION: {
      READ: 'chat:session.toRead',
      WRITE: 'chat:session.toWrite',
      UPDATE: 'chat:session.toUpdate',
      REMOVE: 'chat:session.toRemove'
    },
    MESSAGE: {
      READ: 'chat:message.toRead',
      APPEND: 'chat:message.toAppend',
      UPDATE: 'chat:message.toUpdate',
      REMOVE: 'chat:message.toRemove'
    },
    USAGE: {
      /** 用量账本聚合（本会话累计 / 今日合计） */
      READ: 'chat:usage.toRead'
    }
  },
  ASSISTANT: {
    /** 建立 agent 运行时端口（MessagePort，见 host/capabilities/assistant.ts） */
    CONNECT: 'assistant:connect',
    /** 主进程 → 渲染进程推送端口；不是 invoke 通道 */
    PORT: 'assistant:port',
    KEY: {
      WRITE: 'assistant:key.toWrite',
      HAS: 'assistant:key.has',
      REMOVE: 'assistant:key.toRemove'
    }
  }
} as const

type NestedValue<T> = T extends string
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]: NestedValue<T[K]> }[keyof T]
    : never

/** 全部频道的扁平联合 */
export type Channel = NestedValue<typeof CHANNELS>

/** 顶层域名的小写形式，即渲染侧 API 的命名空间：STORE → 'store' */
export type Domain = Lowercase<keyof typeof CHANNELS>

/** 某个域下的全部频道 */
export type ChannelOfDomain<D extends Domain> = NestedValue<
  (typeof CHANNELS)[Extract<Uppercase<D>, keyof typeof CHANNELS>]
>

/** 主进程 → 渲染进程的推送通道；不走 invoke，渲染侧以 subscribe 形态暴露 */
export const PUSH_CHANNELS = [
  CHANNELS.ASSISTANT.PORT,
  CHANNELS.UPDATER.EVENT,
  CHANNELS.SIDECAR.PROGRESS
] as const

export type PushChannel = (typeof PUSH_CHANNELS)[number]

/** invoke 通道 = 全部频道去掉推送通道 */
export type InvokeChannel = Exclude<Channel, PushChannel>

function walk(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    out.push(node)
    return
  }
  if (node !== null && typeof node === 'object') {
    for (const value of Object.values(node as Record<string, unknown>)) walk(value, out)
  }
}

/**
 * 运行时展平出全部频道。
 * 启动期断言与测试用 —— 类型层已由 `Channel` 保证，这里给的是可断言的运行时事实。
 */
export function flattenChannels(source: unknown = CHANNELS): Channel[] {
  const out: string[] = []
  walk(source, out)
  return out as Channel[]
}

const PUSH_SET: readonly string[] = PUSH_CHANNELS

/** 全部 invoke 通道，稳定排序；`registerAll` 的遍历源 */
export const INVOKE_CHANNELS: readonly InvokeChannel[] = flattenChannels()
  .filter(function (channel: Channel): channel is InvokeChannel {
    return !PUSH_SET.includes(channel)
  })
  .sort()
