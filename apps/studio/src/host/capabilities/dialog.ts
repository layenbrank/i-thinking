import { BrowserWindow, dialog } from 'electron'

import type { Context } from '../framework/context'
import { registerHandler } from '../framework/handle'
import type { Plugin } from '../framework/module'
import { CHANNELS } from '../../shared/ipc/channels'
import { OpenSchema, SaveSchema } from '../../shared/ipc/specs/dialog'
import type { Filter } from '../../shared/ipc/specs/dialog'
import type { In, Out } from '../../shared/ipc/specs'

type OpenP = In<typeof CHANNELS.DIALOG.OPEN>
type OpenR = Out<typeof CHANNELS.DIALOG.OPEN>
type SaveP = In<typeof CHANNELS.DIALOG.SAVE>
type SaveR = Out<typeof CHANNELS.DIALOG.SAVE>

class Service {
  private readonly findWindow: () => BrowserWindow | null

  constructor(findWindow: () => BrowserWindow | null) {
    this.findWindow = findWindow
  }

  async open(options?: OpenP): Promise<string[] | null> {
    const w = BrowserWindow.getFocusedWindow() ?? this.findWindow()
    const result = w
      ? await dialog.showOpenDialog(w, {
          properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
          filters: options?.filters
        })
      : await dialog.showOpenDialog({
          properties: options?.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
          filters: options?.filters
        })
    return result.canceled ? null : result.filePaths
  }

  async save(options?: SaveP): Promise<string | null> {
    const w = BrowserWindow.getFocusedWindow() ?? this.findWindow()
    const result = w
      ? await dialog.showSaveDialog(w, {
          defaultPath: options?.defaultPath,
          filters: options?.filters
        })
      : await dialog.showSaveDialog({
          defaultPath: options?.defaultPath,
          filters: options?.filters
        })
    return result.canceled ? null : (result.filePath ?? null)
  }
}

function buildPlugin(): Plugin {
  return {
    name: 'dialog',
    register(ctx: Context) {
      const service = new Service(function () {
        return ctx.toReadWindow()
      })
      registerHandler(ctx, CHANNELS.DIALOG.OPEN, OpenSchema, function (input) {
        return service.open(input)
      })
      registerHandler(ctx, CHANNELS.DIALOG.SAVE, SaveSchema, function (input) {
        return service.save(input)
      })
      ctx.logger.child('dialog').info('registered')
    }
  }
}

export type { Filter, OpenP, OpenR, SaveP, SaveR }
export { Service, buildPlugin }
// 临时 re-export：specs 批次收尾时移除
export { OpenSchema, SaveSchema } from '../../shared/ipc/specs/dialog'
