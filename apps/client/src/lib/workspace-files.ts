/**
 * 工作区文件 IPC：按层列举 + 封顶搜索 + 受 roots 约束的读文件
 */
import { invoke } from '@tauri-apps/api/core'

interface DirEntry {
  name: string
  kind: 'file' | 'dir' | string
  path: string
  relative: string
}

interface SearchHit {
  name: string
  relative: string
  path: string
}

interface ReadFileResult {
  path: string
  content: string
}

async function listDir(root: string, relative = '') {
  return invoke<DirEntry[]>('workspaceFiles:listDir', {
    params: { root, relative: relative || null }
  })
}

async function search(roots: string[], query: string, limit = 50) {
  return invoke<SearchHit[]>('workspaceFiles:search', {
    params: { roots, query, limit }
  })
}

async function readFile(roots: string[], path: string) {
  return invoke<ReadFileResult>('workspaceFiles:readFile', {
    params: { roots, path }
  })
}

const WorkspaceFiles = {
  listDir,
  search,
  readFile
}

export { WorkspaceFiles }
export type { DirEntry, ReadFileResult, SearchHit }
