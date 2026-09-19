import { useAui } from '@assistant-ui/react'
import { Button } from '@i-thinking/design/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@i-thinking/design/components/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { FileIcon, FolderIcon, ImageIcon, PaperclipIcon } from 'lucide-react'
import { toast } from 'sonner'

import {
  IMAGE_ACCEPT,
  attachImage,
  attachWorkspacePaths,
  isImageFile
} from '@/features/agent/attachment.ts'
import { useActiveWorkspace } from '@/features/agent/workspace/client.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

/**
 * 输入区左下角的回形针：图片、工作区文件、工作区文件夹。
 * 和 `+` 分开——`+` 只加上下文（工作区浏览 / 技能），这里只加附件。
 */
export function ComposerClip() {
  const aui = useAui()
  const workspace = useActiveWorkspace()
  const rootPath = workspace?.primaryPath ?? null

  function reportPaths(result: Awaited<ReturnType<typeof attachWorkspacePaths>>) {
    if (result.isMissingWorkspace) {
      toast.error('先在左栏添加一个工作区')
      return
    }
    if (result.attached > 0) toast.success(`已引用 ${result.attached} 项`)
    if (result.skipped.length > 0) {
      toast.warning(`${result.skipped.join('、')} 不在当前工作区内，已跳过`)
    }
  }

  function handlePickImages() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = IMAGE_ACCEPT
    input.multiple = true
    input.onchange = function () {
      const files = Array.from(input.files ?? []).filter(isImageFile)
      void Promise.all(
        files.map(function (file) {
          return attachImage(aui, file)
        })
      ).catch(function (error: unknown) {
        toast.error(toIpcMessage(error, '添加图片失败'))
      })
    }
    input.click()
  }

  function handlePickFiles() {
    void itc.dialog
      .open({ multiple: true })
      .then(function (paths) {
        return attachWorkspacePaths(aui, paths, rootPath)
      })
      .then(reportPaths)
      .catch(function (error: unknown) {
        toast.error(toIpcMessage(error, '选择文件失败'))
      })
  }

  function handlePickFolders() {
    void itc.dialog
      .open({ directory: true, multiple: true })
      .then(function (paths) {
        return attachWorkspacePaths(aui, paths, rootPath)
      })
      .then(reportPaths)
      .catch(function (error: unknown) {
        toast.error(toIpcMessage(error, '选择文件夹失败'))
      })
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="添加附件"
              className="text-muted-foreground hover:text-foreground size-7 rounded-md">
              <PaperclipIcon />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">添加图片、文件或文件夹</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="start"
        className="w-44">
        <DropdownMenuItem onSelect={handlePickImages}>
          <ImageIcon />
          添加图片
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handlePickFiles}>
          <FileIcon />
          添加文件
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handlePickFolders}>
          <FolderIcon />
          添加文件夹
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
