import { useAui } from '@assistant-ui/react'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { attachImage, attachWorkspacePaths, isImageFile } from '@/features/agent/attachment.ts'
import { useActiveWorkspace } from '@/features/agent/workspace/client.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

function isComposerTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[data-slot="aui_composer-shell"]'))
}

function findDroppedPath(file: File): string {
  try {
    return itc.pathOf(file)
  } catch (error) {
    console.warn('[composer] 读不到拖放文件的路径', error)
    return ''
  }
}

/**
 * 粘贴图片、拖放文件。
 *
 * 库的拖放区在没有 AttachmentAdapter 时会丢掉文件。这里在捕获阶段接住，
 * 图片写成 image 附件，其它文件只在工作区内才变成路径引用。
 */
export function ComposerInbound() {
  const aui = useAui()
  const workspace = useActiveWorkspace()
  const rootPath = workspace?.primaryPath ?? null

  useEffect(
    function () {
      function onPaste(event: ClipboardEvent) {
        if (!isComposerTarget(event.target)) return
        const files = Array.from(event.clipboardData?.files ?? []).filter(isImageFile)
        if (files.length === 0) return

        event.preventDefault()
        event.stopPropagation()
        void Promise.all(
          files.map(function (file) {
            return attachImage(aui, file)
          })
        ).catch(function (error: unknown) {
          toast.error(toIpcMessage(error, '粘贴图片失败'))
        })
      }

      function onDragOver(event: DragEvent) {
        if (!isComposerTarget(event.target)) return
        if (!event.dataTransfer?.types.includes('Files')) return
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = 'copy'
      }

      async function acceptDrop(files: File[]) {
        const images: File[] = []
        const paths: string[] = []
        const unknown: string[] = []

        for (const file of files) {
          if (isImageFile(file)) {
            images.push(file)
            continue
          }
          const path = findDroppedPath(file)
          if (!path) unknown.push(file.name || '文件')
          else paths.push(path)
        }

        for (const file of images) {
          await attachImage(aui, file)
        }
        if (paths.length > 0) {
          const result = await attachWorkspacePaths(aui, paths, rootPath)
          if (result.isMissingWorkspace) toast.error('先在左栏添加一个工作区')
          else if (result.attached > 0) toast.success(`已引用 ${result.attached} 项`)
          if (result.skipped.length > 0) {
            toast.warning(`${result.skipped.join('、')} 不在当前工作区内，已跳过`)
          }
        }
        if (unknown.length > 0) {
          toast.warning(`${unknown.join('、')} 无法确认是否在工作区内，已跳过`)
        }
      }

      function onDrop(event: DragEvent) {
        if (!isComposerTarget(event.target)) return
        const files = Array.from(event.dataTransfer?.files ?? [])
        if (files.length === 0) return

        event.preventDefault()
        event.stopPropagation()
        void acceptDrop(files).catch(function (error: unknown) {
          toast.error(toIpcMessage(error, '添加附件失败'))
        })
      }

      window.addEventListener('paste', onPaste, true)
      window.addEventListener('dragover', onDragOver, true)
      window.addEventListener('drop', onDrop, true)
      return function () {
        window.removeEventListener('paste', onPaste, true)
        window.removeEventListener('dragover', onDragOver, true)
        window.removeEventListener('drop', onDrop, true)
      }
    },
    [aui, rootPath]
  )

  return null
}
