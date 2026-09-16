import { useAui } from '@assistant-ui/react'
import { BookOpenIcon, ListTodoIcon, PuzzleIcon, SparklesIcon } from 'lucide-react'

import { useActiveWorkspace } from '@/features/agent/workspace/client.ts'

/**
 * 新会话欢迎页 —— 对齐 Qoder / client：只有标题与提示卡，不放「添加目录」主按钮。
 * 建工作区入口在左栏 `+`；输入框由 Thread 固定在底部。
 */

const SUGGESTIONS = [
  {
    icon: BookOpenIcon,
    title: '读懂这个仓库',
    prompt: '概览一下当前工作区：主要模块、技术栈，以及程序的入口文件在哪。'
  },
  {
    icon: PuzzleIcon,
    title: '解释目录结构',
    prompt: '解释一下当前工作区的目录结构，每个顶层目录各自负责什么。'
  },
  {
    icon: ListTodoIcon,
    title: '收拢待办',
    prompt: '在当前工作区里找出所有 TODO 注释，按所在模块归类列出来。'
  }
]

export function ThreadWelcome() {
  const aui = useAui()
  const activeWorkspace = useActiveWorkspace()

  function handleSuggestion(prompt: string) {
    aui.composer.setText(prompt)
    aui.composer.send()
  }

  return (
    <div className="mb-2 flex w-full flex-col items-center gap-6 px-2 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="bg-primary/10 text-primary inline-flex size-12 items-center justify-center rounded-lg">
          <SparklesIcon className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-foreground text-2xl leading-[1.35] font-semibold tracking-[-0.01em]">
            有什么可以帮你的？
          </h1>
          {activeWorkspace ? (
            <p className="text-muted-foreground text-sm leading-[1.65]">
              当前工作区{' '}
              <span className="text-foreground font-medium">{activeWorkspace.title}</span>
            </p>
          ) : (
            <p className="text-muted-foreground max-w-[36em] text-sm leading-[1.65] text-balance">
              在左栏添加工作区后，Agent 才能读写代码；不选也能先聊聊。
            </p>
          )}
        </div>
      </div>

      {activeWorkspace ? (
        <div className="flex w-full max-w-[880px] flex-col items-stretch gap-2.5 text-start">
          <p className="text-muted-foreground text-[13px] font-medium tracking-[0.02em]">
            可以试试
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SUGGESTIONS.map(function (item) {
              const Icon = item.icon

              return (
                <button
                  key={item.title}
                  type="button"
                  className="border-border bg-background hover:border-primary/40 hover:bg-primary/5 flex flex-col items-start gap-2.5 rounded-lg border p-3.5 text-start transition-[border-color,background-color,transform] duration-150 hover:-translate-y-px"
                  onClick={function () {
                    handleSuggestion(item.prompt)
                  }}>
                  <span className="bg-muted text-muted-foreground inline-flex size-7 items-center justify-center rounded-md">
                    <Icon className="size-3.5" />
                  </span>
                  <span className="text-foreground line-clamp-2 text-sm font-medium">
                    {item.title}
                  </span>
                  <span className="text-muted-foreground line-clamp-2 text-xs leading-snug">
                    {item.prompt}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
