import { Label } from '@i-thinking/design/components/label'
import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import type { ReactNode } from 'react'

/** 侧栏与步骤表单共用的紧凑控件高度 */
const CONTROL_CLASS = 'h-8 rounded-lg text-xs shadow-xs'

/** 步骤卡片外壳：与指令墙白卡同一套圆角 / 轻阴影 */
const STEP_CARD_CLASS =
  'gap-3 rounded-2xl border-border/70 py-3 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-border hover:shadow-sm'

/** 侧栏内嵌条目（输入声明 / 变量 / 触发器） */
const ITEM_CARD_CLASS =
  'flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-2.5'

interface FieldProps {
  label: string
  required?: boolean
  children: ReactNode
  className?: string
}

interface SectionProps {
  icon: ReactNode
  title: string
  /** 标题旁补充说明，不挤进标题本身 */
  hint?: string
  count?: number
  /** 标题色块；不传则用中性灰 */
  tileClass?: string
  children: ReactNode
}

function Field(props: FieldProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', props.className)}>
      <Label className="flex w-full flex-col items-stretch gap-1 text-[11px] font-medium tracking-wide text-muted-foreground">
        <span className="inline-flex h-4 items-center gap-0.5 leading-none">
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

/** 离线 Iconify（mdi / ant-design / lucide 已在 renderer 注册） */
function Glyph(props: GlyphProps) {
  return (
    <Icon
      icon={props.icon}
      className={cn('size-3.5 shrink-0', props.className)}
    />
  )
}

/**
 * 元信息分区：白卡浮在浅底上（对齐快捷指令「分组块」），标题用色块图标扫一眼认区。
 */
function Section(props: SectionProps) {
  return (
    <section className="flex flex-col rounded-2xl border border-border/60 bg-card shadow-xs">
      <header className="flex items-center gap-2 border-b border-border/40 px-3.5 py-2.5">
        <span
          className={cn(
            'inline-flex size-7 shrink-0 items-center justify-center rounded-lg [&_svg]:size-3.5',
            props.tileClass ?? 'bg-muted text-muted-foreground'
          )}>
          {props.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {props.title}
            </span>
            {props.count !== undefined ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                {props.count}
              </span>
            ) : null}
          </div>
          {props.hint ? (
            <p className="mt-0.5 truncate text-[11px] leading-none text-muted-foreground">
              {props.hint}
            </p>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-2.5 px-3.5 py-3">{props.children}</div>
    </section>
  )
}

export { CONTROL_CLASS, Field, Glyph, ITEM_CARD_CLASS, Section, STEP_CARD_CLASS }
