import { cn } from 'cn'
import type { ReactNode } from 'react'

const SECTION = 'rounded-xl border border-border bg-card p-4'
const SECTION_TITLE =
  'mb-3 border-b border-border/60 pb-2 text-sm font-semibold text-foreground select-none'

interface SettingsSectionProps {
  title: string
  children: ReactNode
  className?: string
}

/** 设置分组卡：标题 + 分隔线 + 内容 */
function SettingsSection(props: SettingsSectionProps) {
  return (
    <section className={cn(SECTION, props.className)}>
      <h3 className={SECTION_TITLE}>{props.title}</h3>
      {props.children}
    </section>
  )
}

interface SettingsRowProps {
  label: string
  /** 控件下方的补充说明（长文案另起一行，不挤控件） */
  hint?: string
  children: ReactNode
}

/** 设置项：固定宽标签 + 控件（+ 说明） */
function SettingsRow(props: SettingsRowProps) {
  return (
    <div className="flex items-start gap-4 py-2">
      <span className="mt-1.5 w-20 shrink-0 text-sm text-muted-foreground">{props.label}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">{props.children}</div>
        {props.hint ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{props.hint}</p>
        ) : null}
      </div>
    </div>
  )
}

export { SettingsRow, SettingsSection }
export type { SettingsRowProps, SettingsSectionProps }
