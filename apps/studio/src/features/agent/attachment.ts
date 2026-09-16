import type { useAui } from '@assistant-ui/react'

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

export { attachWorkspaceFile }
