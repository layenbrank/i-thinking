import { z } from 'zod'
import { BrowserWindow, dialog } from 'electron'

import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'
import { CHANNELS } from './channels'

interface Filter {
  name: string
  extensions: string[]
}

interface OpenP {
  multiple?: boolean
  filters?: Filter[]
}

type OpenR = string[] | null

interface SaveP {
  defaultPath?: string
  filters?: Filter[]
}

type SaveR = string | null

const FilterSchema = z.object({
  name: z.string(),
  extensions: z.array(z.string())
})

const OpenSchema = z
  .object({
    multiple: z.boolean().optional(),
    filters: z.array(FilterSchema).optional()
  })
  .optional()

const SaveSchema = z
  .object({
    defaultPath: z.string().optional(),
    filters: z.array(FilterSchema).optional()
  })
  .optional()

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
export { OpenSchema, SaveSchema, Service, buildPlugin }
