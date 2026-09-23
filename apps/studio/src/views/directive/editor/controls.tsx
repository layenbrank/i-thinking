import { Label } from '@i-thinking/design/components/label'
import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import type { ReactNode } from 'react'

/** 侧栏与步骤表单共用的紧凑控件高度 */
const CONTROL_CLASS = 'h-8 text-xs shadow-xs'

interface FieldProps {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}

interface SectionProps {
  icon: ReactNode
  title: string
  count?: number
  children: ReactNode
}

function Field(props: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', props.className)}>
      <Label className="w-full flex-col items-stretch gap-1.5 text-xs font-normal text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          {props.label}
          {props.required ? <span className="text-destructive">*</span> : null}
        </span>
        {props.children}
      </Label>
    </div>
  )
}

interface GlyphProps {
  icon: string
  className?: string
}

/** 离线 Iconify（mdi / ant-design 已在 renderer 注册） */
function Glyph(props: GlyphProps) {
  return (
    <Icon
      icon={props.icon}
      className={cn('size-3.5 shrink-0', props.className)}
    />
  )
}

function Section(props: SectionProps) {
  return (
    <section className="flex flex-col gap-2.5">
      <header className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground [&_svg]:size-3.5">
        {props.icon}
        <span>{props.title}</span>
        {props.count !== undefined ? (
          <span className="font-normal tabular-nums">({props.count})</span>
        ) : null}
      </header>
      {props.children}
    </section>
  )
}

export { CONTROL_CLASS, Field, Glyph, Section }
