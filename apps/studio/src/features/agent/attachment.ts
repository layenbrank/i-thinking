import type { useAui } from '@assistant-ui/react'

import { resolveWorkspacePicks } from '@/features/agent/workspace/paths.ts'

/** 系统选图与粘贴共用的类型过滤，和 client 的图片扩展名对齐 */
const IMAGE_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/svg+xml,image/avif,image/x-icon,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.ico,.avif'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif']

type ComposerAui = ReturnType<typeof useAui>

interface WorkspaceAttachResult {
  attached: number
  skipped: string[]
  isMissingWorkspace: boolean
}

/**
 * 把工作区内的相对路径加成 assistant-ui 的**附件**。
 *
 * 引用做成附件而不是往正文里塞文本：附件在输入区有可移除的 chip、会随消息一起落库、
 * 并且能精确派出「引用了哪些文件」，不用从自由文本里反解 `@xxx` 这种容易误判的标记。
 *
 * 正文不内联文件内容（`data: ''`）：Agent 用 fs_read 按需读取，路径本身就是引用。
 *
 * 放在组件文件之外是因为 `react-refresh/only-export-components`：
 * 组件文件里只该导出组件。
 */
async function attachWorkspaceFile(
  aui: ReturnType<typeof useAui>,
  relative: string
): Promise<void> {
  await aui.composer.addAttachment({
    type: 'file',
    name: relative,
    contentType: 'text/plain',
    content: [
      {
        type: 'file',
        filename: relative,
        mimeType: 'text/plain',
        data: ''
      }
    ]
  })
}

function isImageFile(file: { name: string; type: string }): boolean {
  if (file.type.toLowerCase().startsWith('image/')) return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return IMAGE_EXTENSIONS.includes(ext)
}

function readDataUrl(file: File): Promise<string> {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader()
    reader.onload = function () {
      resolve(typeof reader.result === 'string' ? reader.result : '')
    }
    reader.onerror = function () {
      reject(reader.error ?? new Error('读取图片失败'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 图片走真实 data URL，不走工作区路径引用。
 * 缩略图靠 assistant-ui 的 image part；模型能不能看见由发送前再决定。
 */
async function attachImage(aui: ComposerAui, file: File): Promise<void> {
  const data = await readDataUrl(file)
  if (!data.startsWith('data:')) throw new Error('读取图片失败')

  const mediaType = file.type || 'image/png'
  await aui.composer.addAttachment({
    type: 'image',
    name: file.name || 'image',
    contentType: mediaType,
    content: [
      {
        type: 'image',
        image: data,
        filename: file.name || 'image'
      }
    ]
  })
}

/** 一批系统对话框路径：只引用当前工作区根内的相对路径 */
async function attachWorkspacePaths(
  aui: ComposerAui,
  paths: readonly string[] | null,
  rootPath: string | null
): Promise<WorkspaceAttachResult> {
  if (!paths || paths.length === 0) {
    return { attached: 0, skipped: [], isMissingWorkspace: false }
  }
  if (!rootPath) {
    return { attached: 0, skipped: [], isMissingWorkspace: true }
  }

  const picks = resolveWorkspacePicks(paths, rootPath)
  for (const relative of picks.relatives) {
    await attachWorkspaceFile(aui, relative)
  }

  return {
    attached: picks.relatives.length,
    skipped: picks.skipped,
    isMissingWorkspace: false
  }
}

export { IMAGE_ACCEPT, attachImage, attachWorkspaceFile, attachWorkspacePaths, isImageFile }
export type { WorkspaceAttachResult }
