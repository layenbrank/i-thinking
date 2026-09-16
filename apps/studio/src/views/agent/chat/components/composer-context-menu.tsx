import { useAui } from '@assistant-ui/react'
import { Button } from '@i-thinking/design/components/button'
import { Input } from '@i-thinking/design/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@i-thinking/design/components/popover'
import { ScrollArea } from '@i-thinking/design/components/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderTreeIcon,
  Loader2Icon,
  PlusIcon,
  TargetIcon,
  PuzzleIcon,
  WrenchIcon,
  ListTodoIcon
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { toast } from 'sonner'

import { useActiveWorkspace, useActiveWorkspaceID } from '@/features/agent/workspace/client.ts'
import { attachWorkspaceFile } from '@/features/agent/attachment.ts'
import { resolveWorkspacePicks } from '@/features/agent/workspace/paths.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'
import { WorkspaceFilePicker } from '@/views/agent/chat/components/workspace-file-picker.tsx'

/**
 * 输入区左下角的 `+`：双栏 AttachMenu（对齐 client / Qoder）。
 *
 * 左栏分类；右栏 files 浏览/搜索或 skills 列表。目标 / 计划 / 插件暂未实现，
 * 禁用并 toast「即将推出」。系统选文件/夹放在 files 面板底部。
 */

type AttachCategory = 'goal' | 'plan' | 'files' | 'plugins' | 'skills'

interface CategoryItem {
  key: AttachCategory
  label: string
  icon: ComponentType<{ className?: string }>
  enabled: boolean
}

const CATEGORIES: readonly CategoryItem[] = [
  { key: 'goal', label: '目标', icon: TargetIcon, enabled: false },
  { key: 'plan', label: '计划', icon: ListTodoIcon, enabled: false },
  { key: 'files', label: '工作区', icon: FolderTreeIcon, enabled: true },
  { key: 'plugins', label: '插件', icon: PuzzleIcon, enabled: false },
  { key: 'skills', label: '技能', icon: WrenchIcon, enabled: true }
]

function SkillsPane(props: {
  active: boolean
  workspaceID: string | null
  onPick: (relative: string) => void
}) {
  const [query, updateQuery] = useState('')
  const skillsQuery = useQuery({
    queryKey: ['workspace', 'listSkills', props.workspaceID],
    queryFn: function () {
      return itc.workspace.listSkills({ workspaceID: props.workspaceID as string })
    },
    enabled: props.active && Boolean(props.workspaceID)
  })

  const needle = query.trim().toLowerCase()
  const skills = skillsQuery.data ?? []
  const filtered =
    needle.length === 0
      ? skills
      : skills.filter(function (skill) {
          return (
            skill.name.toLowerCase().includes(needle) ||
            skill.description.toLowerCase().includes(needle)
          )
        })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b p-2">
        <Input
          autoFocus
          value={query}
          placeholder="搜索技能"
          aria-label="搜索技能"
          className="h-7 text-xs"
          onChange={function (event) {
            updateQuery(event.target.value)
          }}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1 p-1.5">
        {skillsQuery.isFetching ? (
          <p className="text-muted-foreground flex items-center gap-1.5 p-2.5 text-xs">
            <Loader2Icon className="size-3.5 animate-spin" />
            读取中…
          </p>
        ) : null}
        {!skillsQuery.isFetching
          ? filtered.map(function (skill) {
              return (
                <Button
                  key={skill.id}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs font-normal"
                  onClick={function () {
                    props.onPick(skill.relative)
                  }}>
                  <WrenchIcon className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                    <span className="w-full truncate text-start">{skill.name}</span>
                    {skill.description ? (
                      <span className="text-muted-foreground w-full truncate text-start text-[11px]">
                        {skill.description}
                      </span>
                    ) : null}
                  </span>
                </Button>
              )
            })
          : null}
        {!skillsQuery.isFetching && filtered.length === 0 ? (
          <p className="text-muted-foreground p-2.5 text-xs">
            {props.workspaceID ? '当前工作区暂无技能' : '先在左栏添加工作区'}
          </p>
        ) : null}
      </ScrollArea>
    </div>
  )
}

export function ComposerContextMenu() {
  const aui = useAui()
  const activeWorkspace = useActiveWorkspace()
  const workspaceID = useActiveWorkspaceID()
  const [isOpen, updateOpen] = useState(false)
  const [category, updateCategory] = useState<AttachCategory>('files')

  function handleOpenChange(next: boolean) {
    updateOpen(next)
    if (next) updateCategory('files')
  }

  async function attachPaths(paths: string[] | null) {
    if (!paths || paths.length === 0) return

    if (!activeWorkspace?.primaryPath) {
      toast.error('先在左栏添加一个工作区')
      return
    }

    const picks = resolveWorkspacePicks(paths, activeWorkspace.primaryPath)

    try {
      for (const relative of picks.relatives) {
        await attachWorkspaceFile(aui, relative)
      }
    } catch (error) {
      toast.error(toIpcMessage(error, '添加附件失败'))
      return
    }

    if (picks.relatives.length > 0) {
      toast.success(`已引用 ${picks.relatives.length} 项`)
    }
    if (picks.skipped.length > 0) {
      toast.warning(`${picks.skipped.join('、')} 不在当前工作区内，已跳过`)
    }

    updateOpen(false)
  }

  function handlePickRelative(relative: string) {
    void attachWorkspaceFile(aui, relative)
      .then(function () {
        updateOpen(false)
      })
      .catch(function (error: unknown) {
        toast.error(toIpcMessage(error, '引用失败'))
      })
  }

  function handlePickOsFiles() {
    void itc.dialog
      .open({ multiple: true })
      .then(attachPaths)
      .catch(function (error: unknown) {
        toast.error(toIpcMessage(error, '选择文件失败'))
      })
  }

  function handlePickOsFolders() {
    void itc.dialog
      .open({ directory: true, multiple: true })
      .then(attachPaths)
      .catch(function (error: unknown) {
        toast.error(toIpcMessage(error, '选择文件夹失败'))
      })
  }

  return (
    <Popover
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="添加上下文"
              className="text-muted-foreground hover:text-foreground size-7 rounded-md">
              <PlusIcon />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">添加上下文：工作区文件、技能</TooltipContent>
      </Tooltip>

      <PopoverContent
        align="start"
        className="w-auto overflow-hidden p-0 shadow-lg">
        <div className="flex h-75 max-w-[min(520px,calc(100vw-40px))]">
          <div className="border-border/60 bg-muted/30 flex w-33 shrink-0 flex-col gap-0.5 border-r p-1.5">
            {CATEGORIES.map(function (item) {
              const Icon = item.icon
              const isActive = category === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={!item.enabled}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-xs transition-colors',
                    item.enabled
                      ? 'hover:bg-muted text-foreground cursor-pointer'
                      : 'text-muted-foreground cursor-not-allowed opacity-40',
                    isActive && item.enabled && 'bg-muted font-medium'
                  )}
                  onClick={function () {
                    if (!item.enabled) {
                      toast.info('即将推出')
                      return
                    }
                    updateCategory(item.key)
                  }}>
                  <Icon className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.key === 'files' || item.key === 'skills' ? (
                    <ChevronRightIcon className="text-muted-foreground size-3.5 shrink-0" />
                  ) : null}
                </button>
              )
            })}
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            {category === 'files' ? (
              <>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <WorkspaceFilePicker
                    active={isOpen && category === 'files'}
                    className="flex h-full min-h-0 flex-col"
                    listClassName="max-h-none flex-1"
                    onPick={handlePickRelative}
                  />
                </div>
                <div className="border-border/60 flex shrink-0 gap-1 border-t p-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 flex-1 justify-start gap-1.5 px-2 text-xs font-normal"
                    onClick={handlePickOsFiles}>
                    <FileIcon className="size-3.5" />
                    本地文件
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 flex-1 justify-start gap-1.5 px-2 text-xs font-normal"
                    onClick={handlePickOsFolders}>
                    <FolderIcon className="size-3.5" />
                    本地文件夹
                  </Button>
                </div>
              </>
            ) : null}

            {category === 'skills' ? (
              <SkillsPane
                active={isOpen && category === 'skills'}
                workspaceID={workspaceID}
                onPick={handlePickRelative}
              />
            ) : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
