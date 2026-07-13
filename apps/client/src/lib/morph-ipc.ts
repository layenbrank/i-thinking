import { ipcInvoke, parseData, parsePath } from '@/lib/ipc'

async function meta(path: string): Promise<Morph.PdfMeta> {
  const resp = await ipcInvoke('morph', { Meta: { path } })
  return parseData<Morph.PdfMeta>(resp)
}

async function renderPage(
  path: string,
  page_index: number,
  scale: number
): Promise<Morph.PageImage> {
  const resp = await ipcInvoke('morph', { RenderPage: { path, page_index, scale } })
  return parseData<Morph.PageImage>(resp)
}

async function renderThumbnails(path: string, scale: number): Promise<Morph.PageImage[]> {
  const resp = await ipcInvoke('morph', { RenderThumbnails: { path, scale } })
  return parseData<Morph.PageImage[]>(resp)
}

async function search(path: string, query: string): Promise<Morph.SearchMatch[]> {
  const resp = await ipcInvoke('morph', { Search: { path, query } })
  return parseData<Morph.SearchMatch[]>(resp)
}

async function exportPdf(src: string, dest: string): Promise<string> {
  const resp = await ipcInvoke('morph', { Export: { src, dest } })
  return parsePath(resp)
}

async function merge(paths: string[], dest: string): Promise<string> {
  const resp = await ipcInvoke('morph', { Merge: { paths, dest } })
  return parsePath(resp)
}

async function split(path: string, ranges: string[], dest_dir: string): Promise<string[]> {
  const resp = await ipcInvoke('morph', { Split: { path, ranges, dest_dir } })
  return parseData<string[]>(resp)
}

async function splitByCount(
  path: string,
  pages_per_file: number,
  dest_dir: string
): Promise<string[]> {
  const resp = await ipcInvoke('morph', { SplitByCount: { path, pages_per_file, dest_dir } })
  return parseData<string[]>(resp)
}

async function toImages(
  path: string,
  scale: number,
  format: string,
  dest_dir: string
): Promise<string[]> {
  const resp = await ipcInvoke('morph', { ToImages: { path, scale, format, dest_dir } })
  return parseData<string[]>(resp)
}

async function toOffice(path: string, format: string, dest_dir: string): Promise<string> {
  const resp = await ipcInvoke('morph', { ToOffice: { path, format, dest_dir } })
  return parsePath(resp)
}

export const MorphIpc = {
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
