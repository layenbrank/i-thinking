import { TooltipProvider } from '@i-thinking/design/components/tooltip'

import { ComposerContextMenu } from '@/views/agent/chat/components/composer-context-menu.tsx'

/**
 * 输入区左下角入口：`+` 双栏添加上下文（工作区 / 技能）。
 *
 * `@` / `/` 改由键入触发（`ComposerTriggers`），不再挂独立按钮。
 * `ComposerAttach: null` 关掉库自带选文件按钮，避免双 `+`。
 */
export function ComposerActions() {
  return (
    <TooltipProvider>
      <ComposerContextMenu />
    </TooltipProvider>
  )
}
