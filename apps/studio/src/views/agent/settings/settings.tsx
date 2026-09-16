import { Button } from '@i-thinking/design/components/button'
import { Input } from '@i-thinking/design/components/input'
import {
  ChevronLeftIcon,
  KeyboardIcon,
  SearchIcon,
  Settings2Icon,
  SparklesIcon
} from 'lucide-react'
import { useMemo, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'

import AgentUtility from '@/views/agent/components/utility.tsx'
import { GeneralSection } from '@/views/agent/settings/sections/general.tsx'
import { ModelSection } from '@/views/agent/settings/sections/model.tsx'
import { ShortcutsSection } from '@/views/agent/settings/sections/shortcuts.tsx'

/**
 * 设置页（`/agent/settings`）：左导航 + 右内容，顶部「返回应用」。
 * 只放真有消费者的分组，不做截图里的假入口。
 */

interface SettingsItem {
  id: string
  label: string
  icon: ComponentType<{ className?: string }>
  section: ComponentType
}

interface SettingsGroup {
  label: string
  items: SettingsItem[]
}

const GROUPS: SettingsGroup[] = [
  {
    label: '个人',
    items: [
      { id: 'general', label: '常规', icon: Settings2Icon, section: GeneralSection },
      { id: 'shortcuts', label: '快捷键', icon: KeyboardIcon, section: ShortcutsSection },
      { id: 'model', label: '模型', icon: SparklesIcon, section: ModelSection }
    ]
  }
]

export default function Settings() {
  const navigate = useNavigate()
  const [query, updateQuery] = useState('')
  const [activeID, updateActiveID] = useState('general')

  const keyword = query.trim().toLowerCase()
  const visibleGroups = useMemo(
    function () {
      if (!keyword) return GROUPS

      return GROUPS.map(function (group) {
        return {
          label: group.label,
          items: group.items.filter(function (item) {
            return item.label.toLowerCase().includes(keyword)
          })
        }
      }).filter(function (group) {
        return group.items.length > 0
      })
    },
    [keyword]
  )

  const active =
    GROUPS.flatMap(function (group) {
      return group.items
    }).find(function (item) {
      return item.id === activeID
    }) ?? GROUPS[0].items[0]
  const ActiveSection = active.section

  return (
    <div className="bg-background text-foreground flex h-full w-full flex-col">
      <AgentUtility />

      <div className="border-border flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={function () {
            void navigate('/agent/chat')
          }}>
          <ChevronLeftIcon />
          返回应用
        </Button>
        <span className="text-sm font-medium">设置</span>
      </div>

      <div className="bg-muted/30 flex min-h-0 flex-1 gap-0 p-3">
        <nav className="bg-background border-border flex w-56 shrink-0 flex-col gap-3 rounded-xl border p-2">
          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              placeholder="搜索设置…"
              aria-label="搜索设置"
              className="h-8 ps-8 text-xs"
              onChange={function (event) {
                updateQuery(event.target.value)
              }}
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {visibleGroups.map(function (group) {
              return (
                <div
                  key={group.label}
                  className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground px-2 pb-0.5 text-xs font-medium">
                    {group.label}
                  </span>
                  {group.items.map(function (item) {
                    const isActive = item.id === active.id
                    const Icon = item.icon

                    return (
                      <Button
                        key={item.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        data-active={isActive ? 'true' : 'false'}
                        className={
                          isActive
                            ? 'bg-muted text-foreground w-full justify-start'
                            : 'text-muted-foreground hover:text-foreground w-full justify-start'
                        }
                        onClick={function () {
                          updateActiveID(item.id)
                        }}>
                        <Icon className="size-4" />
                        {item.label}
                      </Button>
                    )
                  })}
                </div>
              )
            })}

            {visibleGroups.length === 0 ? (
              <p className="text-muted-foreground px-2 text-xs">没有匹配的设置项</p>
            ) : null}
          </div>
        </nav>

        <div className="bg-background border-border min-h-0 flex-1 overflow-y-auto rounded-xl border p-6 ms-3">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <ActiveSection />
          </div>
        </div>
      </div>
    </div>
  )
}
