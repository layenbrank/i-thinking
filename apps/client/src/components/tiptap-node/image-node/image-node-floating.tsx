import type { Editor } from '@tiptap/react'

// --- Hooks ---
import { useTiptapEditor } from '@/hooks/use-tiptap-editor'

// --- Lib ---
import { isNodeTypeSelected } from '@/lib/tiptap-utils'

// --- Tiptap UI ---
import { DeleteNodeButton } from '@/components/tiptap-ui/delete-node-button/delete-node-button.tsx'
import { ImageDownloadButton } from '@/components/tiptap-ui/image-download-button/image-download-button.tsx'
import { ImageAlignButton } from '@/components/tiptap-ui/image-align-button/image-align-button.tsx'

// --- UI Primitive ---
import { Separator } from '@/components/tiptap-ui-primitive/separator/separator.tsx'
import { ImageCaptionButton } from '@/components/tiptap-ui/image-caption-button/image-caption-button.tsx'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button/image-upload-button.tsx'
import { RefreshCcwIcon } from '@/components/tiptap-icons/refresh-ccw-icon'

export function ImageNodeFloating({
  editor: providedEditor
}: {
  editor?: Editor | null
}) {
  const { editor } = useTiptapEditor(providedEditor)
  const visible = isNodeTypeSelected(editor, ['image'])

  if (!editor || !visible) {
    return null
  }

  return (
    <>
      <ImageAlignButton align="left" />
      <ImageAlignButton align="center" />
      <ImageAlignButton align="right" />
      <Separator />
      <ImageCaptionButton />
      <Separator />
      <ImageDownloadButton />
      <ImageUploadButton
        icon={RefreshCcwIcon}
        tooltip="Replace"
      />
      <Separator />
      <DeleteNodeButton />
    </>
  )
}
