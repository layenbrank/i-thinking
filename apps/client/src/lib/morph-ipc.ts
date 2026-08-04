/**
 * Morph（PDF）领域 IPC
 * action 为 CLI 子命令（kebab-case），与 engine-ipc 一致
 */
import { ipcInvoke, parseData, parsePath } from '@/lib/ipc'

async function meta(path: string): Promise<Morph.PdfMeta> {
  const resp = await ipcInvoke('morph', { path }, 'meta')
  return parseData<Morph.PdfMeta>(resp)
}

async function renderPage(
  path: string,
  page_index: number,
  scale: number
): Promise<Morph.PageImage> {
  const resp = await ipcInvoke('morph', { path, page_index, scale }, 'render-page')
  return parseData<Morph.PageImage>(resp)
}

async function renderThumbnails(path: string, scale: number): Promise<Morph.PageImage[]> {
  const resp = await ipcInvoke('morph', { path, scale }, 'render-thumbnails')
  return parseData<Morph.PageImage[]>(resp)
}

async function search(path: string, query: string): Promise<Morph.SearchMatch[]> {
  const resp = await ipcInvoke('morph', { path, query }, 'search')
  return parseData<Morph.SearchMatch[]>(resp)
}

async function exportPdf(src: string, dest: string): Promise<string> {
  const resp = await ipcInvoke('morph', { src, dest }, 'export')
  return parsePath(resp)
}

async function merge(paths: string[], dest: string): Promise<string> {
  const resp = await ipcInvoke('morph', { paths, dest }, 'merge')
  return parsePath(resp)
}

async function split(path: string, ranges: string[], dest_dir: string): Promise<string[]> {
  const resp = await ipcInvoke('morph', { path, ranges, dest_dir }, 'split')
  return parseData<string[]>(resp)
}

async function splitByCount(
  path: string,
  pages_per_file: number,
  dest_dir: string
): Promise<string[]> {
  const resp = await ipcInvoke('morph', { path, pages_per_file, dest_dir }, 'split-by-count')
  return parseData<string[]>(resp)
}

async function toImages(
  path: string,
  scale: number,
  format: string,
  dest_dir: string
): Promise<string[]> {
  const resp = await ipcInvoke('morph', { path, scale, format, dest_dir }, 'to-images')
  return parseData<string[]>(resp)
}

async function toOffice(path: string, format: string, dest_dir: string): Promise<string> {
  const resp = await ipcInvoke('morph', { path, format, dest_dir }, 'to-office')
  return parsePath(resp)
}

const MorphIpc = {
  meta,
  renderPage,
  renderThumbnails,
  search,
  export: exportPdf,
  merge,
  split,
  splitByCount,
  toImages,
  toOffice
}

export { MorphIpc }
