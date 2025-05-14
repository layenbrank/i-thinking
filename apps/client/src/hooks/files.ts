import { open as showOpenDialog, type OpenDialogOptions } from '@tauri-apps/plugin-dialog'
import {
  exists,
  BaseDirectory,
  open,
  readDir,
  readFile,
  watch,
  type DirEntry
} from '@tauri-apps/plugin-fs'
import { desktopDir, resolve, dirname, join } from '@tauri-apps/api/path'
import { message } from 'ant-design-vue'

export function useDirs() {
  const dirPath = ref<string>('')
  const dirPaths = ref<string[]>([])
  const filePaths = ref<string[]>([])

  async function showDirDialog() {
    try {
      const path = await showOpenDialog({ directory: true, multiple: false })
      if (!path) return null
      dirPath.value = path
      return path
    } catch (error) {
      message.error(`选择目录失败: ${error}`)
      return null
    }
  }

  /**
   * @description 递归获取目录下所有文件夹和文件路径
   * @param path
   * @returns
   */
  async function recursionDirs(path: string) {
    if (!path) return

    const dirs = [path]

    while (dirs.length) {
      const dir = dirs.pop()
      if (!dir) continue

      const dirEntry = await readDir(dir)

      for (const entry of dirEntry) {
        if (!entry.isDirectory) continue
        const fullPath = await resolve(dir, entry.name)
        dirPaths.value.push(fullPath)
        dirs.push(fullPath)
      }
    }
  }

  async function recursionFiles(path: string) {
    if (!path) return

    const dirs = [path]

    while (dirs.length) {
      const dir = dirs.pop()
      if (!dir) continue

      const dirEntry = await readDir(dir)

      for (const entry of dirEntry) {
        const fullPath = await resolve(dir, entry.name)
        if (entry.isDirectory) dirs.push(fullPath)
        if (!entry.isFile) continue
        filePaths.value.push(fullPath)
      }
    }
  }

  return {
    dirPath,
    showDirDialog,
    recursionDirs,
    recursionFiles,
    dirPaths,
    filePaths
  }
}
