import type { ReactNode } from 'react'

/**
 * 设置页的排版基元：分组卡片 + 「左边说明、右边控件」的行。
 *
 * 抽出来是因为设置页会长出很多行，而每一行的排版（标签、说明、控件的对齐）
 * 必须完全一致；各写各的迟早会歪。
 */

export function SettingsSection(props: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-medium">{props.title}</h2>
        {props.hint ? <p className="text-muted-foreground text-xs">{props.hint}</p> : null}
      </div>
      <div className="border-border divide-border flex flex-col divide-y rounded-lg border px-3">
        {props.children}
      </div>
    </section>
  )
}

export function SettingRow(props: { label: string; hint?: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm">{props.label}</span>
        {props.hint ? (
          <span className="text-muted-foreground text-xs leading-relaxed">{props.hint}</span>
        ) : null}
      </div>
      <div className="shrink-0">{props.control}</div>
    </div>
  )
}
